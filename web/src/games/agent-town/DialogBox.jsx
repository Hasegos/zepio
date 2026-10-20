import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./motion.js";

const TYPE_MS = 28;

/**
 * 포켓몬식 대사 상자. 한 줄씩 글자가 찍히고, 찍히는 중에 누르면 한 줄이 한 번에 나오고, 다 나온 뒤 누르면 다음으로 넘어간다.
 * 글자는 모두 DOM에 있고 아직 안 찍힌 부분만 안 보이게 해서 줄바꿈이 흔들리지 않는다.
 *
 * @param props.dialog { lines: [{ who, text }], i }
 * @param props.sfx 효과음 재생 함수(없어도 된다)
 */
export default function DialogBox({ dialog, onAdvance, sfx }) {
  const line = dialog.lines[dialog.i];
  const last = dialog.i === dialog.lines.length - 1;
  const ref = useRef(null);
  const { text } = line;
  const instant = reducedMotion();
  const [typed, setTyped] = useState({ text: "", n: 0 });
  const n = instant ? text.length : typed.text === text ? typed.n : 0;

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [dialog.i, dialog.lines]);

  useEffect(() => {
    if (n >= text.length) return undefined;
    if (n % 3 === 0 && text[n] !== " ") sfx?.("talk");
    const id = setTimeout(() => setTyped({ text, n: n + 1 }), TYPE_MS);
    return () => clearTimeout(id);
  }, [n, text]);

  return (
    <button
      ref={ref}
      type="button"
      data-dialog
      onClick={() => (n < text.length ? setTyped({ text, n: text.length }) : onAdvance())}
      aria-live="polite"
      className="flex min-h-24 w-full flex-col gap-1 rounded-xl border-4 border-town-ink bg-town-panel p-3 text-left text-town-ink shadow-[0_3px_0_0_#1f1b34]"
    >
      <span className="text-sm font-extrabold text-town-accent">{line.who}</span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="text-base font-semibold leading-snug">
        {text.slice(0, n)}
        <span className="invisible">{text.slice(n)}</span>
      </span>
      <span aria-hidden="true" className="mt-auto self-end text-xs font-bold text-town-ink/70">
        {last ? "닫기 ▼" : "다음 ▼"}
      </span>
    </button>
  );
}