"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, ArrowDown } from "lucide-react";
import { type CommonBlockProps, type RuntimeProps, sectionClass } from "./shared";

type LeadFormProps = CommonBlockProps &
  RuntimeProps & {
    heading?: string;
    formId?: string;
    submitLabel?: string;
  };

export const LeadForm = (props: LeadFormProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Placeholder: integrate with email/CRM/webhook
    setSubmitted(true);
  };

  const scrollToPackages = () => {
    document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" });
  };

  if (submitted) {
    return (
      <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-16 md:py-24")}>
        <div className="container mx-auto px-4 max-w-lg text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Đã nhận thông tin!</h2>
          <p className="text-muted-foreground leading-relaxed">
            Trang sẽ liên hệ trong thời gian sớm nhất để test trình độ và tư vấn combo phù hợp.
            Trong lúc chờ, bạn có thể inbox trực tiếp để giữ chỗ.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <a
                href="https://m.me/ThuTrangNguyenGermany"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Inbox ngay
              </a>
            </Button>
            <Button variant="hero-outline" size="lg" onClick={scrollToPackages}>
              Xem lại các combo
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={props.anchorId ?? "lead-form"} className={sectionClass(props, "py-16 md:py-24")}>
      <div className="container mx-auto px-4 max-w-lg">
        <div className="bg-card rounded-2xl p-6 md:p-8 card-shadow border border-border">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {props.heading ?? "Nhận tư vấn miễn phí"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Điền thông tin — Trang sẽ liên hệ và test trình độ cho bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id={props.formId}>
            <div>
              <Label htmlFor="name" className="text-foreground">
                Họ tên
              </Label>
              <Input id="name" name="name" required placeholder="Nguyễn Văn A" className="mt-1" />
            </div>

            <div>
              <Label htmlFor="city" className="text-foreground">
                Bạn đang ở thành phố nào tại Đức?
              </Label>
              <Input
                id="city"
                name="city"
                required
                placeholder="Berlin, München…"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-foreground">Mục tiêu</Label>
              <Select name="goal" required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn mục tiêu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="giao-tiep">Giao tiếp hàng ngày</SelectItem>
                  <SelectItem value="di-lam">Đi làm</SelectItem>
                  <SelectItem value="thi-a1">Thi A1</SelectItem>
                  <SelectItem value="thi-b1">Thi B1</SelectItem>
                  <SelectItem value="khac">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground">Trình độ hiện tại</Label>
              <Select name="level" required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn trình độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mat-goc">Mất gốc / Chưa học</SelectItem>
                  <SelectItem value="a1">A1</SelectItem>
                  <SelectItem value="a2">A2</SelectItem>
                  <SelectItem value="b1">B1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact" className="text-foreground">
                Số điện thoại (WhatsApp) hoặc Email
              </Label>
              <Input
                id="contact"
                name="contact"
                required
                placeholder="+49… hoặc email@..."
                className="mt-1"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
              />
              <label
                htmlFor="consent"
                className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
              >
                Tôi đồng ý với{" "}
                <a href="#" className="text-primary underline">
                  Chính sách bảo mật (Datenschutzerklärung)
                </a>{" "}
                và cho phép liên hệ tư vấn.
              </label>
            </div>

            <Button variant="hero" size="xl" className="w-full" type="submit" disabled={!consent}>
              <ArrowDown className="w-4 h-4 mr-2" /> {props.submitLabel ?? "Nhận tư vấn miễn phí"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default LeadForm;
