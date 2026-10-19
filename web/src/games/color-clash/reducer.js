export const DURATION_MS = 30000;

/** 선택할 수 있는 색. 칠할 색(fill)은 어두운 문제 칸 위에서 글자로 읽히는 밝기로 골랐다. */
export const COLORS = [
  { id: "red", name: "빨강", fill: "#ef4444" },
  { id: "blue", name: "파랑", fill: "#3b82f6" },
  { id: "green", name: "초록", fill: "#22c55e" },
  { id: "yellow", name: "노랑", fill: "#facc15" },
];

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return { phase: "intro", word: 0, ink: 1, correct: 0, wrong: 0, last: null, startedAt: 0, finishedAt: 0 };
}

/**
 * 새 문제를 만든다. 글자가 가리키는 색(word)과 칠한 색(ink)은 항상 다르다.
 *
 * @param random 0 이상 1 미만의 수를 돌려주는 함수(테스트에서 바꾼다)
 * @returns 글자 색 번호 word와 칠한 색 번호 ink
 */
export function makeRound(random = Math.random) {
  const ink = Math.floor(random() * COLORS.length);
  const word = (ink + 1 + Math.floor(random() * (COLORS.length - 1))) % COLORS.length;
  return { word, ink };
}

/**
 * 한 판의 진행 상태를 전이한다. 시간은 action.now로만 받아 순수하게 유지한다.
 * 제한 시간이 지난 뒤의 입력은 세지 않고 판을 끝낸다. 상태에 맞지 않는 action은 같은 state를 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(word, ink, now), answer(choice, word, ink, now), tick(now) 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...initialState(), phase: "playing", word: action.word, ink: action.ink, startedAt: action.now };
    case "answer": {
      if (state.phase !== "playing") return state;
      if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= COLORS.length) return state;
      if (action.now - state.startedAt >= DURATION_MS) return finish(state);
      const right = action.choice === state.ink;
      return {
        ...state,
        correct: state.correct + (right ? 1 : 0),
        wrong: state.wrong + (right ? 0 : 1),
        last: right ? "ok" : "miss",
        word: action.word,
        ink: action.ink,
      };
    }
    case "tick":
      if (state.phase !== "playing" || action.now - state.startedAt < DURATION_MS) return state;
      return finish(state);
    case "back":
      return initialState();
    default:
      return state;
  }
}

/**
 * 판을 끝낸 상태를 만든다. 끝난 시각은 제한 시간으로 고정한다.
 *
 * @param state 진행 중인 상태
 * @returns 결과 상태
 */
function finish(state) {
  return { ...state, phase: "result", finishedAt: state.startedAt + DURATION_MS };
}

/**
 * 남은 시간을 초 단위로 올림해서 돌려준다.
 *
 * @param state 현재 상태
 * @param now 지금 시각(밀리초)
 * @returns 0 이상 30 이하의 정수
 */
export function secondsLeft(state, now) {
  return Math.min(DURATION_MS / 1000, Math.max(0, Math.ceil((state.startedAt + DURATION_MS - now) / 1000)));
}

/**
 * 정확도를 퍼센트 정수로 돌려준다. 한 번도 답하지 않았으면 0이다.
 *
 * @param state 현재 상태
 * @returns 0 이상 100 이하의 정수
 */
export function accuracy(state) {
  const total = state.correct + state.wrong;
  return total === 0 ? 0 : Math.round((state.correct / total) * 100);
}