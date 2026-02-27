import React from "react";
import type { WebsiteSiteSettings } from "@corely/contracts";
import {
  TutoringCoursePackagesView,
  TutoringFaqView,
  TutoringFooterView,
  TutoringGroupLearningView,
  TutoringHeroView,
  TutoringInstructorView,
  TutoringLeadFormView,
  TutoringMethodView,
  TutoringPasView,
  TutoringProgramHighlightsView,
  TutoringScholarshipView,
  TutoringScheduleView,
  TutoringSocialProofView,
  TutoringStickyNavView,
  TutoringTestimonialsView,
} from "@corely/website-blocks";
import { buildPublicFileUrl } from "@/lib/public-api";
import {
  type CommonBlockProps,
  type RuntimeProps,
  normalizeMenuItems,
  resolveInternalHref,
  resolveMenu,
} from "./template-runtime-shared";

type StickyNavProps = CommonBlockProps &
  RuntimeProps & {
    navLabel?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };

type HeroSectionProps = CommonBlockProps &
  RuntimeProps & {
    headline?: string;
    subheadline?: string;
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
  };

type SectionHeadingProps = CommonBlockProps & RuntimeProps & { heading?: string };
type PASSectionProps = CommonBlockProps &
  RuntimeProps & {
    problem?: string;
    agitation?: string;
    solution?: string;
  };
type LeadFormProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    formId?: string;
    submitLabel?: string;
  };
type FooterProps = CommonBlockProps & RuntimeProps & { copyrightText?: string };

const heroBullets = [
  "Phát âm chuẩn ngay từ đầu -> người Đức nghe hiểu",
  "Phản xạ hội thoại đời sống thật (Alltag)",
  'Học lên A1/A2/B1 vững nền, không "gãy"',
  "Có bài tập, feedback, cộng đồng hỗ trợ",
];

const methodSteps = [
  {
    title: "Test trình độ & mục tiêu",
    description:
      "Xác định level hiện tại (A1/A2/B1) và mục tiêu: đi làm, đi học hay định cư. Trang tư vấn lộ trình cá nhân.",
  },
  {
    title: "Lộ trình + Luyện Aussprache",
    description:
      "Bắt đầu từ phát âm chuẩn (Aussprache). Nền tảng vững - nghe rõ hơn, nói tự tin hơn.",
  },
  {
    title: "Thực hành hội thoại + Feedback",
    description: "Luyện phản xạ giao tiếp đời sống thật. Sửa lỗi trực tiếp, có bài tập mỗi buổi.",
  },
];

const highlightItems = [
  {
    title: "Tài liệu & Video trọn đời",
    description:
      "Bài giảng được thâu lại (Video) và tài liệu văn bản MIỄN PHÍ. Học viên sở hữu tài liệu mãi mãi để ôn tập bất cứ lúc nào.",
  },
  {
    title: "Mô hình Nhóm nhỏ thực hành",
    description:
      "Học lý thuyết chung, sau đó chia nhóm nhỏ để thực hành và làm bài tập với người hướng dẫn. Đông vui nhưng hiệu quả cao.",
  },
  {
    title: "Thời gian học tối ưu",
    description:
      "Khung giờ cố định 21-23h. Thời lượng mỗi buổi thường được tặng thêm 15-20 phút vì sự say mê của cả lớp.",
  },
  {
    title: "90% Thực hành",
    description:
      "Trên lớp tiếp cận 10% kiến thức mới, 90% còn lại là thực hành, bài tập và luyện nói cùng Partner. Mưa dầm thấm lâu.",
  },
  {
    title: "Giáo trình & Lộ trình",
    description:
      "Giáo trình Deutsch Intensiv (Klett) tập trung Nghe-Nói. 1 trình độ chia 2 khóa, bám sát năng lực học viên, không chạy giáo án.",
  },
  {
    title: "Lộ trình 1 năm đạt B1",
    description:
      "Với người học đúng, đủ, đều, trung bình 1 năm sẽ đạt trình độ B1 và khả năng giao tiếp cơ bản.",
  },
];

