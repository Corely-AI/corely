import { Facebook, Instagram } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground text-background py-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <p className="font-bold text-lg">DEUTSCH LIEBE 🇩🇪❤️</p>
          <p className="text-sm opacity-80">Học tiếng Đức bằng tình yêu.</p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://www.facebook.com/TrangBGerman"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <Facebook className="w-5 h-5" />
          </a>
          <a
            href="https://www.instagram.com/ThuTrangNguyenGermany"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <Instagram className="w-5 h-5" />
          </a>
        </div>
      </div>
      <p className="text-center text-xs opacity-50 mt-6">
        © 2026 Deutsch Liebe – Thu Trang Nguyen. Alle Rechte vorbehalten.
      </p>
    </div>
  </footer>
);

export default Footer;
