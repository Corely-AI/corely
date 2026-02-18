import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const bullets = [
  "Phát âm chuẩn ngay từ đầu → người Đức nghe hiểu",
  "Phản xạ hội thoại đời sống thật (Alltag)",
  "Học lên A1/A2/B1 vững nền, không \"gãy\"",
  "Có bài tập, feedback, cộng đồng hỗ trợ",
];

const HeroSection = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToPackages = () => {
    document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden hero-gradient">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
              🇩🇪 Online qua Zoom · Cho người Việt ở Đức
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight text-foreground">
              Học tiếng Đức để{" "}
              <span className="text-gradient-brand">dùng được ngay</span> — tự tin giao tiếp từ{" "}
              <span className="text-primary">phát âm chuẩn</span>.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Dành cho người Việt ở Đức: đi sở, đi bác sĩ, đi làm… không còn sợ nói sai. Lộ trình rõ ràng, luyện phản xạ thực tế, học online qua Zoom.
            </p>
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground">
                  <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="hero" size="xl" onClick={scrollToForm}>
                Nhận tư vấn & xếp lớp
              </Button>
              <Button variant="hero-outline" size="xl" onClick={scrollToPackages}>
                Xem Combo phù hợp
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden card-shadow">
              <img
                src={heroImage}
                alt="Trang In Berlin – Giảng viên tiếng Đức online"
                className="w-full h-auto object-cover aspect-[16/10]"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-xl px-4 py-3 card-shadow hidden md:block">
              <p className="text-sm font-semibold text-foreground">❤️ Học bằng tình yêu</p>
              <p className="text-xs text-muted-foreground">Cùng Trang In Berlin</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
