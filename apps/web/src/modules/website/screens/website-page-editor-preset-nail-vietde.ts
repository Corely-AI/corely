import type { WebsitePageContent } from "@corely/contracts";

export const buildNailStudioVietDePresetContent = (): WebsitePageContent => ({
  templateKey: "landing.nailstudio.v1",
  templateVersion: "1",
  seoOverride: {
    title: "Corely One | Quản lý tiệm nails ở Đức: Booking, Kasse, Kassenbuch, kho và báo cáo",
    description:
      "Nền tảng all-in-one cho chủ tiệm nails người Việt ở Đức: đặt lịch, POS/Kasse, Kassenbuch theo ngày, nhắc tồn kho và website local SEO.",
    ogTitle: "Corely One cho tiệm nails người Việt ở Đức",
    ogDescription:
      "Giảm no-show, chốt quỹ theo ngày, theo dõi vật tư và triển khai website đặt lịch nhanh.",
  },
  blocks: [
    {
      id: "sticky-nav",
      type: "stickyNav",
      enabled: true,
      props: {
        navLabel: "Corely One",
        ctaLabel: "Đặt lịch demo 15 phút",
        ctaHref: "#lead-form",
      },
    },
    {
      id: "hero",
      type: "hero",
      enabled: true,
      props: {
        eyebrow: "ERP cho tiệm nails người Việt tại Đức",
        headline:
          "Corely One - Quản lý tiệm nails ở Đức gọn trong 1 hệ thống: đặt lịch, Kasse, Kassenbuch, kho và báo cáo.",
        subheadline:
          "Giảm no-show, bán add-on dễ hơn, kiểm soát tiền mặt rõ ràng theo ngày và luôn biết vật tư sắp hết để đặt kịp.",
        primaryCtaLabel: "Đặt lịch demo 15 phút",
        primaryCtaHref: "#lead-form",
        secondaryCtaLabel: "Nhận audit miễn phí",
        secondaryCtaHref: "#booking-examples",
        highlights: [
          "Booking + POS + Kassenbuch trong 1 luồng",
          "GoBD-friendly: đầy đủ, kịp thời, truy vết thay đổi",
          "Có duyệt và audit trail cho giao dịch và mua hàng",
        ],
      },
    },
    {
      id: "pain-points",
      type: "servicesGrid",
      enabled: true,
      props: {
        heading: "Vấn đề phổ biến của chủ tiệm nails người Việt ở Đức",
        intro:
          "Nếu booking, thu chi và vật tư đang bị tách rời, doanh thu sẽ khó ổn định và đối soát cuối ngày rất mệt.",
        items: [
          {
            name: "Lịch hẹn rối rắm",
            description: "Đặt lịch qua IG, WhatsApp, điện thoại dễ sót lịch hoặc trùng lịch.",
          },
          {
            name: "Thu chi tiền mặt khó khớp",
            description: "Cuối ngày khó đối chiếu nếu không có Kassenbuch/Kassenbericht rõ ràng.",
          },
          {
            name: "Chứng từ chi phí thất lạc",
            description: "Hóa đơn nhỏ lẻ mua tại dm/Rossmann dễ mất nếu ghi tay rồi lưu riêng.",
          },
          {
            name: "Vật tư sắp hết mới biết",
            description: "Gel, tips, bông, đồ khử trùng hết đột ngột gây gián đoạn dịch vụ.",
          },
        ],
      },
    },
    {
      id: "core-features",
      type: "servicesGrid",
      enabled: true,
      props: {
        heading: "Corely One giải quyết thế nào",
        intro: "Toàn bộ quy trình vận hành cho tiệm nails trong một màn hình điều phối.",
        items: [
          {
            name: "Booking & CRM khách",
            description: "Quản lý thời lượng dịch vụ, buffer, đặt cọc, ghi chú sở thích và dị ứng.",
          },
          {
            name: "Kasse/POS",
            description:
              "Thu tiền mặt/thẻ, tip, gói dịch vụ, gift card và báo cáo theo thợ/dịch vụ.",
          },
          {
            name: "Kassenbuch theo ngày",
            description: "Anfangsbestand -> Einnahmen -> Ausgaben -> Endbestand, kèm Beleg.",
          },
          {
            name: "Kho & mua hàng có duyệt",
            description:
              "Cảnh báo tồn tối thiểu, tạo đề xuất đặt hàng, owner phê duyệt và lưu log.",
          },
          {
            name: "Báo cáo dễ đọc",
            description: "Doanh thu ngày/tuần, top dịch vụ, top add-on và năng suất theo thợ.",
          },
        ],
      },
    },
    {
      id: "booking-examples",
      type: "bookingSteps",
      enabled: true,
      props: {
        heading: "3 tình huống vận hành thực tế (30-60 giây xử lý)",
        intro: "Dùng để huấn luyện team và chuẩn hóa thao tác mỗi ngày.",
        steps: [
          {
            title: "Mua vật tư nhỏ lẻ tại dm/Rossmann",
            description:
              "Chụp hóa đơn -> chọn Ausgabe (cash) -> nhập số tiền + ghi chú -> vào Kassenbuch đúng ngày.",
          },
          {
            title: "Nhập invoice nhà cung cấp",
            description:
              "Tải PDF/ảnh -> gắn tag Gel/Tips -> lưu chứng từ chi phí -> xuất file gửi Steuerberater.",
          },
          {
            title: "Cảnh báo vật tư sắp hết",
            description:
              "Base coat dưới ngưỡng -> tạo đề xuất đặt hàng -> owner Approve -> hệ thống lưu audit trail.",
          },
        ],
        ctaLabel: "Nhận audit quy trình miễn phí",
        ctaHref: "#lead-form",
      },
    },
    {
      id: "website-development",
      type: "signatureSets",
      enabled: true,
      props: {
        heading: "Website development cho chủ tiệm người Việt ở Đức",
        intro: "Làm website để kéo khách địa phương và chốt lịch nhanh trên mobile.",
        sets: [
          {
            name: "Website 1-5 trang",
            description: "Home, Services/Preise, Gallery, Kontakt, Impressum/Datenschutz.",
            badge: "Core package",
          },
          {
            name: "Song ngữ Việt/Đức",
            description: "Nội dung theo đối tượng Việt tại Đức, có CTA Termin buchen rõ ràng.",
          },
          {
            name: "Local SEO + tracking",
            description: "Tối ưu khu vực, Google Maps, review, click call/WhatsApp/booking.",
          },
        ],
        ctaLabel: "Nhận mockup website miễn phí",
        ctaHref: "#lead-form",
      },
    },
    {
      id: "packages",
      type: "priceMenu",
      enabled: true,
      props: {
        heading: "3 gói triển khai",
        intro: "Chọn theo mức độ vận hành hiện tại của tiệm.",
        categories: [
          {
            title: "Starter - Đặt lịch + Website",
            items: [
              {
                name: "Booking + CRM cơ bản",
                duration: "Khởi tạo 3-5 ngày",
                priceFrom: "Liên hệ",
                note: "Website + đặt lịch + hồ sơ khách cơ bản",
              },
            ],
          },
          {
            title: "Growth - Kasse + Kassenbuch + Kho",
            items: [
              {
                name: "POS/Kasse + Kassenbuch + tồn kho",
                duration: "Khởi tạo 7-10 ngày",
                priceFrom: "Liên hệ",
                note: "Có workflow duyệt và audit trail",
              },
            ],
          },
          {
            title: "Multi-Studio - Chuỗi tiệm",
            items: [
              {
                name: "Đa chi nhánh + phân quyền + báo cáo tổng hợp",
                duration: "Theo scope",
                priceFrom: "Liên hệ",
              },
            ],
          },
        ],
      },
    },
    {
      id: "testimonials",
      type: "testimonials",
      enabled: true,
      props: {
        heading: "Phản hồi từ chủ tiệm",
        items: [
          { quote: "Từ khi có Kassenbuch theo ngày, đối chiếu cuối ngày nhanh hơn rất nhiều." },
          { quote: "Khách đặt lịch online rõ ràng, team không còn sót lịch như trước." },
          { quote: "Tồn kho có cảnh báo nên không bị hết gel vào cuối tuần." },
          { quote: "Báo cáo theo thợ giúp mình biết nên đẩy add-on nào để tăng doanh thu." },
          { quote: "Gửi chứng từ cho Steuerberater gọn gàng hơn vì đã có file xuất sẵn." },
          { quote: "Website mới giúp khách Đức tìm thấy tiệm dễ hơn và đặt lịch dễ hơn." },
        ],
      },
    },
    {
      id: "location-hours",
      type: "locationHours",
      enabled: true,
      props: {
        heading: "Liên hệ tư vấn triển khai",
        address: "Berlin Mitte (demo), Germany",
        phone: "+49 30 1234 5678",
        mapEmbedUrl: "https://maps.google.com/?q=Berlin+Mitte",
        hours: [
          { day: "Mon", open: "09:00", close: "18:00" },
          { day: "Tue", open: "09:00", close: "18:00" },
          { day: "Wed", open: "09:00", close: "18:00" },
          { day: "Thu", open: "09:00", close: "18:00" },
          { day: "Fri", open: "09:00", close: "18:00" },
          { day: "Sat", open: "09:00", close: "13:00" },
          { day: "Sun", open: "Closed", close: "Closed" },
        ],
        policies: [
          "Khuyến nghị chốt quỹ theo ngày (Kassensturz/Kassenbericht).",
          "Lưu đầy đủ Beleg cho giao dịch cash và chi phí vận hành.",
          "Nội dung tuân thủ mang tính hướng dẫn; cần xác nhận với Steuerberater.",
        ],
      },
    },
    {
      id: "faq",
      type: "faq",
      enabled: true,
      props: {
        heading: "Câu hỏi thường gặp",
        items: [
          {
            question: "Corely có thay thế tư vấn thuế/Steuerberater không?",
            answer:
              "Không. Corely giúp chuẩn hóa dữ liệu và quy trình; phần nghiệp vụ thuế cần được chốt với Steuerberater.",
          },
          {
            question: "Kassenbuch có cần chốt mỗi ngày không?",
            answer:
              "Để vận hành chắc chắn và để đối chiếu, nên duy trì kỷ luật ghi nhận thu-chi theo ngày và đối soát cuối ngày.",
          },
          {
            question: "Nếu tiệm đã dùng Kasse rồi thì sao?",
            answer:
              "Có thể kết nối quy trình hiện tại, bổ sung Kassenbuch, audit trail, kho và dashboard để quản lý tập trung.",
          },
          {
            question: "Website có cần Impressum/Datenschutz không?",
            answer:
              "Có. Gói website đã tính đến các trang cơ bản cho thị trường Đức và có thể tùy biến theo nhu cầu.",
          },
        ],
      },
    },
    {
      id: "lead-form",
      type: "leadForm",
      enabled: true,
      props: {
        anchorId: "lead-form",
        heading: "Đặt lịch demo 15 phút hoặc nhận audit miễn phí",
        submitLabel: "Nhận tư vấn ngay",
        note: "Để lại thông tin, đội ngũ sẽ liên hệ để đề xuất quy trình phù hợp cho tiệm của bạn.",
      },
    },
    {
      id: "footer",
      type: "footer",
      enabled: true,
      props: {
        copyrightText: "Copyright 2026 Corely One",
        links: [
          { label: "Dịch vụ", href: "#core-features" },
          { label: "Kassenbuch", href: "#booking-examples" },
          { label: "Website", href: "#website-development" },
          { label: "Liên hệ", href: "#lead-form" },
        ],
      },
    },
  ],
});