const comboItems = [
  {
    title: "Combo 1",
    subtitle: "Phát âm + A1.1",
    sessions: "25 buổi",
    suitableFor: "Người mới bắt đầu, mất gốc",
    outcomes: [
      "Phát âm chuẩn cơ bản",
      "Giao tiếp chào hỏi, tự giới thiệu",
      "Hiểu câu đơn giản trong Alltag",
    ],
  },
  {
    title: "Combo 2",
    subtitle: "Phát âm + A1.2 + Ôn thi A1",
    sessions: "34 buổi",
    suitableFor: "Muốn thi chứng chỉ A1, đi làm cơ bản",
    outcomes: [
      "Phát âm vững + nghe hiểu tốt hơn",
      "Tự tin đi sở, bác sĩ đơn giản",
      "Ôn thi A1 Prüfung bài bản",
    ],
    highlight: true,
  },
  {
    title: "Combo 3",
    subtitle: "Phát âm + A2.2 / B1",
    sessions: "29 buổi",
    suitableFor: "Đã có nền A1-A2, muốn lên trình",
    outcomes: [
      "Giao tiếp phức tạp hơn (đi làm, hội thoại)",
      "Phản xạ nhanh, nói tự nhiên hơn",
      "Chuẩn bị thi B1 nếu cần",
    ],
  },
];

const testimonialItems = [
  {
    context: "Đi sở ngoại kiều",
    before: "Phải nhờ bạn đi cùng phiên dịch mỗi lần",
    after: "Tự đi sở, tự trả lời được các câu hỏi cơ bản",
  },
  {
    context: "Đi bác sĩ",
    before: "Không diễn tả được triệu chứng, sợ hiểu sai",
    after: "Tự mô tả bệnh và hiểu hướng dẫn của bác sĩ",
  },
  {
    context: "Đi làm",
    before: "Đồng nghiệp nói chuyện, mình chỉ biết cười",
    after: "Tham gia được hội thoại đơn giản với đồng nghiệp",
  },
  {
    context: "Giao tiếp hàng ngày",
    before: "Sợ nghe điện thoại, sợ gọi đặt lịch",
    after: "Tự gọi điện đặt lịch, nghe hiểu được ý chính",
  },
  {
    context: "Thi chứng chỉ A1",
    before: "Học mãi không tự tin thi",
    after: "Đậu A1 Prüfung sau 3 tháng học cùng Trang",
  },
  {
    context: "Mới sang Đức",
    before: "Không biết bắt đầu từ đâu, hoang mang",
    after: "Có lộ trình rõ ràng, mỗi ngày tự tin hơn một chút",
  },
];

const faqItems = [
  {
    id: "faq-1",
    question: "Học online có hiệu quả không?",
    answer: "Có. Lớp học tập trung thực hành giao tiếp và feedback trực tiếp.",
  },
  {
    id: "faq-2",
    question: "Mất gốc có theo được không?",
    answer: "Được. Lộ trình bắt đầu từ phát âm và cân bằng tốc độ cho cả nhóm.",
  },
  {
    id: "faq-3",
    question: "Học xong có thi chứng chỉ được không?",
    answer: "Có. Có hướng dẫn ôn thi A1/B1 khi bạn đạt nền tảng giao tiếp phù hợp.",
  },
];

const resolveCommon = (settings: WebsiteSiteSettings | undefined) => settings?.common;

