import { Button } from "@/components/ui/button";

const StickyNav = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <span className="font-bold text-lg tracking-tight">
          DEUTSCH LIEBE <span className="inline-block">🇩🇪❤️</span>
        </span>
        <Button variant="hero" size="sm" onClick={scrollToForm}>
          Nhận tư vấn
        </Button>
      </div>
    </nav>
  );
};

export default StickyNav;
