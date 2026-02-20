import { Facebook, Instagram } from "lucide-react";
import { type CommonBlockProps, type RuntimeProps, sectionClass } from "./shared";

type SocialProofStripProps = CommonBlockProps & RuntimeProps & { heading?: string };

export const SocialProofStrip = (props: SocialProofStripProps) => {
  const socials = props.settings?.common.socials ?? {};
  const chips = ["Học online linh hoạt", "Lộ trình rõ ràng", "Tập trung giao tiếp"];

  return (
    <section id={props.anchorId} className={sectionClass(props, "bg-card border-y border-border")}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {props.heading ?? "Cộng đồng học viên yêu tiếng Đức"}
            </span>
            <div className="flex gap-2">
              <a
                href={socials.facebook ?? "https://facebook.com/ThuTrangNguyenGermany"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={socials.instagram ?? "https://instagram.com/tranginberlin"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofStrip;
