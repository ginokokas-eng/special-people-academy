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
    const cartItemsJson = session.metadata?.cart_items;
    if (cartItemsJson) {
      const cartItems = JSON.parse(cartItemsJson) as Array<{
        course_id: string;
        offering_id: string;
        offering_type: string;
        participants_count: number;
        regulated_certification: boolean;
      }>;

      console.log(`[WEBHOOK] Processing ${cartItems.length} course purchases`);

      // Create enrollments for each course
      for (const item of cartItems) {
        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", item.course_id)
          .maybeSingle();

        if (!existingEnrollment) {
          const { error: enrollError } = await supabase
            .from("enrollments")
            .insert({
              user_id: userId,
              course_id: item.course_id,
            });

          if (enrollError) {
            console.error(`[WEBHOOK] Failed to create enrollment for course ${item.course_id}:`, enrollError);
          } else {
            console.log(`[WEBHOOK] Created enrollment for course ${item.course_id}`);
          }
        } else {
          console.log(`[WEBHOOK] Enrollment already exists for course ${item.course_id}`);
        }
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
        cart_items: session.metadata?.cart_items,
      },
    }, { onConflict: "stripe_session_id" });

  if (orderError) {
    console.error("[WEBHOOK] Failed to create order:", orderError);
    throw orderError;
  }

  // Only update subscription if this is a subscription checkout
  if (session.mode === "subscription" && session.subscription) {
    const { error: subError } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan: session.metadata?.plan_id || "basic",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id" });

    if (subError) {
      console.error("[WEBHOOK] Failed to update subscription:", subError);
      throw subError;
    }
  }

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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription updated: ${subscription.id}, status: ${subscription.status}`);
  
  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[WEBHOOK] Failed to update subscription:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription deleted: ${subscription.id}`);
  
  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[WEBHOOK] Failed to cancel subscription:", error);
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (endpointSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } else {
      // For testing without webhook signature verification
      event = JSON.parse(body) as Stripe.Event;
      console.warn("[WEBHOOK] Warning: No webhook secret configured, skipping signature verification");
    }
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
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
