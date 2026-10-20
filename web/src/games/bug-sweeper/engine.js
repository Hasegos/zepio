import { makeRng, shuffle } from "../_shared/rng.js";

export const LEVELS = {
  easy: { id: "easy", name: "쉬움", cols: 9, rows: 9, bugs: 10 },
  normal: { id: "normal", name: "보통", cols: 12, rows: 12, bugs: 26 },
  hard: { id: "hard", name: "어려움", cols: 12, rows: 16, bugs: 40 },
};
export const LEVEL_IDS = Object.keys(LEVELS);

export const HIDDEN = 0;
export const OPEN = 1;
export const FLAG = 2;

const MAX_TRIES = 300;
const tables = new Map();

/**
 * 칸마다 이웃한 칸(최대 8개) 번호를 미리 구해 둔다. 격자 크기마다 한 번만 만든다.
 *
 * @param cols 가로 칸 수
 * @param rows 세로 칸 수
 * @returns 칸 번호로 찾는 이웃 번호 배열의 배열
 */
export function neighborTable(cols, rows) {
  const key = `${cols}x${rows}`;
  if (tables.has(key)) return tables.get(key);
  const table = [];
  for (let i = 0; i < cols * rows; i += 1) {
    const x = i % cols;
    const y = (i - x) / cols;
    const list = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < cols && ny < rows) list.push(ny * cols + nx);
      }
    }
    table.push(list);
  }
  tables.set(key, table);
  return table;
}

/**
 * 버그 위치에서 칸마다 이웃한 버그 수를 센다.
 *
 * @param mines 버그가 있는 칸이 1인 배열
 * @param table 이웃 번호 표
 * @returns 칸마다 이웃한 버그 수
 */
function countAround(mines, table) {
  const counts = new Uint8Array(mines.length);
  for (let i = 0; i < mines.length; i += 1) {
    for (const j of table[i]) counts[i] += mines[j];
  }
  return counts;
}

/**
 * 첫 칸에서 시작해 숫자 단서만으로 모든 안전한 칸을 열 수 있는지 확인한다. 찍기가 필요 없는 판인지 가리는 검사다.
 * 쓰는 규칙은 세 가지다: 숫자 하나로 정해지는 칸, 두 숫자의 미확정 칸이 포함 관계일 때 차이로 정해지는 칸, 남은 버그 수.
 *
 * @param mines 버그가 있는 칸이 1인 배열
 * @param counts 칸마다 이웃한 버그 수
 * @param level 난이도 항목
 * @param start 처음 여는 칸 번호
 * @returns 논리만으로 다 풀리면 true
 */
export function isSolvable(mines, counts, level, start) {
  const { cols, rows, bugs } = level;
  const total = cols * rows;
  const table = neighborTable(cols, rows);
  const known = new Uint8Array(total);
  let opened = 0;
  let found = 0;

  const open = (from) => {
    const stack = [from];
    while (stack.length) {
      const i = stack.pop();
      if (known[i] !== 0) continue;
      known[i] = 1;
      opened += 1;
      if (counts[i] === 0) for (const j of table[i]) if (known[j] === 0) stack.push(j);
    }
  };
  const mark = (j) => {
    if (known[j] !== 0) return false;
    known[j] = 2;
    found += 1;
    return true;
  };

  open(start);
  let changed = true;
  while (changed) {
    changed = false;
    const rules = [];
    for (let i = 0; i < total; i += 1) {
      if (known[i] !== 1 || counts[i] === 0) continue;
      const unknown = [];
      let marked = 0;
      for (const j of table[i]) {
        if (known[j] === 0) unknown.push(j);
        else if (known[j] === 2) marked += 1;
      }
      if (!unknown.length) continue;
      const need = counts[i] - marked;
      if (need === 0) {
        for (const j of unknown) open(j);
        changed = true;
      } else if (need === unknown.length) {
        for (const j of unknown) mark(j);
        changed = true;
      } else {
        rules.push({ unknown, need });
      }
    }
    if (changed) continue;

    for (const a of rules) {
      for (const b of rules) {
        if (a === b || a.unknown.length >= b.unknown.length) continue;
        if (!a.unknown.every((j) => b.unknown.includes(j))) continue;
        const diff = b.unknown.filter((j) => !a.unknown.includes(j));
        const left = b.need - a.need;
        if (left === 0) {
          for (const j of diff) if (known[j] === 0) { open(j); changed = true; }
        } else if (left === diff.length) {
          for (const j of diff) if (mark(j)) changed = true;
        }
      }
    }
    if (changed) continue;

    const unknownAll = [];
    for (let i = 0; i < total; i += 1) if (known[i] === 0) unknownAll.push(i);
    const remaining = bugs - found;
    if (unknownAll.length && remaining === 0) {
      for (const j of unknownAll) open(j);
      changed = true;
    } else if (unknownAll.length && remaining === unknownAll.length) {
      for (const j of unknownAll) mark(j);
      changed = true;
    }
  }
  return opened === total - bugs;
}

