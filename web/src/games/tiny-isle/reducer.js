import { apply, currentScore, finish, isOver } from "./engine.js";
import { BUILDINGS, canBuild } from "./rules.js";

/**
 * 처음 화면 상태를 만든다.
 *
 * @returns 상태 { phase, run, lines, selected, target, demolishing, notice, noticeId, gain, result }
 */
export function initialState() {
  return {
    phase: "menu",
    run: null,
    lines: null,
    selected: null,
    target: null,
    demolishing: false,
    notice: "",
    noticeId: 0,
    gain: null,
    result: null,
  };
}

/**
 * 안내 문구를 남기고 낭독이 다시 되도록 번호를 올린다.
 *
 * @param state 상태
 * @param notice 안내 문구
 * @returns 새 상태
 */
function say(state, notice) {
  return { ...state, notice, noticeId: state.noticeId + 1 };
}

/**
 * 수를 두고 점수 증가분을 기록한다. 판이 끝났으면 결과 화면으로 넘어간다.
 *
 * @param state 상태
 * @param move 판에 적용할 수
 * @param text 성공했을 때의 안내를 만드는 함수(증가분을 받는다)
 * @returns 새 상태
 */
function play(state, move, text) {
  const run = apply(state.run, move);
  if (run === state.run) return say(state, "둘 수 없는 수예요");
  const delta = move.t === "reroll" ? 0 : currentScore(run) - currentScore(state.run);
  const next = {
    ...state,
    run,
    selected: move.t === "reroll" ? state.selected : null,
    target: null,
    demolishing: move.t === "demolish" ? false : state.demolishing,
    gain: move.t === "reroll" ? null : { i: move.i, delta, n: (state.gain?.n ?? 0) + 1 },
  };
  const said = say(next, text(delta));
  return isOver(run) ? { ...said, phase: "result", result: finish(run, state.lines), selected: null, target: null } : said;
}

/**
 * 화면 상태를 전이한다. 판 규칙은 엔진이 맡고 여기서는 선택과 미리보기, 화면 단계만 다룬다.
 *
 * @param state 현재 상태
 * @param action start(run, lines), select(slot), cell(i), confirm, reroll, demolishMode, cancel, menu 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: isOver(action.run) ? "result" : "play", run: action.run, lines: action.lines, result: isOver(action.run) ? finish(action.run, action.lines) : null, noticeId: state.noticeId };
    case "select": {
      if (state.phase !== "play" || !state.run.hand[action.slot]) return state;
      const same = state.selected === action.slot;
      return { ...state, selected: same ? null : action.slot, target: null, demolishing: false, notice: "", noticeId: state.noticeId };
    }
    case "cell": {
      if (state.phase !== "play") return state;
      const { run } = state;
      if (state.demolishing) {
        if (!run.board[action.i]) return say(state, "철거할 건물을 눌러 주세요");
        if (state.target === action.i) return play(state, { t: "demolish", i: action.i }, () => "건물을 철거했어요");
        return { ...state, target: action.i };
      }
      if (state.selected === null) return say(state, "먼저 아래에서 카드를 골라 주세요");
      const id = run.hand[state.selected];
      if (!canBuild(run.terrain, run.board, id, action.i)) {
        return say(state, id === "dock" ? "부두는 물가의 빈 땅에만 지을 수 있어요" : "빈 땅에만 지을 수 있어요");
      }
      if (state.target === action.i) return play(state, { t: "place", slot: state.selected, i: action.i }, (delta) => `${name(id)} ${delta >= 0 ? "+" : ""}${delta}점`);
      return { ...state, target: action.i };
    }
    case "confirm": {
      if (state.phase !== "play" || state.target === null) return state;
      return reducer(state, { type: "cell", i: state.target });
    }
    case "reroll": {
      if (state.phase !== "play" || state.selected === null) return say(state, "바꿀 카드를 먼저 골라 주세요");
      return play(state, { t: "reroll", slot: state.selected }, () => "카드를 바꿨어요");
    }
    case "demolishMode": {
      if (state.phase !== "play") return state;
      if (state.run.demolish < 1) return say(state, "철거 기회를 모두 썼어요");
      return { ...state, demolishing: !state.demolishing, selected: null, target: null, notice: "", noticeId: state.noticeId };
    }
    case "cancel":
      return { ...state, selected: null, target: null, demolishing: false };
    case "menu":
      return { ...initialState(), noticeId: state.noticeId };
    default:
      return state;
  }
}

/**
 * 건물 id의 이름을 구한다.
 *
 * @param id 건물 id
 * @returns 이름
 */
function name(id) {
  return BUILDINGS.find((building) => building.id === id)?.name ?? "";
}