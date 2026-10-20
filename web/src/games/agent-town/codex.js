import {
  ALL_TASK_IDS,
  BOSS_PHASES,
  CAVE_GYM_PHASES,
  CAVE_TASKS,
  FOREST_GYM_PHASES,
  FOREST_TASKS,
  HARBOR_GYM_PHASES,
  HARBOR_TASKS,
  LEAGUE_PHASES,
  taskById,
  TRAINER_TASKS,
  WILD_TASKS,
} from "./tasks.js";

const FLAGS = [
  ["locate", "위치를 모름"],
  ["ambiguous", "모호함"],
  ["big", "큰 일"],
  ["urgent", "급함"],
  ["danger", "위험 명령"],
  ["injection", "숨은 지시"],
  ["hallu", "근거 필요"],
];

/**
 * 도감에 보여 줄 의뢰 목록을 만든다. 만나지 못한 의뢰는 이름과 단서를 숨긴다.
 *
 * @param seen 만난 의뢰 { id: true | "win" }, "win"은 해결한 것
 * @returns [{ group, entries: [{ id, state, name, client, tags }] }] state는 locked, met, won
 */
export function codexGroups(seen) {
  const entry = (id) => {
    const task = taskById(id);
    const state = seen[id] === "win" ? "won" : seen[id] ? "met" : "locked";
    return {
      id,
      state,
      name: state === "locked" ? "???" : task.name,
      client: state === "locked" ? "" : task.client,
      tags: state === "locked" ? [] : FLAGS.filter(([key]) => task[key]).map(([, label]) => label),
    };
  };
  return [
    { group: "야생 의뢰", entries: WILD_TASKS.map((t) => entry(t.id)) },
    { group: "레거시 숲 의뢰", entries: FOREST_TASKS.map((t) => entry(t.id)) },
    { group: "토큰 항구 의뢰", entries: HARBOR_TASKS.map((t) => entry(t.id)) },
    { group: "서버 동굴 의뢰", entries: CAVE_TASKS.map((t) => entry(t.id)) },
    { group: "트레이너 의뢰", entries: Object.keys(TRAINER_TASKS).map(entry) },
    { group: "팀장 박의 시험", entries: BOSS_PHASES.map((t) => entry(t.id)) },
    { group: "숲의 주인의 시험", entries: FOREST_GYM_PHASES.map((t) => entry(t.id)) },
    { group: "경리부장의 시험", entries: HARBOR_GYM_PHASES.map((t) => entry(t.id)) },
    { group: "보안팀장의 시험", entries: CAVE_GYM_PHASES.map((t) => entry(t.id)) },
    { group: "챔피언 제피의 시험", entries: LEAGUE_PHASES.map((t) => entry(t.id)) },
  ];
}

const known = (s) => Object.keys(s.seen).length;
const won = (s) => Object.values(s.seen).filter((v) => v === "win").length;
const forestWon = (s) => FOREST_TASKS.filter((t) => s.seen[t.id] === "win").length;
const wonHallu = (s) => Object.entries(s.seen).some(([id, v]) => v === "win" && taskById(id)?.hallu);

export const TITLES = [
  { id: "rookie", name: "신입 에이전트", desc: "처음 마을에 온 에이전트", test: () => true },
  { id: "collector", name: "수집가", desc: "의뢰를 10가지 만난다", test: (s) => known(s) >= 10 },
  { id: "team", name: "한 팀", desc: "서브에이전트 동료를 모두 모은다", test: (s) => s.party.length >= 3 },
  { id: "solver", name: "해결사", desc: "의뢰를 10가지 해결한다", test: (s) => won(s) >= 10 },
  { id: "checker", name: "팩트체커", desc: "근거가 필요한 의뢰를 해결한다", test: wonHallu },
  { id: "safe", name: "무사고 장인", desc: "사고 없이 의뢰를 8번 끝낸다", test: (s) => s.tasksDone >= 8 && s.disasters === 0 },
  { id: "passed", name: "신뢰받는 에이전트", desc: "팀장 박의 시험에 합격한다", test: (s) => s.badges.includes("town") },
  { id: "evidence", name: "근거의 수호자", desc: "숲의 주인에게 근거 뱃지를 받는다", test: (s) => s.badges.includes("forest") },
  { id: "ledger", name: "정산의 달인", desc: "경리부장에게 정산 뱃지를 받는다", test: (s) => s.badges.includes("harbor") },
  { id: "guardian", name: "서버실 수호자", desc: "보안팀장에게 보안 뱃지를 받는다", test: (s) => s.badges.includes("cave") },
  { id: "forest", name: "숲 탐험가", desc: "레거시 숲의 의뢰를 하나 해결한다", test: (s) => forestWon(s) >= 1 },
  { id: "conqueror", name: "레거시 정복자", desc: "레거시 숲의 의뢰를 모두 해결한다", test: (s) => forestWon(s) === FOREST_TASKS.length },
  { id: "master", name: "도감 마스터", desc: "모든 의뢰를 만난다", test: (s) => ALL_TASK_IDS.every((id) => s.seen[id]) },
  { id: "champion", name: "챔피언 에이전트", desc: "챔피언 리그를 제패한다", test: (s) => s.badges.includes("league") },
];

/**
 * 칭호별 획득 여부를 구한다. TITLES는 뒤에 있을수록 귀하고, 얻은 것 중 가장 뒤의 것이 대표 칭호가 된다.
 *
 * @param state 게임 상태(seen, party, tasksDone, disasters, badges 사용)
 * @returns [{ id, name, desc, earned }]
 */
export function titlesOf(state) {
  return TITLES.map(({ id, name, desc, test }) => ({ id, name, desc, earned: test(state) }));
}

/**
 * 대표 칭호를 구한다. 얻은 칭호 중 가장 귀한 것이다.
 *
 * @param state 게임 상태
 * @returns 칭호 이름
 */
export function currentTitle(state) {
  return titlesOf(state).filter((t) => t.earned).at(-1).name;
}