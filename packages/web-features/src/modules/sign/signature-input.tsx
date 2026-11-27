"use client";
import { useRef, useState, type PointerEvent } from "react";
import type { SignRecipientMessages } from "@corely/web-shared/shared/i18n/sign-recipient";
import type { DrawnSignature } from "@corely/contracts";
import { Button, Input } from "@corely/ui";
export function SignatureInput({
  messages,
  label,
  value,
  onChange,
  required,
}: {
  messages: SignRecipientMessages;
  label: string;
  value: string | DrawnSignature;
  onChange: (value: string | DrawnSignature) => void;
  required: boolean;
}) {
  const [draw, setDraw] = useState(typeof value === "object");
  const stroke = useRef<[number, number][]>([]),
    [preview, setPreview] = useState<[number, number][]>([]);
  const lines = typeof value === "object" ? value.strokes : [];
  function position(e: PointerEvent<SVGSVGElement>): [number, number] {
    const box = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    ].map((n) => Math.round(n * 1000) / 1000) as [number, number];
  }
  return (
    <div className="space-y-2">
      {!draw ? (
        <Input
          aria-label={label}
          type="text"
          className="w-full"
          value={typeof value === "string" ? value : ""}
          required={required}
          maxLength={240}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <>
          <svg
            aria-label={messages.drawSignature}
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            className="block h-28 w-full touch-none rounded border"
            onPointerDown={(e) => {
              if (lines.length === 16) {
                return;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              stroke.current = [position(e)];
              setPreview(stroke.current);
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId) || stroke.current.length >= 128) {
                return;
              }
              stroke.current = [...stroke.current, position(e)];
              setPreview(stroke.current);
            }}
            onPointerCancel={() => {
              stroke.current = [];
              setPreview([]);
            }}
            onPointerUp={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
                return;
              }
              e.currentTarget.releasePointerCapture(e.pointerId);
              if (stroke.current.length > 1) {
                onChange({ strokes: [...lines, stroke.current] });
              }
              stroke.current = [];
              setPreview([]);
            }}
          >
            {[...lines, preview].map((line, i) => (
              <polyline
                key={i}
                points={line.map(([x, y]) => [x * 400, y * 100].join(",")).join(" ")}
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
              />
            ))}
          </svg>
          <Button type="button" variant="outline" onClick={() => onChange("")}>
            {messages.clearDrawing}
          </Button>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setDraw(!draw);
          onChange("");
          setPreview([]);
        }}
      >
        {draw ? messages.useTypedSignature : messages.useDrawnSignature}
      </Button>
    </div>
  );
}
