import { Video, Users, Clock, MessageCircle, BookOpen, Target } from "lucide-react";

const highlights = [
  {
    icon: Video,
    title: "Tài liệu & Video trọn đời",
    description:
      "Bài giảng được thâu lại (Video) và tài liệu văn bản MIỄN PHÍ. Học viên sở hữu tài liệu mãi mãi để ôn tập bất cứ lúc nào.",
  },
  {
    icon: Users,
    title: "Mô hình Nhóm nhỏ thực hành",
    description:
      "Học lý thuyết chung, sau đó chia nhóm nhỏ để thực hành và làm bài tập với người hướng dẫn. Đông vui nhưng hiệu quả cao.",
  },
  {
    icon: Clock,
    title: "Thời gian học tối ưu",
    description:
      "Khung giờ cố định 21-23h. Thời lượng mỗi buổi thường được tặng thêm 15-20 phút vì sự say mê của cả lớp.",
  },
  {
    icon: MessageCircle,
    title: "90% Thực hành",
    description:
      "Trên lớp tiếp cận 10% kiến thức mới, 90% còn lại là thực hành, bài tập và luyện nói cùng Partner. 'Mưa dầm thấm lâu'.",
  },
  {
    icon: BookOpen,
    title: "Giáo trình & Lộ trình",
    description:
      "Giáo trình 'Deutsch Intensiv' (Klett) tập trung Nghe-Nói. 1 trình độ chia 2 khóa, bám sát năng lực học viên, không chạy giáo án.",
  },
  {
    icon: Target,
    title: "Lộ trình 1 năm đạt B1",
    description:
      "Với người học đúng, đủ, đều, trung bình 1 năm sẽ đạt trình độ B1 và khả năng giao tiếp cơ bản.",
  },
];

const ProgramHighlights = () => {
  return (
    <section className="py-16 md:py-24 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
            Điểm khác biệt tại DEUTSCH LIEBE
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Những điều quan trọng học viên cần biết để chinh phục tiếng Đức hiệu quả
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {highlights.map((item, i) => (
            <div
              key={i}
              className="bg-background rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center bg-accent/30 rounded-2xl p-6 md:p-8 max-w-3xl mx-auto border border-accent">
          <p className="text-foreground italic font-medium">
            "Khi chúng ta có mục tiêu rõ ràng + có cộng đồng + nhiều người hỗ trợ thì chúng ta sẽ có
            cách để chinh phục ngôn ngữ này."
          </p>
          <p className="text-primary font-bold mt-2">— Thu Trang</p>
        </div>
      </div>
    </section>
  );
};

export default ProgramHighlights;
