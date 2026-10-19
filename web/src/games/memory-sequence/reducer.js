export const PAD_COUNT = 9;
export const START_LENGTH = 3;
export const MAX_ROUND = 15;

/**
 * 시작 전 상태를 만든다.
 *
 * @returns 시작 화면 상태
 */
export function initialState() {
  return {
    phase: "intro",
    sequence: [],
    inputIndex: 0,
    round: 0,
    cleared: 0,
    won: false,
    failedPad: null,
    expectedPad: null,
    startedAt: 0,
    finishedAt: 0,
  };
}

/**
 * 한 판의 진행 상태를 전이한다. 무작위 값과 시간은 action으로만 받아 순수하게 유지한다.
 * 상태에 맞지 않는 action은 같은 state를 그대로 돌려준다.
 *
 * @param state 현재 상태
 * @param action start(pads, now), showDone, press(pad, next, now) 중 하나
 * @returns 다음 상태
 */
export function reducer(state, action) {
  switch (action.type) {
    case "start":
      return {
        ...initialState(),
        phase: "showing",
        sequence: action.pads,
        round: 1,
        startedAt: action.now,
      };
    case "showDone":
      if (state.phase !== "showing") return state;
      return { ...state, phase: "input", inputIndex: 0 };
    case "press": {
      if (state.phase !== "input") return state;
      if (!Number.isInteger(action.pad) || action.pad < 0 || action.pad >= PAD_COUNT) return state;
      const expected = state.sequence[state.inputIndex];
      if (action.pad !== expected) {
        return {
          ...state,
          phase: "result",
          cleared: state.round - 1,
          failedPad: action.pad,
          expectedPad: expected,
          finishedAt: action.now,
        };
      }
      if (state.inputIndex + 1 < state.sequence.length) {
        return { ...state, inputIndex: state.inputIndex + 1 };
      }
      if (state.round === MAX_ROUND) {
        return { ...state, phase: "result", cleared: MAX_ROUND, won: true, finishedAt: action.now };
      }
      return {
        ...state,
        phase: "showing",
        sequence: [...state.sequence, action.next],
        round: state.round + 1,
        cleared: state.round,
        inputIndex: 0,
      };
    }
    default:
      return state;
  }
}

/**
 * 라운드에 따른 불빛 시간을 정한다. 라운드가 올라가면 빨라지고 한계에서 멈춘다.
 *
 * @param round 현재 라운드(1부터)
 * @returns 켜져 있는 시간(on)과 꺼져 있는 시간(gap), 밀리초
 */
export function timing(round) {
  return {
    on: Math.max(350, 650 - (round - 1) * 25),
    gap: Math.max(120, 260 - (round - 1) * 10),
  };
}

/**
 * 밀리초를 mm:ss 문자열로 바꾼다.
 *
 * @param ms 경과 시간(밀리초), 음수는 0으로 본다
 * @returns mm:ss 문자열
 */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
