import { Users, Heart, MessageCircle, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GroupLearningSection = () => {
  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Phương pháp đặc biệt tại Deutsch Liebe</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight">
            Đừng học 1:1 <br className="hidden md:block" />
            <span className="text-primary">Hãy học theo nhóm!</span>
          </h2>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Điều mà chưa một trung tâm nào làm được như{" "}
            <span className="text-foreground font-bold">DEUTSCH LIEBE</span> 🇩🇪❤️
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left Column: Philosophy */}
          <div className="space-y-8">
            <div className="bg-card rounded-2xl p-8 card-shadow border border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Users className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                Hơn cả một lớp học
              </h3>
              <p className="text-foreground/80 leading-relaxed mb-6">
                Mỗi lớp học ở DEUTSCH LIEBE không chỉ là nơi học tiếng Đức – mà là một{" "}
                <span className="font-bold text-primary">cộng đồng nhỏ</span> đầy năng lượng, niềm
                vui và sự gắn kết.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                    1
                  </div>
                  <p className="pt-1">
                    Có lớp nhanh, có lớp chậm, nhưng{" "}
                    <span className="font-bold">tất cả cùng đi với nhau</span>, không ai bị bỏ lại.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                    2
                  </div>
                  <p className="pt-1">
                    Người học nhanh <span className="font-bold">kéo</span> người học chậm.
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                    3
                  </div>
                  <p className="pt-1">
                    Người học chậm được tiếp thêm <span className="font-bold">động lực</span> từ cả
                    nhóm.
                  </p>
                </li>
              </ul>
            </div>

            <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <p className="text-center font-medium italic text-foreground/80">
                "Cả lớp học nhóm – luyện nói – sửa lỗi – động viên nhau mỗi ngày."
              </p>
            </div>
          </div>

          {/* Right Column: Comparison */}
          <div className="space-y-8">
            <div className="grid gap-6">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-all">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                  <XCircle className="w-5 h-5" />
                  Vì sao mình KHÔNG khuyến khích 1:1?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Học ngoại ngữ không phải chỉ để thi lấy bằng. Học 1:1 thiếu đi áp lực tích cực và
                  môi trường giao tiếp đa dạng.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-md border-l-4 border-l-primary relative">
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-6 h-6" />
                  Giá trị của học nhóm
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Môi trường giao tiếp thật</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Áp lực tích cực để nói</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">
                      Cơ hội nghe nhiều giọng, nhiều cách diễn đạt
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Tinh thần đồng đội – không bỏ cuộc</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center md:text-left pt-4">
              <h4 className="font-bold text-lg mb-2">Học ngoại ngữ là để:</h4>
              <div className="flex flex-wrap gap-2">
                {["Dám mở miệng nói", "Dám sai", "Dám sửa", "Giao tiếp thật"].map((item, i) => (
                  <span
                    key={i}
                    className="bg-accent px-3 py-1 rounded-full text-sm font-medium border border-accent-foreground/10"
                  >
                    ✅ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto bg-foreground text-background rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Bạn vẫn "câm nín" khi gặp người Đức?
          </h3>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Nếu bạn sợ nói sai, học mãi không giao tiếp được... Hãy về với{" "}
            <span className="font-bold text-primary">DEUTSCH LIEBE</span>.
            <br />
            Học theo nhóm – Giao tiếp thật – Tiến bộ thật.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="xl" variant="secondary" asChild className="min-w-[200px] font-bold">
              <Link to="/contact">Đăng ký tư vấn ngay</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm opacity-60 font-medium tracking-wide upercase">
            "CHÚNG TA SẼ KHÔNG HỌC MỘT MÌNH. CHÚNG TA ĐI CÙNG NHAU."
          </p>
        </div>
      </div>
    </section>
  );
};

export default GroupLearningSection;
