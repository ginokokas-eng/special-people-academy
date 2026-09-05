import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Subscription plans are retired: `user_subscriptions` was dropped and a
  // recurring payment grants no course access. Course purchases go through
  // `course_offerings` (create-cart-checkout) and are unaffected.
  console.log("[CREATE-CHECKOUT] Rejected retired subscription checkout request");
  return new Response(
    JSON.stringify({
      error:
        "Subscription plans are no longer sold. Buy a course from the catalogue, or contact our team about organisation training passes.",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410,
    }
  );
});
