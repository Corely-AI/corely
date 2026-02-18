import { Button } from "@/components/ui/button";
import { CalendarDays, Clock } from "lucide-react";

const ScheduleSection = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">
            Lịch khai giảng sắp tới
          </h2>
          <div className="bg-background rounded-2xl p-6 md:p-8 card-shadow border border-border space-y-4">
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-foreground">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span className="font-semibold">18.02.2026</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold">21:00 – 23:15 (giờ Đức)</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Online qua Zoom · Tối thứ 2, 4, 6 hàng tuần
            </p>
            <Button variant="hero" size="lg" onClick={scrollToForm}>
              Giữ chỗ lớp khai giảng
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Không hợp lịch? Để lại thông tin, Trang sẽ xếp lớp phù hợp cho bạn.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ScheduleSection;
