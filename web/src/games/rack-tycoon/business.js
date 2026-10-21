import { makeRng } from "../_shared/rng.js";

export const MARKETS = {
  boom: { name: "AI 붐", mul: 1.5, live: 90, text: "AI 수요가 몰려 모든 수익이 1.5배예요." },
  upturn: { name: "클라우드 호황", mul: 1.25, live: 150, text: "클라우드 시장이 살아나 모든 수익이 1.25배예요." },
  invest: { name: "투자 유치", mul: 1, live: 0, text: "" },
};
export const CONTRACT_TYPES = {
  rate: { name: "수익 유지", need: 30, window: 150, rewardSeconds: 180 },
  safe: { name: "무사고 운영", need: 60, window: 180, rewardSeconds: 150 },
  earn: { name: "수익 달성", need: 0, window: 120, rewardSeconds: 200 },
};
const MARKET_MIN_LIFETIME = 5000;
const CONTRACT_MIN_LIFETIME = 2000;
const MARKET_GAP = [240, 480];
const CONTRACT_GAP = [120, 240];
const OFFER_SECONDS = 60;

/**
 * 시장과 계약의 진행 상태를 새로 만든다. 저장하지 않고 접속할 때마다 새로 시작한다.
 *
 * @param seed 난수 시드
 * @returns { seed, n, market, contract }
 */
export function newBusiness(seed = Date.now()) {
  return { seed: seed >>> 0, n: 0, market: { wait: null, event: null }, contract: { wait: null, offer: null, active: null } };
}

/**
 * 시장 이벤트가 모든 수익에 곱하는 배율을 구한다.
 *
 * @param biz 시장과 계약의 진행 상태
 * @returns 배율, 이벤트가 없으면 1
 */
export function marketMul(biz) {
  const e = biz.market.event;
  return e ? MARKETS[e.kind].mul : 1;
}

/**
 * 다음 난수를 뽑는다. 시드와 뽑은 횟수만으로 정해져서 같은 시드면 같은 결과가 나온다.
 *
 * @param biz 진행 상태
 * @returns 0 이상 1 미만의 수
 */
function roll(biz) {
  biz.n += 1;
  return makeRng(biz.seed + biz.n * 977)();
}

/**
 * 이번 계약의 조건을 만든다. 지금 초당 수익에 맞춰 조금 더 힘써야 채울 수 있게 정한다.
 *
 * @param biz 진행 상태
 * @param income 모든 건물의 초당 수익 합
 * @returns 계약 제안 { type, name, target, need, window, reward, left }
 */
function makeOffer(biz, income) {
  const types = Object.keys(CONTRACT_TYPES);
  const type = types[Math.floor(roll(biz) * types.length)];
  const info = CONTRACT_TYPES[type];
  const base = Math.max(1, income);
  const target = type === "rate" ? Math.round(base * 1.3 * 10) / 10 : type === "earn" ? Math.ceil(base * 150) : 0;
  return { type, name: info.name, target, need: type === "earn" ? target : info.need, window: info.window, reward: Math.ceil(base * info.rewardSeconds), left: OFFER_SECONDS };
}

/**
 * 계약 제안을 문장으로 바꾼다.
 *
 * @param c 계약 { type, target, need, window }
 * @returns 한 줄 설명
 */
export function describeContract(c) {
  if (c.type === "rate") return `${c.window}초 안에 초당 수익 ${c.target} 이상을 ${c.need}초 동안 유지하세요.`;
  if (c.type === "safe") return `${c.window}초 안에 고장난 서버 없이 ${c.need}초를 버티세요.`;
  return `${c.window}초 안에 코인 ${c.target}개를 버세요.`;
}

/**
 * 계약 제안을 받아들인다.
 *
 * @param biz 진행 상태
 * @param lifetime 지금 누적 수익
 * @returns 바뀐 진행 상태
 */
export function acceptContract(biz, lifetime) {
  const offer = biz.contract.offer;
  if (!offer) return biz;
  return { ...biz, contract: { ...biz.contract, offer: null, active: { ...offer, left: offer.window, done: 0, start: lifetime } } };
}

