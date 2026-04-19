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
    <section className="section-y bg-white relative overflow-hidden">
      {/* Soft ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-[hsl(262_83%_58%/0.05)] blur-[120px]" />
      </div>

      <div className="section-container relative">
        <div className="max-w-2xl mx-auto text-center mb-12 lg:mb-14">
          <span className="eyebrow mb-3">Social proof</span>
          <h2 className="heading-display text-3xl lg:text-[40px] leading-tight mt-3">
            Trusted by care providers across the UK
          </h2>
          <p className="text-[hsl(259_20%_30%)] mt-3 text-base lg:text-lg">
            Hear from registered managers, training leads and operations directors using
            Special People Training every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[520px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
          <TestimonialsColumn
            testimonials={column1}
            duration={28}
          />
          <TestimonialsColumn
            testimonials={column2}
            duration={34}
            className="hidden md:block"
          />
          <TestimonialsColumn
            testimonials={column3}
            duration={24}
            className="hidden lg:block"
          />
        </div>
      </div>
    </section>
  );
};
