import { hashSeed, makeRng, shuffle } from "../_shared/rng.js";
import { AREAS, decide, LADDER, SYMPTOMS, SYMPTOM_IDS, textsOf } from "./rules.js";

export const DAYS = 5;
export const PER_DAY = 6;
export const TOTAL = DAYS * PER_DAY;
export const MAX_METER = 10;
const ATTEMPTS = 800;
const TARGETED = 2;
const MIN_CHANGED = 2;
const MIN_KINDS = 4;
const MAX_SAME = 3;
const USERS = [3, 7, 15, 40, 85, 120, 260, 520, 1300, 2800];
const SMALL_USERS = USERS.slice(0, 5);
const HUGE = USERS.slice(-2);
const MINOR = ["wrong", "slow", "ui", "typo"];
const HIGH = ["down", "error", "cut"];
const RUN_TRIES = 20;

/**
 * 그날 새로 켜진 정책이 답을 바꾸도록 일부러 만드는 접수 건의 조건이다.
 * areas, symptoms로 영역과 증상을 좁히고 tweak이 나머지 값을 정한다.
 */
const TARGETS = {
  2: { areas: ["결제"], symptoms: MINOR, tweak: (report) => ({ ...report, repro: true }) },
  3: { areas: AREAS, symptoms: MINOR, tweak: (report, random) => ({ ...report, repro: true, tier: "vip", users: pick(SMALL_USERS, random) }) },
  4: { areas: ["로그인"], symptoms: HIGH, tweak: (report, random) => ({ ...report, repro: true, users: pick(SMALL_USERS, random) }) },
  5: { areas: AREAS, symptoms: MINOR, tweak: (report, random) => ({ ...report, repro: true, users: pick(HUGE, random) }) },
};

/**
 * 목록에서 하나를 고른다.
 *
 * @param list 후보 목록
 * @param random 난수 함수
 * @returns 고른 값
 */
function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

/**
 * 고객 등급을 확률에 따라 고른다. 일반이 가장 많고 VIP가 가장 적다.
 *
 * @param random 난수 함수
 * @returns free, pro, vip 중 하나
 */
function pickTier(random) {
  const roll = random();
  if (roll < 0.55) return "free";
  return roll < 0.85 ? "pro" : "vip";
}

/**
 * 접수 건 하나를 만든다. 중복 여부(dup)는 일단 false로 두고 판 전체가 만들어진 뒤에 정한다.
 *
 * @param id 접수 번호
 * @param kind bug 또는 request
 * @param area 영역
 * @param symptom 증상 id (기능 요청은 request)
 * @param random 난수 함수
 * @returns 접수 건
 */
function makeReport(id, kind, area, symptom, random) {
  const texts = textsOf(symptom);
  return {
    id,
    kind,
    area,
    symptom,
    repro: random() < 0.75,
    workaround: random() < 0.4,
    tier: pickTier(random),
    users: pick(USERS, random),
    title: pick(texts.titles, random).replace("{a}", area),
    memo: pick(texts.memos, random),
    dup: false,
  };
}

/**
 * 영역과 증상 쌍을 키로 바꾼다.
 *
 * @param area 영역
 * @param symptom 증상 id
 * @returns 키 문자열
 */
function keyOf(area, symptom) {
  return `${area}|${symptom}`;
}

/**
 * 하루 6건을 만든다. 중복 1~2건, 기능 요청 0~1건, 나머지는 새 버그다.
 * 2일차부터는 그날 새 정책이 답을 바꾸는 건을 둘 이상 넣고, 답의 종류가 고르게 섞였는지 확인한다.
 *
 * @param day 일차(1~5)
 * @param firstId 이 날 첫 접수 번호
 * @param history 앞선 날들의 접수 건(중복 여부가 정해진 것)
 * @param random 난수 함수
 * @returns 접수 건 목록
 */
function makeDay(day, firstId, history, random) {
  const oldKeys = [...new Set(history.filter((report) => report.kind === "bug").map((report) => keyOf(report.area, report.symptom)))];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const dups = day === 1 ? 0 : 1 + (random() < 0.4 ? 1 : 0);
    const requests = random() < 0.5 ? 1 : 0;
    const slots = shuffle([...Array(dups).fill("dup"), ...Array(requests).fill("request"), ...Array(PER_DAY - dups - requests).fill("bug")], random);
    const sources = shuffle(oldKeys, random);
    const used = new Set(oldKeys);
    const target = TARGETS[day];
    let targeted = 0;
    const reports = [];
    let failed = false;
    for (const [index, slot] of slots.entries()) {
      const id = firstId + index;
      if (slot === "dup") {
        const [area, symptom] = sources.pop().split("|");
        reports.push({ ...makeReport(id, "bug", area, symptom, random), dup: true });
      } else if (slot === "request") {
        reports.push(makeReport(id, "request", pick(AREAS, random), "request", random));
      } else {
        const aim = target && targeted < TARGETED;
        const areas = aim ? target.areas : AREAS;
        const symptoms = aim ? target.symptoms : SYMPTOM_IDS;
        const choices = areas.flatMap((area) => symptoms.map((symptom) => [area, symptom])).filter(([area, symptom]) => !used.has(keyOf(area, symptom)));
        if (!choices.length) {
          failed = true;
          break;
        }
        const [area, symptom] = pick(choices, random);
        used.add(keyOf(area, symptom));
        const report = makeReport(id, "bug", area, symptom, random);
        reports.push(aim ? target.tweak(report, random) : report);
        if (aim) targeted += 1;
      }
    }
    if (failed) continue;
    const actions = reports.map((report) => decide(report, day).action);
    const counts = actions.reduce((map, action) => map.set(action, (map.get(action) ?? 0) + 1), new Map());
    if (counts.size < MIN_KINDS || Math.max(...counts.values()) > MAX_SAME) continue;
    if (day >= 2 && reports.filter((report) => decide(report, day).action !== decide(report, day - 1).action).length < MIN_CHANGED) continue;
    return reports;
  }
  throw new Error(`${day}일차를 만들지 못했어요`);
}

