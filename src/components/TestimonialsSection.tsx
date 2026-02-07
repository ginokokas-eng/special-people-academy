import { TestimonialsColumn, Testimonial } from "@/components/ui/testimonials-columns-1";

const testimonials: Testimonial[] = [
  {
    text: "The training has transformed how our team supports clients with complex needs. The step-by-step approach makes even difficult procedures feel manageable.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    name: "Sarah Mitchell",
    role: "Care Manager, Sunrise Care Services",
  },
  {
    text: "Finally, a training platform that understands the realities of shift work. Our staff can complete modules between calls without losing momentum.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "James Thompson",
    role: "Operations Director, HomeFirst Support",
  },
  {
    text: "The compliance tracking alone has saved us hours each month. CQC inspectors were impressed with how quickly we could evidence training records.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    name: "Emily Chen",
    role: "Registered Manager, Oakwood Residential",
  },
  {
    text: "Our support workers actually enjoy the courses. The microlearning format keeps them engaged, and they retain more than traditional full-day sessions.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    name: "David Williams",
    role: "Training Lead, Community Care Trust",
  },
  {
    text: "The practical competency sign-off feature is brilliant. We can now track exactly who's been assessed and when refreshers are due.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    name: "Rachel Adams",
    role: "Clinical Lead, Specialist Nursing Ltd",
  },
  {
    text: "We switched from paper-based training records and haven't looked back. Everything is in one place, and certificates are always accessible.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    name: "Michael Brown",
    role: "Director, Pathways Supported Living",
  },
];

// Split testimonials into three columns
const column1 = testimonials.filter((_, i) => i % 3 === 0);
const column2 = testimonials.filter((_, i) => i % 3 === 1);
const column3 = testimonials.filter((_, i) => i % 3 === 2);

export const TestimonialsSection = () => {
  return (
    <section className="py-20 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Trusted by Care Providers Across the UK
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from the teams transforming their training with Special People Academy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[500px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
          <TestimonialsColumn 
            testimonials={column1} 
            duration={25}
          />
          <TestimonialsColumn 
            testimonials={column2} 
            duration={30}
            className="hidden md:block"
          />
          <TestimonialsColumn 
            testimonials={column3} 
            duration={22}
            className="hidden lg:block"
          />
        </div>
      </div>
    </section>
  );
};
