import React from "react";
import type { WebsiteBlock } from "@corely/contracts";
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
import { buildPublicFileUrl } from "@/lib/cms-api";
import { asNonEmptyString } from "./website-page-editor.utils";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asString = (value: unknown, fallback: string): string => asNonEmptyString(value) || fallback;

const toCombos = (
  value: unknown
): React.ComponentProps<typeof TutoringCoursePackagesView>["combos"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const title = asNonEmptyString(item.title);
      const subtitle = asNonEmptyString(item.subtitle);
      const sessions = asNonEmptyString(item.sessions);
      const suitableFor = asNonEmptyString(item.suitableFor);
      const outcomes = Array.isArray(item.outcomes)
        ? item.outcomes
            .map((entry) => asNonEmptyString(entry))
            .filter((entry): entry is string => Boolean(entry))
        : [];
      if (!title || !subtitle || !sessions || !suitableFor || outcomes.length === 0) {
        return null;
      }
      return {
        title,
        subtitle,
        sessions,
        suitableFor,
        outcomes,
        highlight: item.highlight === true,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

const toFaqItems = (value: unknown): React.ComponentProps<typeof TutoringFaqView>["items"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }
      const question = asNonEmptyString(item.question);
      const answer = asNonEmptyString(item.answer);
      if (!question || !answer) {
        return null;
      }
      return {
        id: asNonEmptyString(item.id) || `faq-${index + 1}`,
        question,
        answer,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

const toTestimonials = (
  value: unknown
): React.ComponentProps<typeof TutoringTestimonialsView>["items"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const context = asNonEmptyString(item.context);
      const before = asNonEmptyString(item.before);
      const after = asNonEmptyString(item.after);
      if (!context || !before || !after) {
        return null;
      }
      return { context, before, after };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const renderTutoringBlockPreview = (selectedBlock: WebsiteBlock | null): React.ReactNode => {
  if (!selectedBlock) {
    return null;
  }
  const props =
    selectedBlock.props && typeof selectedBlock.props === "object"
      ? (selectedBlock.props as Record<string, unknown>)
      : {};

  if (selectedBlock.type === "stickyNav") {
    const logoFileId = asNonEmptyString(props.logoFileId);
    return (
      <TutoringStickyNavView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        siteTitle={asString(props.navLabel, "DEUTSCH LIEBE")}
        homeHref="/"
        logoSrc={logoFileId ? buildPublicFileUrl(logoFileId) : undefined}
        navItems={[
          { label: "Điểm khác biệt", href: "#diem-khac-biet" },
          { label: "Đừng học 1:1", href: "#dung-hoc-1-1" },
          { label: "Wall of Love", href: "/wall-of-love" },
        ]}
        ctaLabel={asString(props.ctaLabel, "Nhận tư vấn")}
        ctaHref={asString(props.ctaHref, "/contact")}
      />
    );
  }

  if (selectedBlock.type === "hero") {
    return (
      <TutoringHeroView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        badgeLabel="🇩🇪 Online qua Zoom · Cho người Việt ở Đức"
        headline={asString(
          props.headline,
          "Học tiếng Đức để dùng được ngay - tự tin giao tiếp từ phát âm chuẩn."
        )}
        subheadline={asString(
          props.subheadline,
          "Dành cho người Việt ở Đức: đi sở, đi bác sĩ, đi làm… không còn sợ nói sai."
        )}
        bullets={[
          "Phát âm chuẩn ngay từ đầu",
          "Phản xạ hội thoại đời sống thật",
          "Có bài tập, feedback, cộng đồng hỗ trợ",
        ]}
        primaryCtaLabel={asString(props.primaryCtaLabel, "Nhận tư vấn & xếp lớp")}
        primaryCtaHref={asString(props.primaryCtaHref, "/contact")}
        secondaryCtaLabel={asString(props.secondaryCtaLabel, "Xem Combo phù hợp")}
        secondaryCtaHref={asString(props.secondaryCtaHref, "#packages")}
        heroImageSrc="/trang.png"
      />
    );
  }

  if (selectedBlock.type === "socialProof") {
    return (
      <TutoringSocialProofView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Cộng đồng học viên yêu tiếng Đức")}
        chips={["Học online linh hoạt", "Lộ trình rõ ràng", "Tập trung giao tiếp"]}
        socials={{
          facebook: "https://facebook.com/ThuTrangNguyenGermany",
          instagram: "https://instagram.com/tranginberlin",
        }}
      />
    );
  }

  if (selectedBlock.type === "pas") {
    return (
      <TutoringPasView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading="Bạn có thấy mình ở đây không?"
        problem={asString(props.problem, "😰 Nghe người Đức nói mà não đứng hình.")}
        agitation={asString(props.agitation, "😶 Muốn trả lời nhưng sợ phát âm sai.")}
        solution={asString(props.solution, "😣 Đi sở, đi bác sĩ, đi làm… phải nhờ người đi cùng.")}
        summary="Vấn đề không phải bạn không thông minh — mà là bạn chưa được học đúng cách."
        ctaLabel="Bắt đầu học đúng cách →"
        ctaHref="/contact"
      />
    );
  }

  if (selectedBlock.type === "method") {
    return (
      <TutoringMethodView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Cách học cùng Trang")}
        subheading="3 bước đơn giản để bắt đầu hành trình tiếng Đức dùng được"
        steps={[
          { title: "Test trình độ & mục tiêu", description: "Xác định level hiện tại." },
          { title: "Lộ trình + Luyện Aussprache", description: "Bắt đầu từ phát âm chuẩn." },
          { title: "Thực hành hội thoại + Feedback", description: "Luyện phản xạ giao tiếp." },
        ]}
      />
    );
  }

  if (selectedBlock.type === "programHighlights") {
    return (
      <TutoringProgramHighlightsView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Điểm khác biệt tại DEUTSCH LIEBE")}
        subheading="Những điều quan trọng học viên cần biết để chinh phục tiếng Đức hiệu quả"
        items={[
          { title: "Tài liệu & Video trọn đời", description: "Học viên sở hữu tài liệu mãi mãi." },
        ]}
        quote='"Khi chúng ta có mục tiêu rõ ràng..."'
        quoteAuthor="— Thu Trang"
      />
    );
  }

  if (selectedBlock.type === "groupLearning") {
    return (
      <TutoringGroupLearningView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Đừng học 1:1 — Hãy học theo nhóm!")}
        summary="Điều mà chưa một trung tâm nào làm được như DEUTSCH LIEBE 🇩🇪❤️"
        communityPoints={[
          "Không ai bị bỏ lại.",
          "Người học nhanh kéo người học chậm.",
          "Cùng tiến bộ mỗi ngày.",
        ]}
        reasons={[
          "Có môi trường giao tiếp thật.",
          "Có áp lực tích cực để nói.",
          "Có tinh thần đồng đội.",
        ]}
        labels={["Dám mở miệng nói", "Dám sai", "Dám sửa", "Giao tiếp thật"]}
        closingHeading="Bạn vẫn câm nín khi gặp người Đức?"
        closingBody="Học theo nhóm – Giao tiếp thật – Tiến bộ thật."
        ctaLabel="Đăng ký tư vấn ngay"
        ctaHref="/contact"
        footerQuote='"CHÚNG TA SẼ KHÔNG HỌC MỘT MÌNH. CHÚNG TA ĐI CÙNG NHAU."'
      />
    );
  }

  if (selectedBlock.type === "coursePackages") {
    const combos = toCombos(props.combos);
    return (
      <TutoringCoursePackagesView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Chọn Combo phù hợp với bạn")}
        subheading="Mỗi combo được thiết kế theo mục tiêu cụ thể."
        combos={
          combos.length > 0
            ? combos
            : [
                {
                  title: "Combo 1",
                  subtitle: "Phát âm + A1.1",
                  sessions: "25 buổi",
                  suitableFor: "Người mới bắt đầu",
                  outcomes: ["Phát âm chuẩn cơ bản", "Giao tiếp chào hỏi"],
                },
              ]
        }
        ctaHref="/contact"
        ctaLabel="Chọn combo này"
      />
    );
  }

  if (selectedBlock.type === "schedule") {
    return (
      <TutoringScheduleView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Lịch khai giảng sắp tới")}
        dateLabel="18.02.2026"
        timeLabel="21:00 - 23:15 (giờ Đức)"
        note="Online qua Zoom · Tối thứ 2, 4, 6 hàng tuần"
        ctaLabel="Giữ chỗ lớp khai giảng"
        ctaHref="/contact"
        footerNote="Không hợp lịch? Để lại thông tin, Trang sẽ xếp lớp phù hợp cho bạn."
      />
    );
  }

  if (selectedBlock.type === "instructor") {
    return (
      <TutoringInstructorView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Về giảng viên: Trang In Berlin")}
        name="Thu Trang Nguyen"
        bio="Sống và làm việc tại Berlin. Phong cách dạy gần gũi, thực tế."
        principles={["Chuẩn phát âm", "Giao tiếp đời sống", "Nâng trình có hệ thống"]}
      />
    );
  }

  if (selectedBlock.type === "testimonials") {
    const items = toTestimonials(props.items);
    return (
      <TutoringTestimonialsView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Kết quả từ học viên")}
        subheading="(Nội dung minh hoạ)"
        items={
          items.length > 0
            ? items
            : [{ context: "Đi làm", before: "Ngại giao tiếp", after: "Tự tin hơn" }]
        }
      />
    );
  }

  if (selectedBlock.type === "scholarship") {
    return (
      <TutoringScholarshipView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Học bổng & Ưu đãi")}
        body="Deutsch Liebe có chương trình ghi nhận nỗ lực học tập theo từng đợt."
        ctaLabel="Hỏi về học bổng / ưu đãi"
        ctaHref="/contact"
      />
    );
  }

  if (selectedBlock.type === "faq") {
    const items = toFaqItems(props.items);
    return (
      <TutoringFaqView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Câu hỏi thường gặp")}
        items={
          items.length > 0
            ? items
            : [{ id: "faq-1", question: "Học online có hiệu quả không?", answer: "Có." }]
        }
      />
    );
  }

  if (selectedBlock.type === "leadForm") {
    return (
      <TutoringLeadFormView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        heading={asString(props.heading, "Nhận tư vấn miễn phí")}
        subheading="Điền thông tin — Trang sẽ liên hệ và test trình độ cho bạn."
        submitLabel={asString(props.submitLabel, "Nhận tư vấn miễn phí")}
        successHeading="Đã nhận thông tin!"
        successBody="Trang sẽ liên hệ trong thời gian sớm nhất."
        successCtaLabel="Inbox ngay"
        successCtaHref="https://m.me/ThuTrangNguyenGermany"
        fallbackCtaLabel="Liên hệ trực tiếp qua Messenger"
        fallbackCtaHref="https://m.me/ThuTrangNguyenGermany"
        packagesAnchorHref="#packages"
        consentLabel="Tôi đồng ý với Chính sách bảo mật (Datenschutzerklärung) và cho phép liên hệ tư vấn."
      />
    );
  }

  if (selectedBlock.type === "footer") {
    const year = new Date().getFullYear();
    return (
      <TutoringFooterView
        anchorId={asNonEmptyString(props.anchorId)}
        className={asNonEmptyString(props.className)}
        siteTitle="DEUTSCH LIEBE"
        subtitle="Học tiếng Đức bằng tình yêu."
        socials={{
          facebook: "https://www.facebook.com/TrangBGerman",
          instagram: "https://www.instagram.com/ThuTrangNguyenGermany",
          youtube: "https://www.youtube.com/@TrangInBerlin",
        }}
        copyrightText={`© ${year} DEUTSCH LIEBE – Thu Trang Nguyen.`}
      />
    );
  }

  return null;
};
