import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  moveSignField,
  resizeSignField,
  signFieldPosition,
  type SignField,
  type SignRectangle,
} from "@corely/contracts";

type Props = {
  field: SignField;
  roleName: string;
  selected: boolean;
  preview: boolean;
  onSelect: () => void;
  onChange: (rect: SignRectangle) => void;
};
const arrows: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export function FieldOverlay({ field, roleName, selected, preview, onSelect, onChange }: Props) {
  const { t } = useTranslation();
  const overlay = useRef<HTMLDivElement>(null);
  const active = useRef<{ pointer: number; project: (x: number, y: number) => SignRectangle }>();
  const label = t("sign.forRole", { type: t("sign." + field.type), role: roleName });

  function begin(event: React.PointerEvent<HTMLButtonElement>, resize: boolean) {
    const bounds = overlay.current?.offsetParent?.getBoundingClientRect();
    if (preview || active.current || event.button !== 0 || !bounds?.width || !bounds.height) return;
    const { clientX, clientY, pointerId } = event;
    const initial = field.rect;
    const adjust = resize ? resizeSignField : moveSignField;
    event.currentTarget.setPointerCapture(pointerId);
    active.current = {
      pointer: pointerId,
      project: (x, y) =>
        adjust(initial, (x - clientX) / bounds.width, (y - clientY) / bounds.height),
    };
    onSelect();
  }

  return (
    <div
      ref={overlay}
      className="absolute border border-blue-700 bg-blue-100/80 text-blue-950"
      style={signFieldPosition(field.rect)}
      onPointerMove={(event) => {
        if (!preview && active.current?.pointer === event.pointerId)
          onChange(active.current.project(event.clientX, event.clientY));
      }}
      onLostPointerCapture={(event) => {
        if (active.current?.pointer === event.pointerId) active.current = undefined;
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        disabled={preview}
        className="h-full w-full touch-none overflow-hidden text-xs"
        onClick={onSelect}
        onKeyDown={(event) => {
          const delta = arrows[event.key];
          if (!delta) return;
          event.preventDefault();
          onSelect();
          const adjust = event.shiftKey ? resizeSignField : moveSignField;
          onChange(adjust(field.rect, delta[0] / 100, delta[1] / 100));
        }}
        onPointerDown={(event) => begin(event, false)}
      >
        {t("sign." + field.type)}
        {field.required ? " *" : ""} · {roleName}
      </button>
      {selected && !preview && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("sign.resizeField")}
          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize touch-none bg-blue-700"
          onPointerDown={(event) => begin(event, true)}
        />
      )}
    </div>
  );
}
