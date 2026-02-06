import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative bg-background overflow-hidden">
      {/* Decorative Arc Lines - Brand Identity (matching reference) */}
      <svg 
        className="absolute right-0 top-0 h-full w-1/2 pointer-events-none" 
        preserveAspectRatio="xMaxYMid slice"
        viewBox="0 0 400 600"
        aria-hidden="true"
      >
        {/* Outer arc - Teal */}
        <path
          d="M 350 50 Q 450 300, 350 550"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          opacity="0.3"
        />
        {/* Middle arc - Yellow */}
        <path
          d="M 320 80 Q 400 300, 320 520"
          fill="none"
          stroke="hsl(var(--accent-yellow))"
          strokeWidth="3"
          opacity="0.5"
        />
        {/* Inner arc - Coral/Peach */}
        <path
          d="M 290 110 Q 360 300, 290 490"
          fill="none"
          stroke="hsl(var(--accent-peach))"
          strokeWidth="3"
          opacity="0.5"
        />
      </svg>

      <div className="container mx-auto max-w-6xl px-6 py-20 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-foreground">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span>New courses added weekly</span>
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-heading font-bold leading-tight text-foreground">
              Transform Your Skills with{" "}
              <span className="text-foreground">
                Special People Academy
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Build skills that matter. Our comprehensive training platform helps your workforce stay ahead with interactive courses, certifications, and progress tracking.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
                onClick={() => navigate('/contact')}
              >
                Contact Sales
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                className="text-foreground hover:bg-transparent gap-2"
              >
                <Play className="h-5 w-5 fill-current" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {['A', 'B', 'C', 'D'].map((letter, i) => (
                  <div
                    key={letter}
                    className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-foreground"
                    style={{
                      backgroundColor: i === 0 ? 'hsl(var(--primary))' : 
                                      i === 1 ? 'hsl(68 55% 50%)' : 
                                      i === 2 ? 'hsl(68 55% 60%)' : 
                                      'hsl(68 55% 70%)',
                      color: i === 0 ? 'white' : 'hsl(var(--foreground))'
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-sm text-foreground">
                <span className="font-semibold">1,200+</span>
                <span className="text-muted-foreground"> employees trained this month</span>
              </div>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="relative lg:pl-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="relative bg-gradient-to-br from-[hsl(180_20%_90%)] to-[hsl(68_40%_85%)] rounded-2xl p-6 shadow-lg">
              <div className="aspect-video bg-gradient-to-br from-[hsl(180_25%_85%)] to-[hsl(68_50%_80%)] rounded-xl flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/60 backdrop-blur flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-md">
                  <Play className="h-6 w-6 text-foreground ml-1 fill-foreground/20" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["Safety", "Leadership", "Technical"].map((category) => (
                  <div
                    key={category}
                    className="px-3 py-2 rounded-lg bg-white/50 text-center text-sm font-medium text-foreground"
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
