const testimonials = [
  { context: "Đi sở ngoại kiều", before: "Phải nhờ bạn đi cùng phiên dịch mỗi lần", after: "Tự đi sở, tự trả lời được các câu hỏi cơ bản" },
  { context: "Đi bác sĩ", before: "Không diễn tả được triệu chứng, sợ hiểu sai", after: "Tự mô tả bệnh và hiểu hướng dẫn của bác sĩ" },
  { context: "Đi làm", before: "Đồng nghiệp nói chuyện, mình chỉ biết cười", after: "Tham gia được hội thoại đơn giản với đồng nghiệp" },
  { context: "Giao tiếp hàng ngày", before: "Sợ nghe điện thoại, sợ gọi đặt lịch", after: "Tự gọi điện đặt lịch, nghe hiểu được ý chính" },
  { context: "Thi chứng chỉ A1", before: "Học mãi không tự tin thi", after: "Đậu A1 Prüfung sau 3 tháng học cùng Trang" },
  { context: "Mới sang Đức", before: "Không biết bắt đầu từ đâu, hoang mang", after: "Có lộ trình rõ ràng, mỗi ngày tự tin hơn một chút" },
];

const TestimonialsSection = () => (
  <section className="py-16 md:py-24 bg-card">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
          Kết quả từ học viên
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm">
          (Nội dung minh hoạ — placeholder cho testimonials thật từ học viên)
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-background rounded-2xl p-5 card-shadow border border-border space-y-3">
            <span className="inline-block bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
              {t.context}
            </span>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <span className="font-semibold text-destructive">Trước:</span> {t.before}
              </p>
              <p className="text-foreground">
                <span className="font-semibold text-primary">Sau:</span> {t.after}
              </p>
            </div>
            <p className="text-xs text-muted-foreground italic">— Học viên (ẩn danh)</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
