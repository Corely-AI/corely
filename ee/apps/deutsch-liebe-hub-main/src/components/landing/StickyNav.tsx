import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const StickyNav = () => {
  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <span className="font-bold text-lg tracking-tight">
          DEUTSCH LIEBE <span className="inline-block">🇩🇪❤️</span>
        </span>
        <Button variant="hero" size="sm" asChild>
          <Link to="/contact">Nhận tư vấn</Link>
        </Button>
      </div>
    </nav>
  );
};

export default StickyNav;
