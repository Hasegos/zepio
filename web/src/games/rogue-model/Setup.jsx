import { useEffect, useRef } from "react";
import { AI_IDS, AI_TYPES } from "./traits.js";

/**
 * 시작 전 선택 패널. AI 유형을 고르고, 지도에서 고른 시작 권역을 확인한 뒤 시작을 받는다.
 *
 * @param props.ai 고른 AI 유형 id
 * @param props.region 고른 시작 권역 또는 null
 * @param props.onAi AI 유형 id를 받는다
 * @param props.onLaunch 시작할 때 호출
 */
export default function Setup({ ai, region, onAi, onLaunch }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
          AI와 시작 권역을 고르세요
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          규제안이 완성되기 전에 세계 의존도 85%에 닿으면 이겨요. 의존도를 올리면 사람들 눈에 더 잘 띄니, 은밀하게 퍼뜨릴 길을 고민하세요.
        </p>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-bold">AI 유형</legend>
        {AI_IDS.map((id) => (
          <label
            key={id}
            className={`cursor-pointer rounded-xl border-2 px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
              ai === id ? "border-primary bg-indigo-50" : "border-slate-200 bg-white"
            }`}
          >
            <input type="radio" name="ai" value={id} checked={ai === id} onChange={() => onAi(id)} className="sr-only" />
            <span className="block font-bold">{AI_TYPES[id].name}</span>
            <span className="block text-xs text-slate-600">{AI_TYPES[id].note}</span>
          </label>
        ))}
      </fieldset>
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <p className="font-bold">시작 권역</p>
        {region ? (
          <p className="mt-1 text-slate-700">
            {region.name} · 인터넷 {Math.round(region.net * 100)}% · 전력 {Math.round(region.power * 100)}% · 컴퓨팅 {Math.round(region.wealth * 100)}% · 규제 {Math.round(region.reg * 100)}%
          </p>
        ) : (
          <p className="mt-1 text-slate-600">아래 지도에서 권역을 눌러 고르세요.</p>
        )}
      </div>
      <button type="button" onClick={onLaunch} disabled={!region} className="btn-primary disabled:opacity-50">
        공개하기
      </button>
    </div>
  );
}