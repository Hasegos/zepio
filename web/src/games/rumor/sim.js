import { profileOf, VILLAGERS } from "./village.js";

export const TURNS = 10;

/**
 * 소문이 열 턴 동안 퍼지는 과정을 계산한다. 무작위가 없어서 같은 입력은 항상 같은 결과다.
 * 씨앗으로 고른 사람은 0턴부터 소문을 믿는다. 믿는 사람은 정해진 턴 수만큼 가까운 이웃에게 소문을 전하고,
 * 이미 믿는 이웃은 건너뛴다. 해명을 들은 사람은 소문을 믿지도 전하지도 않고, 다른 사람도 그에게 소문을 전하지 않는다.
 *
 * @param village makeVillage가 만든 마을
 * @param options.kind 소문 종류 id
 * @param options.seeds 0턴부터 믿는 사람 번호 목록
 * @param options.immune 해명을 들은 사람 번호 목록
 * @returns { became, heard, from, counts } became[i]는 믿게 된 턴(안 믿으면 -1), heard[i]는 처음 들은 턴(못 들었으면 -1), from[i]는 소문을 전해 믿게 만든 사람(씨앗이면 -1), counts[t]는 t턴까지 믿은 사람 수
 */
export function simulate(village, { kind, seeds, immune }) {
  const blocked = new Set(immune);
  const became = Array(VILLAGERS).fill(-1);
  const heard = Array(VILLAGERS).fill(-1);
  const from = Array(VILLAGERS).fill(-1);
  const left = Array(VILLAGERS).fill(0);
  const sources = Array.from({ length: VILLAGERS }, () => new Set());
  for (const seed of seeds) {
    if (blocked.has(seed)) continue;
    became[seed] = 0;
    heard[seed] = 0;
    left[seed] = Math.max(1, profileOf(village.types[seed], kind).active);
  }
  const counts = [became.filter((turn) => turn === 0).length];
  for (let turn = 1; turn <= TURNS; turn += 1) {
    const incoming = Array.from({ length: VILLAGERS }, () => []);
    for (let person = 0; person < VILLAGERS; person += 1) {
      if (became[person] === -1 || became[person] >= turn || left[person] <= 0) continue;
      const { tells } = profileOf(village.types[person], kind);
      const targets = village.adj[person].filter(({ to }) => !blocked.has(to) && (became[to] === -1 || became[to] >= turn)).slice(0, tells);
      for (const { to } of targets) incoming[to].push(person);
      left[person] -= 1;
    }
    for (let person = 0; person < VILLAGERS; person += 1) {
      if (blocked.has(person) || became[person] !== -1 || !incoming[person].length) continue;
      for (const source of incoming[person]) sources[person].add(source);
      if (heard[person] === -1) heard[person] = turn;
      const profile = profileOf(village.types[person], kind);
      if (sources[person].size >= profile.threshold) {
        became[person] = turn;
        from[person] = incoming[person][0];
        left[person] = profile.active;
      }
    }
    counts.push(became.filter((value) => value !== -1 && value <= turn).length);
  }
  return { became, heard, from, counts };
}