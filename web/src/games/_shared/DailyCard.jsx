/**
 * 시작 화면의 오늘의 도전 카드. 오늘 아직 안 했으면 시작 버튼을, 했으면 결과를 보여 준다.
 *
 * @param props.date 오늘 날짜(YYYY-MM-DD)
 * @param props.streak 이어지고 있는 연속 일수
 * @param props.doneText 오늘 이미 했을 때 보여 줄 글, 아직이면 null
 * @param props.onStart 오늘의 도전 시작하기를 눌렀을 때 호출
 */
export default function DailyCard({ date, streak, doneText, onStart }) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-primary/30 bg-indigo-50 p-4" aria-live="polite">
      <p className="font-bold">오늘의 도전</p>
      {doneText ? (
        <p className="mt-1 text-sm text-slate-700">{doneText}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-700">
            {date} · 모두가 같은 판{streak > 0 ? ` · 연속 ${streak}일 도전 중` : ""}
          </p>
          <button type="button" onClick={onStart} className="mt-3 w-full rounded-xl bg-primary px-6 py-3 text-lg font-bold text-white">
            오늘의 도전 시작하기
          </button>
        </>
      )}
    </div>
  );
}