/**
 * 시드로 한 판 5일치 접수 건을 만든다. 하루에 6건이고 접수 번호는 1부터 30까지 이어진다.
 *
 * @param seed 정수 시드
 * @returns 날짜별 접수 건 목록(길이 5)
 */
export function makeRun(seed) {
  const random = makeRng(seed);
  for (let tries = 0; tries < RUN_TRIES; tries += 1) {
    try {
      const days = [];
      const history = [];
      for (let day = 1; day <= DAYS; day += 1) {
        const reports = makeDay(day, history.length + 1, history, random);
        days.push(reports);
        history.push(...reports);
      }
      return days;
    } catch {
      continue;
    }
  }
  throw new Error(`판을 만들지 못했어요: ${seed}`);
}

/**
 * 날짜의 오늘의 도전 5일치를 만든다. 같은 날짜는 항상 같은 판이다.
 *
 * @param date YYYY-MM-DD
 * @returns 날짜별 접수 건 목록
 */
export function dailyRun(date) {
  return makeRun(hashSeed(`bug-desk:${date}`));
}

/**
 * 고른 처리 방법을 정답과 견주어 결과를 낸다. 틀리면 신뢰나 팀 체력이 깎인다.
 *
 * @param report 접수 건
 * @param action 고른 처리 방법의 id
 * @param day 일차
 * @returns { ok, correct, steps, trust, energy, note } trust와 energy는 0 이하의 변화량
 */
export function judge(report, action, day) {
  const { action: correct, steps } = decide(report, day);
  if (action === correct) return { ok: true, correct, steps, trust: 0, energy: 0, note: "" };
  const chosenRank = LADDER.indexOf(action);
  const correctRank = LADDER.indexOf(correct);
  if (chosenRank >= 0 && correctRank >= 0) {
    if (chosenRank < correctRank) {
      return correct === "p0"
        ? { ok: false, correct, steps, trust: -2, energy: 0, note: "장애가 났어요. 급한 건을 늦게 다뤄서 신뢰가 크게 떨어졌어요." }
        : { ok: false, correct, steps, trust: -1, energy: 0, note: "처리가 늦어져서 고객이 불만을 남겼어요." };
    }
    return action === "p0"
      ? { ok: false, correct, steps, trust: 0, energy: -2, note: "급하지 않은 일에 팀이 야근했어요." }
      : { ok: false, correct, steps, trust: 0, energy: -1, note: "팀이 불필요하게 바빠졌어요." };
  }
  if (action === "dup") return { ok: false, correct, steps, trust: -1, energy: 0, note: "중복이 아닌데 닫아서 고객이 화를 냈어요." };
  if (action === "info") return { ok: false, correct, steps, trust: -1, energy: 0, note: "물어볼 필요가 없는데 또 물어서 고객이 지쳤어요." };
  return { ok: false, correct, steps, trust: 0, energy: -1, note: "이미 있거나 정보가 없는 건에 일을 시작해서 시간을 썼어요." };
}

/**
 * 맞힌 개수와 마지막 게이지로 결말을 정한다. 신뢰가 0이면 고객 이탈, 팀 체력이 0이면 번아웃이 먼저다.
 *
 * @param score 맞힌 개수
 * @param trust 마지막 신뢰
 * @param energy 마지막 팀 체력
 * @returns { id, title, text }
 */
export function endingOf(score, trust, energy) {
  if (trust <= 0) return { id: "churn", title: "고객이 모두 떠났어요", text: "잘못된 분류가 쌓여서 고객 신뢰가 바닥났어요." };
  if (energy <= 0) return { id: "burnout", title: "팀이 번아웃했어요", text: "급하지 않은 일에 팀을 너무 갈아 넣었어요." };
  if (score >= 28) return { id: "lead", title: "전설의 QA 리드", text: "정책서를 외운 듯한 정확한 분류였어요." };
  if (score >= 24) return { id: "reliable", title: "믿음직한 접수 담당", text: "정책이 바뀌어도 거의 흔들리지 않았어요." };
  if (score >= 18) return { id: "rookie", title: "정책서를 읽는 신입", text: "기본기는 있고 새 정책에서 가끔 헷갈렸어요." };
  if (score >= 12) return { id: "confused", title: "아직 헷갈리는 접수 담당", text: "정책서를 한 번 더 천천히 읽어 보세요." };
  return { id: "fire", title: "접수처가 불타고 있어요", text: "내일은 정책서부터 차근차근 읽어 보세요." };
}

/**
 * 증상 id의 화면용 이름을 돌려준다. 기능 요청은 "기능 요청"이다.
 *
 * @param symptom 증상 id 또는 request
 * @returns 이름
 */
export function symptomLabel(symptom) {
  return symptom === "request" ? "기능 요청" : SYMPTOMS[symptom].label;
}