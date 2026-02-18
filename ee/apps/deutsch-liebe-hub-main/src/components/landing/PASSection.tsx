import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PASSection = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-3xl text-center space-y-8">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground">
          Bạn có thấy mình ở đây không?
        </h2>

        <div className="space-y-5 text-left md:text-center">
          <div className="bg-accent/50 rounded-xl p-5 card-shadow">
            <p className="text-foreground leading-relaxed">
              😰 Nghe người Đức nói mà <strong>"não đứng hình"</strong> — họ nói nhanh quá, không
              bắt kịp.
            </p>
          </div>
          <div className="bg-accent/50 rounded-xl p-5 card-shadow">
            <p className="text-foreground leading-relaxed">
              😶 Muốn trả lời nhưng <strong>sợ phát âm sai</strong>, sợ mở miệng ra là người ta
              không hiểu.
            </p>
          </div>
          <div className="bg-accent/50 rounded-xl p-5 card-shadow">
            <p className="text-foreground leading-relaxed">
              😣 Đi sở, đi bác sĩ, đi làm… <strong>phải nhờ người đi cùng</strong> — ngại, phiền,
              tốn tiền.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 md:p-8 card-shadow border border-border">
          <p className="text-lg text-foreground leading-relaxed">
            Vấn đề <strong>không phải bạn không thông minh</strong> — mà là bạn chưa được học đúng
            cách, nhất là <span className="text-primary font-semibold">phát âm</span>. Khi phát âm
            chuẩn, bạn nghe rõ hơn, nói tự tin hơn, và mọi thứ bắt đầu "thông".
          </p>
        </div>

        <Button variant="hero" size="lg" asChild>
          <Link to="/contact">Bắt đầu học đúng cách →</Link>
        </Button>
      </div>
    </section>
  );
};

export default PASSection;