export const StickyNav = (props: StickyNavProps) => {
  const common = resolveCommon(props.settings);
  const headerMenu = resolveMenu(props.menus, "header");
  const headerItems = normalizeMenuItems(headerMenu?.itemsJson);
  const navItems =
    headerItems.length > 0
      ? headerItems.slice(0, 3).map((item) => ({
          label: item.label,
          href: resolveInternalHref(item.href, props.basePath),
        }))
      : [
          {
            label: "Điểm khác biệt",
            href: resolveInternalHref("/#diem-khac-biet", props.basePath),
          },
          { label: "Đừng học 1:1", href: resolveInternalHref("/#dung-hoc-1-1", props.basePath) },
          { label: "Wall of Love", href: resolveInternalHref("/wall-of-love", props.basePath) },
        ];
  const siteTitle = props.navLabel ?? common?.siteTitle ?? "DEUTSCH LIEBE";
  const logoSrc =
    common?.logo?.url ??
    (common?.logo?.fileId ? buildPublicFileUrl(common.logo.fileId) : undefined);

  return (
    <TutoringStickyNavView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      siteTitle={siteTitle}
      homeHref={resolveInternalHref("/", props.basePath)}
      logoSrc={logoSrc}
      navItems={navItems}
      ctaLabel={props.ctaLabel ?? common?.header?.cta?.label ?? "Nhận tư vấn"}
      ctaHref={resolveInternalHref(
        props.ctaHref ?? common?.header?.cta?.href ?? "/contact",
        props.basePath
      )}
    />
  );
};

export const HeroSection = (props: HeroSectionProps) => (
  <TutoringHeroView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    badgeLabel="🇩🇪 Online qua Zoom · Cho người Việt ở Đức"
    headline={
      props.headline ?? "Học tiếng Đức để dùng được ngay - tự tin giao tiếp từ phát âm chuẩn."
    }
    subheadline={
      props.subheadline ??
      "Dành cho người Việt ở Đức: đi sở, đi bác sĩ, đi làm… không còn sợ nói sai. Lộ trình rõ ràng, luyện phản xạ thực tế, học online qua Zoom."
    }
    bullets={heroBullets}
    primaryCtaLabel={props.primaryCtaLabel ?? "Nhận tư vấn & xếp lớp"}
    primaryCtaHref={resolveInternalHref(props.primaryCtaHref ?? "/contact", props.basePath)}
    secondaryCtaLabel="Xem Combo phù hợp"
    secondaryCtaHref={resolveInternalHref("/#packages", props.basePath)}
    heroImageSrc="/trang.png"
    heroImageAlt="Trang In Berlin – Giảng viên tiếng Đức online"
  />
);

export const SocialProofStrip = (props: SectionHeadingProps) => {
  const socials = props.settings?.common.socials ?? {};
  return (
    <TutoringSocialProofView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      heading={props.heading ?? "Cộng đồng học viên yêu tiếng Đức"}
      chips={["Học online linh hoạt", "Lộ trình rõ ràng", "Tập trung giao tiếp"]}
      socials={{
        facebook: socials.facebook ?? "https://facebook.com/ThuTrangNguyenGermany",
        instagram: socials.instagram ?? "https://instagram.com/tranginberlin",
      }}
    />
  );
};

export const PASSection = (props: PASSectionProps) => (
  <TutoringPasView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading="Bạn có thấy mình ở đây không?"
    problem={
      props.problem ?? "😰 Nghe người Đức nói mà não đứng hình - họ nói nhanh quá, không bắt kịp."
    }
    agitation={
      props.agitation ??
      "😶 Muốn trả lời nhưng sợ phát âm sai, sợ mở miệng ra là người ta không hiểu."
    }
    solution={
      props.solution ??
      "😣 Đi sở, đi bác sĩ, đi làm… phải nhờ người đi cùng - ngại, phiền, tốn tiền."
    }
    summary="Vấn đề không phải bạn không thông minh — mà là bạn chưa được học đúng cách, nhất là phát âm. Khi phát âm chuẩn, bạn nghe rõ hơn, nói tự tin hơn, và mọi thứ bắt đầu thông."
    ctaLabel="Bắt đầu học đúng cách →"
    ctaHref={resolveInternalHref("/contact", props.basePath)}
  />
);

