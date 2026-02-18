import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/landing/Footer";

const Contact = () => {
  const facebookPostUrl =
    "https://www.facebook.com/story.php?story_fbid=2293206234488890&id=100013986075589&rdid=pnTrVvQOpADu2foh#";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link
            to="/"
            className="font-bold text-lg tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <div className="font-bold">
            DEUTSCH LIEBE <span className="inline-block">🇩🇪❤️</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground">
              Liên hệ & Tư vấn
            </h1>
            <p className="text-xl text-muted-foreground">
              Cách nhanh nhất để kết nối với Trang và nhận tư vấn lộ trình học phù hợp.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 md:p-10 card-shadow border border-border space-y-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">Hướng dẫn đăng ký tư vấn</h2>
              <p className="text-muted-foreground">
                Để tránh tin nhắn bị trôi hoặc rơi vào tin nhắn chờ (Spam), các bạn vui lòng làm
                theo hướng dẫn dưới đây nhé!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center bg-accent/30 rounded-xl p-6">
              <div className="space-y-4 order-2 md:order-1">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Truy cập bài viết</h3>
                    <p className="text-sm text-muted-foreground">
                      Nhấn vào nút bên dưới để mở bài viết trên Facebook.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Để lại bình luận</h3>
                    <p className="text-sm text-muted-foreground">
                      Comment nội dung như <strong>"Tư vấn"</strong> hoặc{" "}
                      <strong>"Quan tâm"</strong> dưới bài viết.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Trang sẽ nhắn tin cho bạn</h3>
                    <p className="text-sm text-muted-foreground">
                      Mình sẽ chủ động Inbox để tư vấn kỹ hơn cho bạn ngay khi thấy bình luận.
                    </p>
                  </div>
                </div>
              </div>

              <div className="order-1 md:order-2 bg-background rounded-xl p-2 shadow-sm border border-border/50">
                <img
                  src="/comment-guide.png"
                  alt="Hướng dẫn comment Facebook"
                  className="w-full h-auto rounded-lg"
                />
                <p className="text-xs text-center text-muted-foreground mt-2 italic">
                  Minh họa cách bình luận
                </p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <Button
                asChild
                size="xl"
                className="w-full md:w-auto font-bold text-lg h-14 px-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                <a href={facebookPostUrl} target="_blank" rel="noopener noreferrer">
                  Đến bài viết Facebook ngay →
                </a>
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">*Link sẽ mở trong tab mới</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
