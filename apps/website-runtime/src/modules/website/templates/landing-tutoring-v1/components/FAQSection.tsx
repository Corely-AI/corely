import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type CommonBlockProps, type RuntimeProps, sectionClass } from "./shared";

type FAQSectionProps = CommonBlockProps & RuntimeProps & { heading?: string };

const fallbackFaqs = [
  {
    id: "faq-1",
    question: "Học online có hiệu quả không?",
    answerHtml: "Có. Lớp học tập trung thực hành giao tiếp và feedback trực tiếp.",
  },
  {
    id: "faq-2",
    question: "Mất gốc có theo được không?",
    answerHtml: "Được. Lộ trình bắt đầu từ phát âm và cân bằng tốc độ cho cả nhóm.",
  },
  {
    id: "faq-3",
    question: "Học xong có thi chứng chỉ được không?",
    answerHtml: "Có. Có hướng dẫn ôn thi A1/B1 khi bạn đạt nền tảng giao tiếp phù hợp.",
  },
];

export const FAQSection = (props: FAQSectionProps) => {
  const faqs = fallbackFaqs;

  return (
    <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
      <div className="container mx-auto px-4 max-w-2xl">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-10">
          {props.heading ?? "Câu hỏi thường gặp"}
        </h2>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="bg-background rounded-xl border border-border px-5"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: faq.answerHtml }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
