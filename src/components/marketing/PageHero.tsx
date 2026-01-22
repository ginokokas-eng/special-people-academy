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
    <section className="relative py-20 md:py-28 px-6 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto max-w-4xl text-center">
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
