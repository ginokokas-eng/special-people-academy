import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FAQItem[];
  eyebrow?: string;
}

export const FAQSection = ({
  title = "Frequently asked questions",
  subtitle,
  faqs,
  eyebrow = "FAQ",
}: FAQSectionProps) => {
  return (
    <section className="section-y bg-white">
      <div className="section-container">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-10 lg:mb-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[hsl(189_94%_30%)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(189_94%_30%)]">
                {eyebrow}
              </span>
            </div>
            <h2 className="font-heading text-[34px] sm:text-[42px] lg:text-[52px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
              {title}
            </h2>
          </div>
          {subtitle && (
            <div className="lg:col-span-5 lg:pt-10">
              <p className="text-[15px] lg:text-base leading-relaxed text-[hsl(259_20%_35%)] max-w-md">
                {subtitle}
              </p>
            </div>
          )}
        </div>

        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-2xl border border-[#EEEAF8] px-6 hover:border-[#D6CCF5] transition-colors data-[state=open]:border-[#D6CCF5] data-[state=open]:shadow-[0_8px_30px_-15px_rgba(76,29,149,0.15)]"
              >
                <AccordionTrigger className="text-left text-[15px] lg:text-base font-semibold py-5 text-[hsl(259_72%_14%)] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[hsl(259_20%_35%)] text-[14px] lg:text-[15px] leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