export const MethodSection = (props: SectionHeadingProps) => (
  <TutoringMethodView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Cách học cùng Trang"}
    subheading="3 bước đơn giản để bắt đầu hành trình tiếng Đức dùng được"
    steps={methodSteps}
  />
);

export const ProgramHighlights = (props: SectionHeadingProps) => (
  <TutoringProgramHighlightsView
    anchorId={props.anchorId ?? "diem-khac-biet"}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Điểm khác biệt tại DEUTSCH LIEBE"}
    subheading="Những điều quan trọng học viên cần biết để chinh phục tiếng Đức hiệu quả"
    items={highlightItems}
    quote='"Khi chúng ta có mục tiêu rõ ràng + có cộng đồng + nhiều người hỗ trợ thì chúng ta sẽ có cách để chinh phục ngôn ngữ này."'
    quoteAuthor="— Thu Trang"
  />
);

export const GroupLearningSection = (props: SectionHeadingProps) => (
  <TutoringGroupLearningView
    anchorId={props.anchorId ?? "dung-hoc-1-1"}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Đừng học 1:1 — Hãy học theo nhóm!"}
    summary="Điều mà chưa một trung tâm nào làm được như DEUTSCH LIEBE 🇩🇪❤️"
    communityPoints={[
      "Có lớp nhanh, có lớp chậm, nhưng tất cả cùng đi với nhau, không ai bị bỏ lại.",
      "Người học nhanh kéo người học chậm.",
      "Người học chậm được tiếp thêm động lực từ cả nhóm.",
    ]}
    reasons={[
      "Học ngoại ngữ không phải chỉ để thi lấy bằng.",
      "Học 1:1 thiếu đi áp lực tích cực và môi trường giao tiếp đa dạng.",
      "Học nhóm giúp phản xạ thật và tinh thần đồng đội.",
    ]}
    labels={["Dám mở miệng nói", "Dám sai", "Dám sửa", "Giao tiếp thật"]}
    closingHeading="Bạn vẫn câm nín khi gặp người Đức?"
    closingBody="Nếu bạn sợ nói sai, học mãi không giao tiếp được... Hãy về với DEUTSCH LIEBE. Học theo nhóm – Giao tiếp thật – Tiến bộ thật."
    ctaLabel="Đăng ký tư vấn ngay"
    ctaHref={resolveInternalHref("/contact", props.basePath)}
    footerQuote='"CHÚNG TA SẼ KHÔNG HỌC MỘT MÌNH. CHÚNG TA ĐI CÙNG NHAU."'
  />
);

export const CoursePackages = (props: SectionHeadingProps) => (
  <TutoringCoursePackagesView
    anchorId={props.anchorId ?? "packages"}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Chọn Combo phù hợp với bạn"}
    subheading="Mỗi combo được thiết kế theo mục tiêu cụ thể — bắt đầu từ phát âm, kết thúc bằng tự tin."
    combos={comboItems}
    ctaLabel="Chọn combo này"
    ctaHref={resolveInternalHref("/contact", props.basePath)}
  />
);

export const ScheduleSection = (props: SectionHeadingProps) => (
  <TutoringScheduleView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Lịch khai giảng sắp tới"}
    dateLabel="18.02.2026"
    timeLabel="21:00 - 23:15 (giờ Đức)"
    note="Online qua Zoom · Tối thứ 2, 4, 6 hàng tuần"
    ctaLabel="Giữ chỗ lớp khai giảng"
    ctaHref={resolveInternalHref("/contact", props.basePath)}
    footerNote="Không hợp lịch? Để lại thông tin, Trang sẽ xếp lớp phù hợp cho bạn."
  />
);

