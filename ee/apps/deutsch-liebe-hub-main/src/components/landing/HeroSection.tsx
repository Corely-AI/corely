import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const bullets = [
  "Phát âm chuẩn ngay từ đầu → người Đức nghe hiểu",
  "Phản xạ hội thoại đời sống thật (Alltag)",
  'Học lên A1/A2/B1 vững nền, không "gãy"',
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
              Học tiếng Đức để <span className="text-gradient-brand">dùng được ngay</span> — tự tin
              giao tiếp từ <span className="text-primary">phát âm chuẩn</span>.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Dành cho người Việt ở Đức: đi sở, đi bác sĩ, đi làm… không còn sợ nói sai. Lộ trình rõ
              ràng, luyện phản xạ thực tế, học online qua Zoom.
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
              <Button variant="hero" size="xl" asChild>
                <Link to="/contact">Nhận tư vấn & xếp lớp</Link>
              </Button>
              <Button variant="hero-outline" size="xl" onClick={scrollToPackages}>
                Xem Combo phù hợp
              </Button>
            </div>
          </div>

          <div className="relative isolate group">
            {/* Decorative background blob */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-[2rem] -z-10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative rounded-2xl overflow-hidden card-shadow ring-1 ring-border/50 bg-card/50 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.01]">
              <img
                src="/trang.png"
                alt="Trang In Berlin – Giảng viên tiếng Đức online"
                className="w-full max-h-[500px] object-cover object-top shadow-md"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-background/95 backdrop-blur rounded-xl p-4 card-shadow border border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-1000 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  👩‍🏫
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Trang In Berlin</p>
                  <p className="text-xs text-muted-foreground">Giảng viên & Mentor</p>
                </div>
              </div>
            </div>

            {/* Secondary floating badge */}
            <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground rounded-lg px-4 py-2 shadow-lg transform rotate-3 hidden md:block animate-in fade-in zoom-in duration-700 delay-300">
              <p className="text-xs font-bold">🇩🇪 Sống & làm việc tại Đức</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