/**
 * 첫 칸과 그 이웃을 피해 버그를 놓는다. 찍기가 필요 없는 판이 나올 때까지 시드를 바꿔 다시 놓고,
 * 시도 횟수를 넘으면 마지막 판을 그대로 쓴다.
 *
 * @param level 난이도 항목
 * @param seed 정수 시드(같은 시드와 첫 칸이면 같은 판이 나온다)
 * @param start 처음 여는 칸 번호
 * @returns { mines, counts, guaranteed } guaranteed는 논리만으로 풀리는 판인지
 */
export function generate(level, seed, start) {
  const { cols, rows, bugs } = level;
  const table = neighborTable(cols, rows);
  const safe = new Set([start, ...table[start]]);
  const slots = [];
  for (let i = 0; i < cols * rows; i += 1) if (!safe.has(i)) slots.push(i);
  let last = null;
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const rng = makeRng((seed + Math.imul(attempt, 7919)) >>> 0);
    const mines = new Uint8Array(cols * rows);
    for (const i of shuffle(slots, rng).slice(0, bugs)) mines[i] = 1;
    const counts = countAround(mines, table);
    last = { mines, counts, guaranteed: true };
    if (isSolvable(mines, counts, level, start)) return last;
  }
  return { ...last, guaranteed: false };
}

/**
 * 아직 버그를 놓지 않은 새 판 상태를 만든다. 첫 칸을 열 때 그 칸을 피해 버그가 놓인다.
 *
 * @param levelId easy, normal, hard
 * @returns 게임 상태(phase는 ready)
 */
export function newGame(levelId) {
  const { cols, rows, bugs } = LEVELS[levelId];
  return {
    level: levelId,
    cols,
    rows,
    bugs,
    mines: null,
    counts: null,
    cells: new Uint8Array(cols * rows),
    phase: "ready",
    opened: 0,
    flags: 0,
    lostAt: -1,
    guaranteed: true,
  };
}

/**
 * 버그를 놓아 판을 시작 상태(playing)로 만든다. 칸은 열지 않는다.
 *
 * @param game ready 상태의 게임
 * @param seed 정수 시드
 * @param start 처음 여는 칸 번호
 * @returns playing 상태의 게임
 */
function activate(game, seed, start) {
  const { mines, counts, guaranteed } = generate(LEVELS[game.level], seed, start);
  return { ...game, mines, counts, guaranteed, phase: "playing" };
}

/**
 * 가운데 칸을 미리 열어 둔 고정 판을 만든다. 오늘의 판처럼 모두가 같은 판을 받을 때 쓴다.
 *
 * @param levelId easy, normal, hard
 * @param seed 정수 시드
 * @returns 게임 상태(phase는 playing)
 */
