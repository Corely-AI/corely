import type { WebsiteBlockHiddenOn } from "@corely/contracts";

export type BaseSectionProps = {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  variant?: string;
};

export const hiddenClass = (hiddenOn: WebsiteBlockHiddenOn | undefined): string => {
  if (hiddenOn?.mobile && hiddenOn?.desktop) {
    return "hidden";
  }
  if (hiddenOn?.mobile) {
    return "hidden md:block";
  }
  if (hiddenOn?.desktop) {
    return "md:hidden";
  }
  return "";
};

export const variantClass = (variant?: string): string => {
  if (variant === "compact") {
    return "py-10 md:py-12";
  }
  if (variant === "minimal") {
    return "py-8 md:py-10";
  }
  if (variant === "highlight") {
    return "py-20 md:py-28";
  }
  return "";
};

export const sectionClass = (props: BaseSectionProps, baseClassName?: string): string =>
  [baseClassName, hiddenClass(props.hiddenOn), variantClass(props.variant), props.className]
    .filter(Boolean)
    .join(" ");
