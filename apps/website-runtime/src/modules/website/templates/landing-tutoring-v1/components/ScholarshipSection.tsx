import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";
import Link from "next/link";
import {
  type CommonBlockProps,
  type RuntimeProps,
  resolveInternalHref,
  sectionClass,
} from "./shared";

type ScholarshipSectionProps = CommonBlockProps & RuntimeProps & { heading?: string };

export const ScholarshipSection = (props: ScholarshipSectionProps) => {
  return (
    <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24")}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center bg-accent/50 rounded-2xl p-8 md:p-12 card-shadow border border-border space-y-5">
          <Award className="w-12 h-12 text-secondary mx-auto" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {props.heading ?? "Học bổng & Ưu đãi"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Deutsch Liebe có chương trình ghi nhận nỗ lực học tập theo từng đợt. Học viên chăm chỉ,
            tiến bộ rõ rệt sẽ được ưu đãi khoá tiếp theo. Đây là cách Trang khuyến khích tinh thần
            "học bằng tình yêu" ❤️
          </p>
          <Button variant="hero-outline" size="lg" asChild>
            <Link href={resolveInternalHref("/contact", props.basePath)}>
              Hỏi về học bổng / ưu đãi
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ScholarshipSection;
