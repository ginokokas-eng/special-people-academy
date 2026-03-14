import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import { CoursesSection } from "@/components/CoursesSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import TrainingShredKnowledgeSection from "@/components/sections/TrainingShredKnowledgeSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Special People Training | Inclusive Training & CPD Courses</title>
        <meta name="description" content="Special People Training provides inclusive, CPD-certified training courses for care professionals. Build essential skills with step-by-step lessons and progress tracking." />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <HeroSection />
          <StatsSection />
          <CoursesSection />
          <FeaturesSection />
          <TestimonialsSection />
          <TrainingShredKnowledgeSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
