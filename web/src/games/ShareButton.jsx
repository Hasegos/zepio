import { useState } from "react";
import { shareResult, withUrl } from "../lib/share.js";

const MESSAGES = {
  shared: "공유했어요.",
  copied: "복사했어요. 붙여넣어 보내 보세요.",
  manual: "자동 복사가 안 돼요. 아래 글을 직접 복사해 주세요.",
  cancelled: "",
};

/**
 * 결과를 공유하는 버튼. 공유 창이나 클립보드를 못 쓰면 글을 직접 복사할 수 있게 보여준다.
 *
 * @param props.title 공유 제목
 * @param props.text 공유 글(주소 제외)
 * @param props.path 게임 페이지 경로(예: /games/memory-sequence/)
 */
export default function ShareButton({ title, text, path }) {
  const [outcome, setOutcome] = useState(null);
  const url = new URL(path, window.location.href).href;

  async function onClick() {
    setOutcome(await shareResult({ title, text, url }));
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border-2 border-primary bg-white px-5 py-3 text-lg font-bold text-primary"
      >
        결과 공유하기
      </button>
      <p role="status" className="min-h-5 text-center text-sm font-semibold text-slate-700">
        {outcome ? MESSAGES[outcome] : ""}
      </p>
      {outcome === "manual" && (
        <textarea
          readOnly
          rows={3}
          aria-label="공유할 글"
          value={withUrl(text, url)}
          onFocus={(event) => event.target.select()}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm"
        />
      )}
    </div>
  );
}