/**
 * 계약 제안을 거절한다.
 *
 * @param biz 진행 상태
 * @returns 바뀐 진행 상태
 */
export function declineContract(biz) {
  return { ...biz, contract: { ...biz.contract, offer: null, wait: null } };
}

/**
 * 시장과 계약을 한 걸음 진행한다. 보고 있을 때만 호출한다. 때가 되면 시장 이벤트나 계약 제안이 뜨고, 계약을 채우면 보상을 준다.
 *
 * @param state 게임 상태
 * @param biz 진행 상태
 * @param seconds 흐른 시간(초)
 * @param ctx { income, broken } 모든 건물의 초당 수익 합과 고장난 서버 수
 * @returns { state, biz, notes } notes는 { text, tone } 목록
 */
export function stepBusiness(state, biz, seconds, ctx) {
  const next = { ...biz, market: { ...biz.market }, contract: { ...biz.contract } };
  const notes = [];
  let coins = state.coins;
  let stats = state.stats;

  const m = next.market;
  if (m.event) {
    m.event = { ...m.event, left: m.event.left - seconds };
    if (m.event.left <= 0) {
      notes.push({ text: `${MARKETS[m.event.kind].name}이 끝났어요.`, tone: "ok" });
      m.event = null;
      m.wait = null;
    }
  } else if (state.lifetime >= MARKET_MIN_LIFETIME) {
    if (m.wait === null) m.wait = MARKET_GAP[0] + roll(next) * (MARKET_GAP[1] - MARKET_GAP[0]);
    m.wait -= seconds;
    if (m.wait <= 0) {
      const r = roll(next);
      const kind = r < 0.4 ? "boom" : r < 0.75 ? "upturn" : "invest";
      m.wait = null;
      if (kind === "invest") {
        const gain = Math.ceil(Math.max(1, ctx.income) * 90);
        coins += gain;
        notes.push({ text: `투자 유치! 코인 ${gain}개를 받았어요.`, tone: "good" });
      } else {
        m.event = { kind, left: MARKETS[kind].live };
        notes.push({ text: `${MARKETS[kind].name}! ${MARKETS[kind].text}`, tone: "good" });
      }
    }
  }

  const c = next.contract;
  if (c.active) {
    const a = { ...c.active, left: c.active.left - seconds };
    if (a.type === "rate" && ctx.income >= a.target) a.done += seconds;
    else if (a.type === "safe" && ctx.broken === 0) a.done += seconds;
    else if (a.type === "earn") a.done = Math.max(0, state.lifetime - a.start);
    if (a.done >= a.need) {
      coins += a.reward;
      stats = { ...stats, contracts: (stats.contracts ?? 0) + 1 };
      notes.push({ text: `계약 완료! ${a.name} 보상 코인 ${a.reward}개를 받았어요.`, tone: "good" });
      c.active = null;
      c.wait = null;
    } else if (a.left <= 0) {
      notes.push({ text: `계약 실패. ${a.name} 시간이 지났어요.`, tone: "bad" });
      c.active = null;
      c.wait = null;
    } else {
      c.active = a;
    }
  } else if (c.offer) {
    c.offer = { ...c.offer, left: c.offer.left - seconds };
    if (c.offer.left <= 0) {
      c.offer = null;
      c.wait = null;
    }
  } else if (state.lifetime >= CONTRACT_MIN_LIFETIME) {
    if (c.wait === null) c.wait = CONTRACT_GAP[0] + roll(next) * (CONTRACT_GAP[1] - CONTRACT_GAP[0]);
    c.wait -= seconds;
    if (c.wait <= 0) {
      c.offer = makeOffer(next, ctx.income);
      c.wait = null;
      notes.push({ text: `새 계약 제안: ${c.offer.name}. 위에서 받아들일 수 있어요.`, tone: "good" });
    }
  }
  return { state: coins === state.coins && stats === state.stats ? state : { ...state, coins, stats }, biz: next, notes };
}