export const InstructorSection = (props: SectionHeadingProps) => (
  <TutoringInstructorView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Về giảng viên: Trang In Berlin"}
    name="Thu Trang Nguyen"
    bio="Sống và làm việc tại Berlin. Phong cách dạy: gần gũi, thực tế, tập trung giúp bạn nói được chứ không chỉ biết ngữ pháp. Trang tin rằng: khi bạn yêu tiếng Đức, bạn sẽ học nhanh hơn ❤️"
    principles={["Chuẩn phát âm", "Giao tiếp đời sống", "Nâng trình có hệ thống"]}
  />
);

export const TestimonialsSection = (props: SectionHeadingProps) => (
  <TutoringTestimonialsView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Kết quả từ học viên"}
    subheading="(Nội dung minh hoạ — placeholder cho testimonials thật từ học viên)"
    items={testimonialItems}
  />
);

export const ScholarshipSection = (props: SectionHeadingProps) => (
  <TutoringScholarshipView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Học bổng & Ưu đãi"}
    body='Deutsch Liebe có chương trình ghi nhận nỗ lực học tập theo từng đợt. Học viên chăm chỉ, tiến bộ rõ rệt sẽ được ưu đãi khoá tiếp theo. Đây là cách Trang khuyến khích tinh thần "học bằng tình yêu" ❤️'
    ctaLabel="Hỏi về học bổng / ưu đãi"
    ctaHref={resolveInternalHref("/contact", props.basePath)}
  />
);

export const FAQSection = (props: SectionHeadingProps) => (
  <TutoringFaqView
    anchorId={props.anchorId}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Câu hỏi thường gặp"}
    items={faqItems}
  />
);

export const LeadForm = (props: LeadFormProps) => (
  <TutoringLeadFormView
    anchorId={props.anchorId ?? "lead-form"}
    className={props.className}
    hiddenOn={props.hiddenOn}
    variant={props.variant}
    heading={props.heading ?? "Nhận tư vấn miễn phí"}
    subheading="Điền thông tin — Trang sẽ liên hệ và test trình độ cho bạn."
    submitLabel={props.submitLabel ?? "Nhận tư vấn miễn phí"}
    successHeading="Đã nhận thông tin!"
    successBody="Trang sẽ liên hệ trong thời gian sớm nhất để test trình độ và tư vấn combo phù hợp. Trong lúc chờ, bạn có thể inbox trực tiếp để giữ chỗ."
    successCtaLabel="Inbox ngay"
    successCtaHref="https://m.me/ThuTrangNguyenGermany"
    fallbackCtaLabel="Liên hệ trực tiếp qua Messenger"
    fallbackCtaHref="https://m.me/ThuTrangNguyenGermany"
    packagesAnchorHref={resolveInternalHref("/#packages", props.basePath)}
    consentLabel="Tôi đồng ý với Chính sách bảo mật (Datenschutzerklärung) và cho phép liên hệ tư vấn."
  />
);

export const Footer = (props: FooterProps) => {
  const common = resolveCommon(props.settings);
  const siteTitle = common?.siteTitle ?? "DEUTSCH LIEBE";
  const logoSrc =
    common?.logo?.url ??
    (common?.logo?.fileId ? buildPublicFileUrl(common.logo.fileId) : undefined);
  const year = new Date().getFullYear();

  return (
    <TutoringFooterView
      anchorId={props.anchorId}
      className={props.className}
      hiddenOn={props.hiddenOn}
      variant={props.variant}
      siteTitle={siteTitle}
      logoSrc={logoSrc}
      subtitle="Học tiếng Đức bằng tình yêu."
      socials={{
        facebook: common?.socials?.facebook || "https://www.facebook.com/TrangBGerman",
        instagram: common?.socials?.instagram || "https://www.instagram.com/ThuTrangNguyenGermany",
        youtube: common?.socials?.youtube || "https://www.youtube.com/@TrangInBerlin",
      }}
      copyrightText={
        props.copyrightText ??
        common?.footer?.copyrightText ??
        `© ${year} ${siteTitle} – Thu Trang Nguyen. Alle Rechte vorbehalten.`
      }
    />
  );
};
