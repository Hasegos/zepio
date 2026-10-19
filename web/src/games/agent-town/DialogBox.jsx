import { useEffect, useRef } from "react";

/**
 * 포켓몬식 대사 상자. 한 번에 한 줄을 보여 주고 누르면 다음으로 넘어간다.
 *
 * @param props.dialog { lines: [{ who, text }], i }
 */
export default function DialogBox({ dialog, onAdvance }) {
  const line = dialog.lines[dialog.i];
  const last = dialog.i === dialog.lines.length - 1;
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [dialog.i, dialog.lines]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onAdvance}
      aria-live="polite"
      className="flex min-h-24 w-full flex-col gap-1 rounded-xl border-4 border-town-ink bg-town-panel p-3 text-left text-town-ink shadow-[0_3px_0_0_#1f1b34]"
    >
      <span className="text-sm font-extrabold text-town-accent">{line.who}</span>
      <span className="text-base font-semibold leading-snug">{line.text}</span>
      <span aria-hidden="true" className="mt-auto self-end text-xs font-bold text-town-ink/70">
        {last ? "닫기 ▼" : "다음 ▼"}
      </span>
    </button>
  );
}