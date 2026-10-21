import agentTown from "./agent-town/meta.js";
import bugDesk from "./bug-desk/meta.js";
import bugSweeper from "./bug-sweeper/meta.js";
import halluDetective from "./hallu-detective/meta.js";
import hiddenRule from "./hidden-rule/meta.js";
import lightFlip from "./light-flip/meta.js";
import patternChallenge from "./pattern-challenge/meta.js";
import promptFortress from "./prompt-fortress/meta.js";
import rackTycoon from "./rack-tycoon/meta.js";
import rogueModel from "./rogue-model/meta.js";
import rumor from "./rumor/meta.js";
import stackTower from "./stack-tower/meta.js";
import tinyIsle from "./tiny-isle/meta.js";

export const games = [
  { ...patternChallenge, load: () => import("./pattern-challenge/index.jsx") },
  { ...lightFlip, load: () => import("./light-flip/index.jsx") },
  { ...tinyIsle, load: () => import("./tiny-isle/index.jsx") },
  { ...agentTown, load: () => import("./agent-town/index.jsx") },
  { ...halluDetective, load: () => import("./hallu-detective/index.jsx") },
  { ...promptFortress, load: () => import("./prompt-fortress/index.jsx") },
  { ...stackTower, load: () => import("./stack-tower/index.jsx") },
  { ...bugSweeper, load: () => import("./bug-sweeper/index.jsx") },
  { ...rackTycoon, load: () => import("./rack-tycoon/index.jsx") },
  { ...hiddenRule, load: () => import("./hidden-rule/index.jsx") },
  { ...bugDesk, load: () => import("./bug-desk/index.jsx") },
  { ...rumor, load: () => import("./rumor/index.jsx") },
  { ...rogueModel, load: () => import("./rogue-model/index.jsx") },
];

export const liveGames = games.filter((game) => game.status === "live");

/**
 * 슬러그로 게임을 찾는다.
 *
 * @param slug 게임 URL의 슬러그
 * @returns 게임 항목, 없으면 undefined
 */
export function getGame(slug) {
  return games.find((game) => game.slug === slug);
}