import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PageHeroProps {
  badge?: string;
  title: string;
  subtitle: string;
  primaryCTA?: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
}

export const PageHero = ({ badge, title, subtitle, primaryCTA, secondaryCTA }: PageHeroProps) => {
  return (
    <section className="relative py-20 md:py-28 px-6 bg-gradient-to-b from-primary/5 to-background overflow-hidden">
      {/* Decorative Arc Shapes - Brand Identity */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        preserveAspectRatio="none"
        viewBox="0 0 1440 400"
        aria-hidden="true"
      >
        {/* Subtle sweeping arc */}
        <path
          d="M-100 150 Q 400 50, 900 120 T 1600 80"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          opacity="0.06"
        />
        {/* Lower accent arc */}
        <path
          d="M0 300 Q 360 250, 720 280 T 1440 260"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          opacity="0.08"
        />
      </svg>

      <div className="container mx-auto max-w-4xl text-center relative z-10">
        {badge && (
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-primary/10 text-primary rounded-full">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {subtitle}
        </p>
        {(primaryCTA || secondaryCTA) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {primaryCTA && (
              <Button asChild size="lg" className="text-base">
                <Link to={primaryCTA.href}>{primaryCTA.text}</Link>
              </Button>
            )}
            {secondaryCTA && (
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to={secondaryCTA.href}>{secondaryCTA.text}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
