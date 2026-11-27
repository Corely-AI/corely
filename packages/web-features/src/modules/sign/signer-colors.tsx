const hues = [
  218, 152, 25, 278, 349, 184, 47, 117, 241, 312, 8, 170, 64, 265, 332, 201, 37, 94, 229, 293,
];

export function signerColor(index: number) {
  const hue = hues[index] ?? hues[0];
  return {
    borderColor: `hsl(${hue} 64% 39%)`,
    backgroundColor: `hsl(${hue} 86% 90% / 0.96)`,
    color: `hsl(${hue} 62% 18%)`,
  };
}

export function SignerMark({ index }: { index: number }) {
  const { borderColor } = signerColor(index);
  return (
    <span
      className="size-3 shrink-0 rounded-full"
      aria-hidden="true"
      style={{ backgroundColor: borderColor }}
    />
  );
}
