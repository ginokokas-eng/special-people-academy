import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  course_id: string;
  offering_id: string;
  course_title: string;
  offering_type: string;
  base_price: number;
  participants_count: number;
  regulated_certification: boolean;
  regulated_fee: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CART-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse cart items
    const { cart_items }: { cart_items: CartItem[] } = await req.json();
    if (!cart_items || cart_items.length === 0) {
      throw new Error("No items in cart");
    }
    logStep("Cart items received", { count: cart_items.length });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of cart_items) {
      const itemTotal = item.base_price + item.regulated_fee;
      
      // Course price as a line item
      lineItems.push({
        price_data: {
          currency: "gbp",
          unit_amount: item.base_price * 100, // Convert to pence
          product_data: {
            name: item.course_title,
            description: `Training: ${item.offering_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            metadata: {
              course_id: item.course_id,
              offering_id: item.offering_id,
              offering_type: item.offering_type,
            },
          },
        },
        quantity: 1,
      });

      // Add regulated certification as separate line item if selected
      if (item.regulated_certification && item.regulated_fee > 0) {
        lineItems.push({
          price_data: {
            currency: "gbp",
            unit_amount: item.regulated_fee * 100,
            product_data: {
              name: `Regulated Certificate - ${item.course_title}`,
              description: `Official regulated certification (${item.participants_count} participant${item.participants_count > 1 ? 's' : ''})`,
              metadata: {
                course_id: item.course_id,
                type: "regulated_certificate",
              },
            },
          },
          quantity: 1,
        });
      }
    }

    logStep("Line items created", { count: lineItems.length });

    // Create metadata for fulfillment
    const cartMetadata = cart_items.map(item => ({
      course_id: item.course_id,
      offering_id: item.offering_id,
      offering_type: item.offering_type,
      participants_count: item.participants_count,
      regulated_certification: item.regulated_certification,
    }));

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        user_id: user.id,
        cart_items: JSON.stringify(cartMetadata),
        type: "course_purchase",
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          type: "course_purchase",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
