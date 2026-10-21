export const SITE_TYPES = {
  basement: {
    name: "지하 서버실",
    cost: 0,
    incomeMul: 1,
    heatMul: 1,
    baseCap: 4,
    repairMul: 1,
    weights: { surge: 3, blackout: 2, fire: 2 },
    theme: "#e8ecff",
    text: "처음 시작하는 작은 서버실이에요. 특별한 장단점이 없어요.",
  },
  downtown: {
    name: "도심 빌딩",
    cost: 200000,
    incomeMul: 1.3,
    heatMul: 1.1,
    baseCap: 3,
    repairMul: 1,
    weights: { surge: 3, blackout: 2, fire: 4 },
    theme: "#efe6ff",
    text: "수익 ×1.3. 전력이 빠듯하고 열이 조금 많고 화재가 잦아요.",
  },
  suburb: {
    name: "교외 센터",
    cost: 1000000,
    incomeMul: 1,
    heatMul: 1,
    baseCap: 16,
    repairMul: 1,
    weights: { surge: 2, blackout: 4, fire: 2 },
    theme: "#e4f4e2",
    text: "기본 전력이 넉넉해요. 대신 정전이 잦아요.",
  },
  polar: {
    name: "극지 센터",
    cost: 5000000,
    incomeMul: 1,
    heatMul: 0.6,
    baseCap: 2,
    repairMul: 1,
    weights: { surge: 1, blackout: 4, fire: 1 },
    theme: "#e0f2fb",
    text: "열이 40% 덜 나서 서버를 빽빽이 놓아도 돼요. 기본 전력이 거의 없어요.",
  },
  seabed: {
    name: "해저 센터",
    cost: 20000000,
    incomeMul: 1.2,
    heatMul: 0.7,
    baseCap: 4,
    repairMul: 2,
    weights: { surge: 3, blackout: 3, fire: 0 },
    theme: "#cde9ee",
    text: "수익 ×1.2, 열 30% 감소, 화재 없음. 수리비가 두 배예요.",
  },
};
export const SITE_IDS = Object.keys(SITE_TYPES);
export const MAX_SITES = SITE_IDS.length;

/**
 * 건물 종류의 특성을 구한다. 모르는 종류는 지하 서버실로 본다.
 *
 * @param type 건물 종류
 * @returns 건물 특성
 */
export function traitOf(type) {
  return Object.hasOwn(SITE_TYPES, type) ? SITE_TYPES[type] : SITE_TYPES.basement;
}
export const NET_BONUS = 0.08;
export const NET_MAX = 4;

/**
 * 한 건물에 이어진 건물이 몇 개인지 센다.
 *
 * @param links 건물 종류 쌍의 목록
 * @param type 건물 종류
 * @returns 연결 수
 */
export function connectionsOf(links, type) {
  return links.filter((pair) => pair.includes(type)).length;
}

export const BADGE_BONUS = 0.01;
export const BRAND_BONUS = 0.05;
export const REBRAND_MIN = 40000000;

/**
 * 리브랜딩하면 얻는 브랜드 포인트를 구한다. 누적 수익 100만마다 제곱근으로 늘어난다.
 *
 * @param lifetime 누적 수익
 * @returns 포인트
 */
export function brandGain(lifetime) {
  return Math.floor(Math.sqrt(lifetime / 1000000));
}

export const ROBOT_UPS = {
  speed: { name: "로봇 속도", max: 5, base: 500, growth: 4, effect: (lv) => `이동 속도 ×${(1 + 0.25 * lv).toFixed(2)}` },
  discount: { name: "수리 할인", max: 4, base: 3000, growth: 5, effect: (lv) => `수리비 -${lv * 12}%` },
  drone: { name: "정비 드론", max: 4, base: 30000, growth: 6, effect: (lv) => (lv ? `${droneInterval(lv)}초마다 고장난 서버 1대를 알아서 고쳐요` : "고장난 서버를 알아서 고쳐요") },
};

/**
 * 정비 드론이 서버 하나를 고치는 간격을 구한다.
 *
 * @param level 드론 단계(1 이상)
 * @returns 초
 */
export function droneInterval(level) {
  return 60 / 2 ** (level - 1);
}

/**
 * 로봇 강화를 한 단계 올리는 값을 구한다.
 *
 * @param key 강화 종류(speed, discount, drone)
 * @param level 지금 단계
 * @returns 코인
 */
export function robotCost(key, level) {
  return Math.ceil(ROBOT_UPS[key].base * ROBOT_UPS[key].growth ** level);
}

export const RESEARCH = {
  cooling: { name: "냉각 효율", branch: "인프라", max: 3, base: 20000, growth: 4, effect: (lv) => `냉각기 효과 +${lv * 10}%` },
  hub: { name: "허브 증폭", branch: "인프라", max: 2, base: 50000, growth: 6, effect: (lv) => `허브 범위 +${lv}칸` },
  power: { name: "발전 효율", branch: "인프라", max: 3, base: 30000, growth: 4, effect: (lv) => `발전기 출력 +${lv * 10}%` },
  warn: { name: "조기 경보", branch: "안전", max: 2, base: 40000, growth: 5, effect: (lv) => `재난 경고 시간 +${lv * 5}초` },
  battery: { name: "배터리 개선", branch: "안전", max: 3, base: 25000, growth: 4, effect: (lv) => `배터리 용량 +${lv * 25}%` },
  fire: { name: "소화 개량", branch: "안전", max: 2, base: 60000, growth: 6, effect: (lv) => `소화기 범위 +${lv}칸` },
  profit: { name: "알고리즘 최적화", branch: "경영", max: 4, base: 100000, growth: 5, effect: (lv) => `전체 수익 +${lv * 5}%` },
};

/**
 * 연구를 한 단계 올리는 값을 구한다.
 *
 * @param key 연구 종류
 * @param level 지금 단계
 * @returns 코인
 */
export function researchCost(key, level) {
  return Math.ceil(RESEARCH[key].base * RESEARCH[key].growth ** level);
}
