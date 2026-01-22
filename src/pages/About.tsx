import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Heart, Target, Users, Award, CheckCircle } from "lucide-react";

export default function About() {
  return (
    <MarketingLayout title="About Us" description="Learn about Special People Academy's mission to empower individuals through inclusive, accessible training programs.">
      <PageHero badge="About Us" title="Empowering Every Learner" subtitle="Special People Academy was founded on a simple belief: everyone deserves access to quality training that respects their abilities and supports their growth." primaryCTA={{ text: "Request a Demo", href: "/contact" }} />
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">We exist to empower special individuals to develop essential skills through personalized, inclusive training programs. We believe that with the right support, every person can learn, grow, and achieve their goals.</p>
              <p className="text-muted-foreground">Our platform is built from the ground up with accessibility at its core—not as an afterthought, but as a fundamental principle that guides every decision we make.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ icon: Heart, label: "Person-Centered", value: "100%" }, { icon: Target, label: "Courses", value: "50+" }, { icon: Users, label: "Learners", value: "50,000+" }, { icon: Award, label: "Certificates", value: "100,000+" }].map((stat, i) => (
                <div key={i} className="p-6 rounded-xl border text-center"><stat.icon className="h-8 w-8 text-primary mx-auto mb-2" /><div className="text-2xl font-bold text-foreground">{stat.value}</div><div className="text-sm text-muted-foreground">{stat.label}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ title: "Inclusion", desc: "Everyone belongs. We design for the full spectrum of human diversity." }, { title: "Dignity", desc: "We use person-first language and reject 'inspiration' narratives." }, { title: "Excellence", desc: "Accessible training should never mean compromising on quality." }].map((v, i) => (
              <div key={i} className="p-6 bg-background rounded-xl border"><h3 className="font-semibold text-foreground mb-2">{v.title}</h3><p className="text-muted-foreground text-sm">{v.desc}</p></div>
            ))}
          </div>
        </div>
      </section>
      <CTABanner title="Join Our Mission" subtitle="Partner with us to create a world where quality training is accessible to everyone." primaryCTA={{ text: "Get Started", href: "/contact" }} />
    </MarketingLayout>
  );
}
