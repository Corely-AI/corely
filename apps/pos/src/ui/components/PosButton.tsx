import type { ReactNode } from "react";
import {
  Button,
  type ButtonAlign,
  type ButtonSize,
  type ButtonVariant,
} from "@/ui/components/Button";

export function PosButton(props: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  leftIcon?: ReactNode;
  testID?: string;
  loading?: boolean;
  accessibilityLabel?: string;
  fullWidth?: boolean;
  maxWidth?: number;
  align?: ButtonAlign;
  size?: ButtonSize;
  labelLines?: 1 | 2;
}) {
  return <Button {...props} />;
}
