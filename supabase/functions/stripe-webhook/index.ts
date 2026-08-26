import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Create Supabase client with service role for admin operations
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function logWebhookEvent(eventId: string, eventType: string, status: string, payload?: any, errorMessage?: string) {
  try {
    const { error } = await supabase
      .from("stripe_webhook_logs")
      .upsert({
        event_id: eventId,
        event_type: eventType,
        status,
        payload,
        error_message: errorMessage,
        processed_at: status === "processed" || status === "failed" ? new Date().toISOString() : null,
      }, { onConflict: "event_id" });
    
    if (error) console.error("[WEBHOOK] Failed to log event:", error);
  } catch (e) {
    console.error("[WEBHOOK] Error logging event:", e);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const checkoutType = session.metadata?.type;
  
  if (!userId) {
    throw new Error("No user_id found in session");
  }

  console.log(`[WEBHOOK] Processing checkout for user ${userId}, type: ${checkoutType}`);

  // Handle course purchase
  if (checkoutType === "course_purchase") {
    type CartMetaItem = {
      course_id: string;
      offering_id: string;
      offering_type: string;
      participants_count: number;
      regulated_certification: boolean;
    };

    let cartItems: CartMetaItem[] = [];

    if (session.metadata?.cart_v === "2") {
      const chunkCount = Number(session.metadata?.cart_chunks || 0);
      let compact = "";
      for (let i = 0; i < chunkCount; i++) {
        compact += session.metadata?.[`cart_${i}`] || "";
      }
      cartItems = compact
        .split(";")
        .filter(Boolean)
        .map((row) => {
          const [course_id, offering_id, offering_type, participants, regulated] = row.split("|");
          return {
            course_id,
            offering_id,
            offering_type,
            participants_count: Number(participants) || 1,
            regulated_certification: regulated === "1",
          };
        });
    } else if (session.metadata?.cart_items) {
      cartItems = JSON.parse(session.metadata.cart_items) as CartMetaItem[];
    }

    if (cartItems.length > 0) {


      console.log(`[WEBHOOK] Processing ${cartItems.length} course purchases`);

      // Fulfilment goes through fulfil_purchase, never a bare enrollments
      // insert. Access is gated on can_access_course, which asks for a licence
      // seat — an enrolment with no seat behind it would be a row the learner
      // cannot actually use, and would quietly bypass the paywall for anyone
      // who reached this code path.
      //
      // fulfil_purchase is idempotent on the payment reference, so a Stripe
      // retry re-uses the same licence rather than minting a second one.
      for (const item of cartItems) {
        // One reference per course in the session keeps each purchase's
        // idempotency independent within a multi-course checkout.
        const paymentRef = `${session.id}:${item.course_id}`;

        // Price is read from the offering server-side. Session metadata is
        // client-supplied and must never decide what the ledger records.
        let amountGbp = 0;
        if (item.offering_id) {
          const { data: offering } = await supabase
            .from("course_offerings")
            .select("base_price_gbp")
            .eq("id", item.offering_id)
            .maybeSingle();
          amountGbp = Number(offering?.base_price_gbp ?? 0);
        }

        // A group offering is bought for a room of people; its participant count
        // becomes the seat count the buyer then allocates.
        const seats =
          typeof item.participants_count === "number" && item.participants_count > 1
            ? item.participants_count
            : 1;

        const { data: licenceId, error: fulfilError } = await supabase.rpc("fulfil_purchase", {
          _user: userId,
          _course: item.course_id,
          _offering: item.offering_id ?? null,
          _amount_gbp: amountGbp,
          _payment_ref: paymentRef,
          _seats: seats,
        });

        if (fulfilError) {
          // Logged, not swallowed: Stripe will retry the event, and the
          // idempotency check means a retry is safe.
          console.error(`[WEBHOOK] fulfil_purchase failed for course ${item.course_id}:`, fulfilError);
          throw fulfilError;
        }
        console.log(`[WEBHOOK] Fulfilled course ${item.course_id} -> licence ${licenceId}`);
      }

      // Clear user's cart
      const { error: cartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (cartError) {
        console.error("[WEBHOOK] Failed to clear cart:", cartError);
      }
    }
  }

  // Create or update order
  const { error: orderError } = await supabase
    .from("orders")
    .upsert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_customer_id: session.customer as string,
      status: "completed",
      amount_total: session.amount_total || 0,
      currency: session.currency || "gbp",
      plan: session.metadata?.plan_id || null,
      metadata: { 
        plan_name: session.metadata?.plan_name,
        subscription_id: session.subscription,
        type: checkoutType,
        cart_items: session.metadata?.cart_items ?? null,
      },
    }, { onConflict: "stripe_session_id" });

  if (orderError) {
    console.error("[WEBHOOK] Failed to create order:", orderError);
    throw orderError;
  }

  // Subscription checkouts are recorded in `orders` only. The local
  // user_subscriptions mirror was removed — organisation licences replace it.


  console.log(`[WEBHOOK] Successfully processed checkout for user ${userId}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[WEBHOOK] Payment intent succeeded: ${paymentIntent.id}`);
  
  // Find the order and update payment record
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (order) {
    await supabase
      .from("payments")
      .upsert({
        order_id: order.id,
        user_id: order.user_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "succeeded",
        payment_method_type: paymentIntent.payment_method_types?.[0],
      }, { onConflict: "stripe_payment_intent_id" });
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[WEBHOOK] Payment intent failed: ${paymentIntent.id}`);
  
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .single();

  if (order) {
    await supabase
      .from("payments")
      .upsert({
        order_id: order.id,
        user_id: order.user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "failed",
        failure_message: paymentIntent.last_payment_error?.message,
      }, { onConflict: "stripe_payment_intent_id" });

    // Update order status
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);
  }
}

// Subscription lifecycle events are logged only. There is no local
// subscription mirror any more; organisation licences carry entitlement.
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription updated (no-op): ${subscription.id}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription deleted (no-op): ${subscription.id}`);
}


Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  if (!endpointSecret) {
    console.error("[WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured. Refusing to process webhook.");
    return new Response("Webhook secret not configured", { status: 500 });
  }
  if (!signature) {
    console.error("[WEBHOOK] Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

  // Log the event
  await logWebhookEvent(event.id, event.type, "received", { object_id: (event.data.object as any).id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        console.log("[WEBHOOK] Invoice payment succeeded");
        break;
      }
      case "invoice.payment_failed": {
        console.log("[WEBHOOK] Invoice payment failed");
        break;
      }
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    await logWebhookEvent(event.id, event.type, "processed");
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error(`[WEBHOOK] Error processing ${event.type}:`, error);
    await logWebhookEvent(event.id, event.type, "failed", null, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
