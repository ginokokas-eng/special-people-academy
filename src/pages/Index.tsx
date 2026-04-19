import { Helmet } from "react-helmet-async";
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

const Index = () => {
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
          <HomeShowcaseSection />
          <TrustStrip />
          <CoursesSection />
          <FeaturesSection />
          <ComplianceBand />
          <OrganisationsSection />
          <TestimonialsSection />
          <PricingSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
