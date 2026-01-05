import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CTASection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 px-6 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="relative gradient-hero rounded-3xl p-10 lg:p-16 text-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Ready to transform your team?</span>
            </div>
            
            <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground leading-tight">
              Start Building a Skilled,<br />Future-Ready Workforce
            </h2>
            
            <p className="text-primary-foreground/80 max-w-xl mx-auto text-lg">
              Join organizations using Special People Academy to unlock potential, build confidence, and drive meaningful growth.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button variant="hero" size="xl" onClick={() => navigate('/contact')}>
                Contact Sales
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="heroOutline" size="xl">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