export function dailyGame(levelId, seed) {
  const game = newGame(levelId);
  const start = Math.floor(game.rows / 2) * game.cols + Math.floor(game.cols / 2);
  return open(activate(game, seed, start), start);
}

/**
 * 칸을 열고 빈 칸이면 이웃까지 번져 나가며 연다. 깃발 칸은 열지 않는다. 안전한 칸을 모두 열면 승리 상태가 된다.
 *
 * @param game playing 상태의 게임
 * @param index 칸 번호
 * @returns 새 게임 상태
 */
function open(game, index) {
  const table = neighborTable(game.cols, game.rows);
  const cells = game.cells.slice();
  let opened = game.opened;
  const stack = [index];
  while (stack.length) {
    const i = stack.pop();
    if (cells[i] !== HIDDEN) continue;
    cells[i] = OPEN;
    opened += 1;
    if (game.counts[i] === 0) for (const j of table[i]) if (cells[j] === HIDDEN) stack.push(j);
  }
  if (opened === game.cols * game.rows - game.bugs) {
    for (let i = 0; i < cells.length; i += 1) if (game.mines[i]) cells[i] = FLAG;
    return { ...game, cells, opened, flags: game.bugs, phase: "won" };
  }
  return { ...game, cells, opened };
}

/**
 * 칸 하나를 연다. 첫 칸이면 그 칸을 피해 버그를 놓는다. 버그를 열면 패배 상태가 된다.
 *
 * @param game 게임 상태
 * @param index 칸 번호
 * @param seed 첫 칸을 열 때 쓸 정수 시드(없으면 무작위)
 * @returns 새 게임 상태, 바뀐 것이 없으면 같은 객체
 */
export function reveal(game, index, seed = Math.floor(Math.random() * 2 ** 31)) {
  if (game.phase === "won" || game.phase === "lost" || game.cells[index] !== HIDDEN) return game;
  const ready = game.phase === "ready" ? activate(game, seed, index) : game;
  if (ready.mines[index]) return { ...ready, phase: "lost", lostAt: index };
  return open(ready, index);
}

/**
 * 칸의 깃발을 켜고 끈다. 열린 칸에는 꽂을 수 없다.
 *
 * @param game 게임 상태
 * @param index 칸 번호
 * @returns 새 게임 상태, 바뀐 것이 없으면 같은 객체
 */
export function toggleFlag(game, index) {
  if (game.phase === "won" || game.phase === "lost" || game.cells[index] === OPEN) return game;
  const cells = game.cells.slice();
  const flagged = cells[index] === FLAG;
  cells[index] = flagged ? HIDDEN : FLAG;
  return { ...game, cells, flags: game.flags + (flagged ? -1 : 1) };
}

/**
 * 열린 숫자 칸 주변의 깃발 수가 숫자와 같으면 나머지 닫힌 이웃을 한꺼번에 연다. 깃발이 틀렸으면 버그를 열어 패배한다.
 *
 * @param game 게임 상태
 * @param index 숫자 칸 번호
 * @returns 새 게임 상태, 바뀐 것이 없으면 같은 객체
 */
export function chord(game, index) {
  if (game.phase !== "playing" || game.cells[index] !== OPEN || game.counts[index] === 0) return game;
  const around = neighborTable(game.cols, game.rows)[index];
  if (around.filter((j) => game.cells[j] === FLAG).length !== game.counts[index]) return game;
  let next = game;
  for (const j of around) {
    if (next.cells[j] === HIDDEN) next = reveal(next, j);
    if (next.phase === "lost") break;
  }
  return next;
}

/**
 * 아직 깃발을 꽂지 않은 버그 수를 구한다. 깃발을 더 꽂으면 음수가 될 수 있다.
 *
 * @param game 게임 상태
 * @returns 버그 수에서 깃발 수를 뺀 값
 */
export function bugsLeft(game) {
  return game.bugs - game.flags;
}