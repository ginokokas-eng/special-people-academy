import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Award, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const partnerTypes = [
  { icon: Handshake, title: "Referral Partners", desc: "Earn commission by referring organizations to Special People Academy." },
  { icon: Award, title: "Accreditation Bodies", desc: "Partner with us to offer recognized qualifications through our platform." },
  { icon: TrendingUp, title: "Resellers", desc: "Add Special People Academy to your portfolio and serve your clients." },
  { icon: Users, title: "Integration Partners", desc: "Connect your platform with ours to deliver seamless experiences." }
];

export default function Partners() {
  return (
    <MarketingLayout title="Partners" description="Partner with Special People Academy. Referral programs, integrations, and reseller opportunities for inclusive training solutions.">
      <PageHero badge="Partner Program" title="Grow Together" subtitle="Join our partner ecosystem and help organizations deliver inclusive training while growing your business." primaryCTA={{ text: "Become a Partner", href: "/contact" }} />
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            {partnerTypes.map((p, i) => (
              <Card key={i} className="p-6"><CardContent className="p-0 flex items-start gap-4"><div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><p.icon className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold text-foreground mb-1">{p.title}</h3><p className="text-muted-foreground text-sm">{p.desc}</p></div></CardContent></Card>
            ))}
          </div>
        </div>
      </section>
      <CTABanner title="Ready to Partner?" subtitle="Let's discuss how we can work together to expand access to inclusive training." primaryCTA={{ text: "Contact Us", href: "/contact" }} />
    </MarketingLayout>
  );
}
