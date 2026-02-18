import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const combos = [
  {
    title: "Combo 1",
    subtitle: "Phát âm + A1.1",
    sessions: "25 buổi",
    suitableFor: "Người mới bắt đầu, mất gốc",
    outcomes: [
      "Phát âm chuẩn cơ bản",
      "Giao tiếp chào hỏi, tự giới thiệu",
      "Hiểu câu đơn giản trong Alltag",
    ],
    highlight: false,
  },
  {
    title: "Combo 2",
    subtitle: "Phát âm + A1.2 + Ôn thi A1",
    sessions: "34 buổi",
    suitableFor: "Muốn thi chứng chỉ A1, đi làm cơ bản",
    outcomes: [
      "Phát âm vững + nghe hiểu tốt hơn",
      "Tự tin đi sở, bác sĩ đơn giản",
      "Ôn thi A1 Prüfung bài bản",
    ],
    highlight: true,
  },
  {
    title: "Combo 3",
    subtitle: "Phát âm + A2.2 / B1",
    sessions: "29 buổi",
    suitableFor: "Đã có nền A1–A2, muốn lên trình",
    outcomes: [
      "Giao tiếp phức tạp hơn (đi làm, hội thoại)",
      "Phản xạ nhanh, nói tự nhiên hơn",
      "Chuẩn bị thi B1 nếu cần",
    ],
    highlight: false,
  },
];

const CoursePackages = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="packages" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Chọn Combo phù hợp với bạn
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Mỗi combo được thiết kế theo mục tiêu cụ thể — bắt đầu từ phát âm, kết thúc bằng tự tin.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {combos.map((combo, i) => (
            <div
              key={i}
              className={`relative bg-card rounded-2xl p-6 card-shadow border transition-all duration-300 hover:card-shadow-hover flex flex-col ${
                combo.highlight ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              {combo.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-gold px-4 py-1 rounded-full text-xs font-bold">
                  ✨ Phổ biến nhất
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-foreground">{combo.title}</h3>
                <p className="text-primary font-semibold">{combo.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
                  {combo.sessions}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Phù hợp:</strong> {combo.suitableFor}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {combo.outcomes.map((o, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-accent/60 rounded-lg px-3 py-2 mb-4 text-center">
                <span className="text-xs text-accent-foreground font-medium">
                  Ưu đãi theo đợt — hỏi Trang để biết thêm
                </span>
              </div>
              <Button
                variant={combo.highlight ? "hero" : "hero-outline"}
                className="w-full"
                asChild
              >
                <Link to="/contact">Chọn combo này</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoursePackages;
