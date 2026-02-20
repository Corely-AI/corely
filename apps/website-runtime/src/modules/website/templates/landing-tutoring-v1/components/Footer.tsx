import { Facebook, Instagram, Youtube } from "lucide-react";
import { buildPublicFileUrl } from "@/lib/public-api";
import { type CommonBlockProps, type RuntimeProps, sectionClass } from "./shared";

type FooterProps = CommonBlockProps & RuntimeProps & { copyrightText?: string };

export const Footer = (props: FooterProps) => {
  const common = props.settings?.common;
  const siteTitle = common?.siteTitle ?? "DEUTSCH LIEBE";
  const logoSrc =
    common?.logo?.url ??
    (common?.logo?.fileId ? buildPublicFileUrl(common.logo.fileId) : undefined);

  const socials = {
    facebook: common?.socials?.facebook || "https://www.facebook.com/TrangBGerman",
    instagram: common?.socials?.instagram || "https://www.instagram.com/ThuTrangNguyenGermany",
    youtube: common?.socials?.youtube || "https://www.youtube.com/@TrangInBerlin",
  };

  return (
    <footer
      id={props.anchorId}
      className={sectionClass(props, "bg-foreground text-background py-10")}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={siteTitle}
                  className="h-8 w-auto object-contain invert brightness-0"
                />
              ) : null}
              <span className="font-bold text-lg">
                {siteTitle} {!logoSrc || !common?.siteTitle ? "🇩🇪❤️" : ""}
              </span>
            </div>
            <p className="text-sm opacity-80">Học tiếng Đức bằng tình yêu.</p>
          </div>

          <div className="flex items-center gap-4">
            {socials.facebook ? (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <Facebook className="w-5 h-5" />
              </a>
            ) : null}
            {socials.instagram ? (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <Instagram className="w-5 h-5" />
              </a>
            ) : null}
            {socials.youtube ? (
              <a
                href={socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <Youtube className="w-5 h-5" />
              </a>
            ) : null}
          </div>
        </div>

        <p className="text-center text-xs opacity-50 mt-6">
          {props.copyrightText ??
            common?.footer?.copyrightText ??
            `© ${new Date().getFullYear()} ${siteTitle} – Thu Trang Nguyen. Alle Rechte vorbehalten.`}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
