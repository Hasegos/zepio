import { totalScore } from "./logic.js";
import { MIN_SCORE, BASE_SCORE, PUZZLES, SPOTS } from "./puzzles.js";
import { isInt, isObject } from "../_shared/validate.js";


/**
 * 진행 중인 게임 상태에서 저장할 부분만 뽑는다.
 *
 * @param state 게임 상태
 * @returns 저장용 스냅샷
 */
export function snapshot(state) {
  return { coins: state.coins, found: state.found, solved: state.solved, hints: state.hints, wrong: state.wrong };
}

/**
 * 저장된 스냅샷을 검증해 사무소 상태로 되살린다. 어긋난 값이 하나라도 있으면 null이다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns 사무소 화면 상태, 못 쓰면 null
 */
export function restore(raw) {
  if (!isObject(raw) || !isInt(raw.coins, 0, 999)) return null;
  const ids = PUZZLES.map((p) => p.id);
  const spots = SPOTS.map((s) => s.id);
  const solvedOk =
    isObject(raw.solved) &&
    Object.entries(raw.solved).every(
      ([id, e]) => ids.includes(id) && isObject(e) && isInt(e.score, MIN_SCORE, BASE_SCORE) && isInt(e.wrong, 0, 99),
    );
  const hintsOk = isObject(raw.hints) && Object.entries(raw.hints).every(([id, n]) => ids.includes(id) && isInt(n, 0, 3));
  const wrongOk = isObject(raw.wrong) && Object.entries(raw.wrong).every(([id, n]) => ids.includes(id) && isInt(n, 0, 99));
  const foundOk = isObject(raw.found) && Object.entries(raw.found).every(([id, v]) => spots.includes(id) && v === true);
  if (!(solvedOk && hintsOk && wrongOk && foundOk)) return null;
  return {
    phase: "office",
    coins: raw.coins,
    found: raw.found,
    solved: raw.solved,
    hints: raw.hints,
    wrong: raw.wrong,
    puzzle: null,
    notice: "",
    saveTick: 0,
  };
}

/**
 * 저장소 값을 안전한 모양으로 다듬는다.
 *
 * @param raw 저장소에서 읽은 값
 * @returns { v, save, best } save는 이어 할 진행(검증은 restore가 한다), best는 엔딩 기록
 */
export function readData(raw) {
  const valid = raw?.v === 1;
  const best = valid && isObject(raw.best) ? raw.best : {};
  return {
    v: 1,
    save: valid && isObject(raw.save) ? raw.save : null,
    best: {
      endings: isInt(best.endings, 0, 99999) ? best.endings : 0,
      score: isInt(best.score, 0, BASE_SCORE * PUZZLES.length) ? best.score : 0,
    },
  };
}

/**
 * 모든 사건을 푼 결과를 최고 기록과 합친다.
 *
 * @param prev 읽은 저장 데이터
 * @param solved 푼 퍼즐
 * @param save 이어 할 진행 스냅샷
 * @returns 저장할 데이터
 */
export function mergeEnding(prev, solved, save) {
  const { best } = readData(prev);
  return { v: 1, save, best: { endings: best.endings + 1, score: Math.max(best.score, totalScore(solved)) } };
}

/**
 * 홈 카드에 보여줄 한 줄 요약을 만든다.
 *
 * @param data 저장된 데이터
 * @returns 요약 문구, 기록이 없으면 빈 문자열
 */
export function summarize(data) {
  const { save, best } = readData(data);
  const state = restore(save);
  const done = state ? Object.keys(state.solved).length : 0;
  if (best.endings) return `사건 해결 · 최고 ${best.score}점`;
  if (done) return `${done}/${PUZZLES.length}건 해결 · ${totalScore(state.solved)}점`;
  return "";
}