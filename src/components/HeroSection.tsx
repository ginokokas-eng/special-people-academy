import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative gradient-hero text-primary-foreground overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl px-6 py-24 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>New courses added weekly</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Transform Your Skills with{" "}
              <span className="text-gradient-primary">
                Special People Training
              </span>
            </h1>

            <p className="text-lg text-primary-foreground/80 max-w-lg leading-relaxed">
              Build skills that matter. Our comprehensive training platform helps your workforce stay ahead with interactive courses, certifications, and progress tracking.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" onClick={() => navigate('/contact')}>
                Contact Sales
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="heroOutline" size="xl">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs font-semibold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="font-semibold">1,200+</span>
                <span className="text-primary-foreground/70"> employees trained this month</span>
              </div>
            </div>
          </div>

          <div className="relative lg:pl-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="relative bg-card/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/10">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary-foreground/20 backdrop-blur flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-primary-foreground ml-1" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["Safety", "Leadership", "Technical"].map((category) => (
                  <div
                    key={category}
                    className="px-3 py-2 rounded-lg bg-primary-foreground/10 text-center text-sm font-medium"
                  >
                    {category}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
