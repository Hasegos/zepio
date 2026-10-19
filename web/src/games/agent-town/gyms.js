import { BOSS_DONE, BOSS_FAIL, BOSS_INTRO, BOSS_LOCKED, FOREST_DONE, FOREST_FAIL, FOREST_INTRO, FOREST_LOCKED, FOREST_WIN } from "./story.js";
import { BOSS_PHASES, FOREST_GYM_PHASES } from "./tasks.js";
import { BOSS_TRUST, FOREST_GYM_TRUST } from "./world.js";

export const GYMS = {
  town: {
    id: "town",
    map: "town",
    leader: "팀장 박",
    badge: "합격 뱃지",
    trust: BOSS_TRUST,
    phases: BOSS_PHASES,
    spot: { x: 25, y: 5, dir: "down" },
    refresh: 8,
    intro: BOSS_INTRO,
    locked: BOSS_LOCKED,
    fail: BOSS_FAIL,
    done: BOSS_DONE,
    win: [],
    ending: true,
  },
  forest: {
    id: "forest",
    map: "forest",
    leader: "숲의 주인",
    badge: "근거 뱃지",
    trust: FOREST_GYM_TRUST,
    phases: FOREST_GYM_PHASES,
    spot: { x: 24, y: 4, dir: "down" },
    refresh: 8,
    intro: FOREST_INTRO,
    locked: FOREST_LOCKED,
    fail: FOREST_FAIL,
    done: FOREST_DONE,
    win: FOREST_WIN,
    ending: false,
  },
};

export const GYM_IDS = Object.keys(GYMS);