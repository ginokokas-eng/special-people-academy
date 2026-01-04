import { Shield, Zap, Target, Award } from "lucide-react";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature = ({ icon, title, description }: FeatureProps) => (
  <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground text-lg mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </div>
);

export const FeaturesSection = () => {
  const features: FeatureProps[] = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Compliance Ready",
      description: "Stay compliant with industry regulations through mandatory training tracking and automated certifications.",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Microlearning",
      description: "Bite-sized lessons that fit into busy schedules. Learn on-the-go with mobile-optimized content.",
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Personalized Paths",
      description: "AI-powered recommendations create custom learning journeys based on role and skill gaps.",
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Verified Certificates",
      description: "Earn industry-recognized certifications that validate expertise and boost career growth.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Why Teams Choose TrainHub
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build a culture of continuous learning and development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Feature {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
