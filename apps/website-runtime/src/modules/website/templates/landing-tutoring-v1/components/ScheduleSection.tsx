import { Button } from "@/components/ui/button";
import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import {
  type CommonBlockProps,
  type RuntimeProps,
  resolveInternalHref,
  sectionClass,
} from "./shared";

type ScheduleSectionProps = CommonBlockProps & RuntimeProps & { heading?: string };

export const ScheduleSection = (props: ScheduleSectionProps) => {
  return (
    <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24 bg-card")}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground">
            {props.heading ?? "Lịch khai giảng sắp tới"}
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
            <Button variant="hero" size="lg" asChild>
              <Link href={resolveInternalHref("/contact", props.basePath)}>
                Giữ chỗ lớp khai giảng
              </Link>
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
