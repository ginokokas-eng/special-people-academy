import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { CoursesSection } from "@/components/CoursesSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { ComplianceBand } from "@/components/marketing/ComplianceBand";
import { OrganisationsSection } from "@/components/marketing/OrganisationsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const ADMIN_ROLES = ['super_admin', 'admin', 'ops_training_admin', 'trainer'] as const;
const ADMIN_PATHS: Record<string, string> = {
  super_admin: '/admin-portal/dashboard',
  admin: '/admin-portal/dashboard',
  ops_training_admin: '/admin-portal/courses',
  trainer: '/admin-portal/trainer',
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      const roles = (data ?? []).map((r: { role: string }) => r.role);
      const match = ADMIN_ROLES.find((r) => roles.includes(r));
      if (match) navigate(ADMIN_PATHS[match], { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, loading, navigate]);


  return (
    <>
      <Helmet>
        <title>Special People Training | CPD-certified UK Care Training</title>
        <meta
          name="description"
          content="Inspection-ready, CPD-certified training for UK care providers. Practical sign-off, audit packs and live compliance dashboards — built for care homes, domiciliary care, supported living and the NHS."
        />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <HeroSection />
          <TrustStrip />
          <CoursesSection />
          <FeaturesSection />
          <ComplianceBand />
          <PricingSection />
          <OrganisationsSection />
          <TestimonialsSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
