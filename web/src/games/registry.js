import agentTown from "./agent-town/meta.js";
import bugSweeper from "./bug-sweeper/meta.js";
import halluDetective from "./hallu-detective/meta.js";
import lightFlip from "./light-flip/meta.js";
import patternChallenge from "./pattern-challenge/meta.js";
import promptFortress from "./prompt-fortress/meta.js";
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