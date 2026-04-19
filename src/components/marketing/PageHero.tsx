import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

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
    <section className="relative bg-white overflow-hidden">
      {/* Ambient lavender / blue glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[hsl(262_83%_58%/0.08)] blur-[120px]" />
        <div className="absolute top-20 right-[-120px] w-[460px] h-[460px] rounded-full bg-[hsl(217_91%_60%/0.07)] blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-16 lg:pt-24 lg:pb-20 relative z-10">
        <div className="max-w-4xl">
          {badge && (
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[hsl(189_94%_30%)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(189_94%_30%)]">
                {badge}
              </span>
            </div>
          )}
          <h1 className="font-heading text-[40px] sm:text-[56px] lg:text-[72px] leading-[1.0] tracking-tight font-bold text-[hsl(259_72%_14%)] mb-6">
            {title}
          </h1>
          <p className="text-[16px] lg:text-lg leading-relaxed text-[hsl(259_20%_35%)] max-w-2xl mb-8">
            {subtitle}
          </p>
          {(primaryCTA || secondaryCTA) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {primaryCTA && (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full h-12 px-6 bg-[#0F0B30] hover:bg-[#1A1448] text-white font-semibold"
                >
                  <Link to={primaryCTA.href} className="inline-flex items-center gap-1.5">
                    {primaryCTA.text}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryCTA && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full h-12 px-6 border-[#E8E4F7] bg-white text-[hsl(259_72%_14%)] hover:bg-[#F4F1FB] hover:text-[hsl(259_72%_14%)] font-semibold"
                >
                  <Link to={secondaryCTA.href}>{secondaryCTA.text}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
