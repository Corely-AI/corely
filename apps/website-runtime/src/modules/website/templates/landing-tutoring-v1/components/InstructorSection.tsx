import { type CommonBlockProps, type RuntimeProps, sectionClass } from "./shared";

type InstructorSectionProps = CommonBlockProps & RuntimeProps & { heading?: string };

const principles = ["Chuẩn phát âm", "Giao tiếp đời sống", "Nâng trình có hệ thống"];

export const InstructorSection = (props: InstructorSectionProps) => (
  <section id={props.anchorId} className={sectionClass(props, "py-16 md:py-24")}>
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground">
          {props.heading ?? "Về giảng viên: Trang In Berlin"}
        </h2>
        <div className="w-28 h-28 rounded-full bg-accent mx-auto flex items-center justify-center text-4xl">
          👩‍🏫
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-foreground">Thu Trang Nguyen</h3>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Sống và làm việc tại Berlin. Phong cách dạy: gần gũi, thực tế, tập trung giúp bạn{" "}
            <strong>nói được</strong>
            chứ không chỉ <em>biết ngữ pháp</em>. Trang tin rằng: khi bạn yêu tiếng Đức, bạn sẽ học
            nhanh hơn ❤️
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {principles.map((item) => (
            <span
              key={item}
              className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default InstructorSection;
