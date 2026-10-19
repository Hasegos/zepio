import { ISLAND_LIST } from "./islands.js";
import { isUnlocked, totalStars, unlockStars } from "./record.js";

/**
 * 별 세 칸을 글자로 그린다.
 *
 * @param stars 받은 별 개수(0~3)
 * @returns 예: ★★☆
 */
function starText(stars) {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

const card = "flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left";

/**
 * 시작 화면. 이어 하기, 오늘의 섬, 섬 목록을 보여 주고 별을 모아 섬을 여는 흐름을 안내한다.
 *
 * @param props.data 읽은 저장 데이터(best)
 * @param props.resume 이어 할 판의 섬 이름과 놓은 건물 수, 없으면 null
 * @param props.daily 오늘의 섬 정보 { date, ghost, record(오늘의 기록 점수 또는 null), streak }
 * @param props.onStart 섬을 골랐을 때 호출, 섬 id를 받는다
 * @param props.onResume 이어 하기를 눌렀을 때 호출
 */
export default function Menu({ data, resume, daily, onStart, onResume }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold">어떤 섬을 지을까요?</h2>
        <p className="mt-1 text-sm text-slate-700">
          별 {totalStars(data)}개 · 별을 모으면 새 섬이 열려요
        </p>
      </div>

      {resume && (
        <button type="button" onClick={onResume} className={`${card} border-2 border-isle-accent bg-white`}>
          <span>
            <span className="block font-bold">이어 하기</span>
            <span className="block text-sm text-slate-700">
              {resume.name} · 건물 {resume.built}채를 지었어요
            </span>
          </span>
          <span className="rounded-lg bg-isle-accent px-3 py-1.5 text-sm font-bold text-white">계속</span>
        </button>
      )}

      <button type="button" onClick={() => onStart(`daily:${daily.date}`)} className={`${card} bg-isle-ink text-white`}>
        <span>
          <span className="block font-bold">오늘의 섬 · {daily.date}</span>
          <span className="block text-sm text-white/85">
            모두가 같은 섬 · 제피의 기록 {daily.ghost}점
            {daily.streak > 0 && ` · ${daily.streak}일 연속`}
          </span>
        </span>
        <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-isle-ink">
          {daily.record === null ? "도전" : `${daily.record}점`}
        </span>
      </button>

      <ul className="grid gap-2">
        {ISLAND_LIST.map((island, index) => {
          const open = isUnlocked(data, index);
          const best = data.best[island.id];
          return (
            <li key={island.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onStart(island.id)}
                className={`${card} bg-isle-cream disabled:opacity-60`}
              >
                <span>
                  <span className="block font-bold">{island.name}</span>
                  <span className="block text-sm text-slate-700">
                    {open ? island.tip : `별 ${unlockStars(index)}개를 모으면 열려요`}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  {open ? (
                    <>
                      <span role="img" aria-label={`별 ${best?.stars ?? 0}개`} className="block text-base text-amber-700">
                        {starText(best?.stars ?? 0)}
                      </span>
                      <span className="block text-slate-700">{best ? `최고 ${best.score}점` : "처음이에요"}</span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-700">잠김</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}