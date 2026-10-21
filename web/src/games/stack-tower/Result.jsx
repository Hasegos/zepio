import { useEffect, useRef } from "react";
import ShareButton from "../_shared/ShareButton.jsx";
import meta from "./meta.js";
import { stackTowerShareText } from "./share-text.js";

/**
 * 층수에 맞는 한 줄 평가를 고른다.
 *
 * @param floors 쌓은 층수
 * @returns 결과 제목
 */
function headline(floors) {
  if (floors >= 30) return "전설의 건축가예요!";
  if (floors >= 20) return "대단해요!";
  if (floors >= 10) return "잘했어요!";
  return "다음엔 더 높이 쌓아 봐요!";
}

/**
 * 결과 요약과 최고 기록을 보여주고 다시 도전을 받는다.
 *
 * @param props.result 이번 판의 floors(층수)와 perfects(완벽 정렬 횟수)
 * @param props.record 저장한 최고 기록과 새 기록 여부, 저장 전에는 null
 * @param props.daily 오늘의 도전이면 { date, streak }, 아니면 null
 * @param props.onRetry 다시 도전하기를 눌렀을 때 호출
 */
export default function Result({ result, record, daily, onRetry }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {headline(result.floors)}
        </h2>
        <p className="mt-1 text-slate-600">
          Stack Tower{daily ? ` · 오늘의 도전 · 연속 ${daily.streak}일` : ""} 끝
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">쌓은 층</dt>
          <dd className="text-2xl font-extrabold">{result.floors}층</dd>
        </div>
        <div className="stat-tile">
          <dt className="text-sm text-slate-600">완벽 정렬</dt>
          <dd className="text-2xl font-extrabold">{result.perfects}회</dd>
        </div>
      </dl>

      {!daily && record && (
        <p className="text-center text-sm text-slate-600">
          {record.isNewBest && <strong className="mr-2 text-success-strong">새 기록!</strong>}내 최고 기록:{" "}
          {record.data.bestFloors}층 · 완벽 정렬 {record.data.bestPerfects}회
        </p>
      )}

      <ShareButton title="Zepio Stack Tower" text={stackTowerShareText(result, daily?.date)} path={`/games/${meta.slug}/`} />

      <button type="button" onClick={onRetry} className="btn-primary">
        다시 도전하기
      </button>
    </div>
  );
}