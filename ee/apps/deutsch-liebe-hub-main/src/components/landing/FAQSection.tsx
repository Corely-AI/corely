import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Em mất gốc có học được không?",
    a: "Hoàn toàn được! Combo 1 bắt đầu từ phát âm cơ bản, không yêu cầu nền tảng. Rất nhiều học viên của Trang bắt đầu từ zero.",
  },
  {
    q: "Học online có hiệu quả không?",
    a: "Rất hiệu quả. Lớp nhỏ, tương tác trực tiếp qua Zoom, có bài tập và feedback mỗi buổi. Nhiều bạn đã đậu A1 sau 3 tháng học online.",
  },
  {
    q: "Lớp phù hợp A1/A2/B1 như thế nào?",
    a: "Trang sẽ test trình độ miễn phí để xếp lớp phù hợp. Mỗi combo có mục tiêu rõ ràng — bạn không cần lo chọn sai.",
  },
  {
    q: "Nếu bận ca làm thì sao?",
    a: "Lớp học buổi tối (21:00 giờ Đức). Nếu không hợp lịch, hãy để lại thông tin, Trang sẽ xếp lớp theo lịch của bạn hoặc thông báo khi mở lớp mới.",
  },
  {
    q: "Có ôn thi chứng chỉ không?",
    a: "Có. Combo 2 bao gồm ôn thi A1 Prüfung. Trang cũng hướng dẫn cấu trúc đề thi và luyện từng phần (nghe, nói, đọc, viết).",
  },
  {
    q: "Cần chuẩn bị gì trước khi học (mic, tài liệu, app)?",
    a: "Chỉ cần laptop/điện thoại có mic + Zoom. Tài liệu Trang cung cấp đầy đủ. Không cần mua sách thêm.",
  },
];

const FAQSection = () => (
  <section className="py-16 md:py-24 bg-card">
    <div className="container mx-auto px-4 max-w-2xl">
      <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-10">
        Câu hỏi thường gặp
      </h2>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="bg-background rounded-xl border border-border px-5">
            <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
