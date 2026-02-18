import { ClipboardCheck, AudioLines, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: ClipboardCheck,
    title: "Test trình độ & mục tiêu",
    description: "Xác định level hiện tại (A1/A2/B1) và mục tiêu: đi làm, đi học hay định cư. Trang tư vấn lộ trình cá nhân.",
  },
  {
    icon: AudioLines,
    title: "Lộ trình + Luyện Aussprache",
    description: "Bắt đầu từ phát âm chuẩn (Aussprache). Nền tảng vững — nghe rõ hơn, nói tự tin hơn.",
  },
  {
    icon: MessageCircle,
    title: "Thực hành hội thoại + Feedback",
    description: "Luyện phản xạ giao tiếp đời sống thật. Sửa lỗi trực tiếp, có bài tập mỗi buổi.",
  },
];

const MethodSection = () => (
  <section className="py-16 md:py-24 bg-card">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
          Cách học cùng Trang
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          3 bước đơn giản để bắt đầu hành trình tiếng Đức "dùng được"
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto">
              <step.icon className="w-8 h-8 text-primary" />
            </div>
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {i + 1}
            </div>
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default MethodSection;
