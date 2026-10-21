export const SHAPES = ["circle", "triangle", "square", "diamond"];
export const COLORS = ["amber", "cyan", "indigo", "pink"];
export const COUNTS = [1, 2, 3];
export const SHAPE_NAMES = { circle: "원", triangle: "삼각형", square: "사각형", diamond: "마름모" };
export const COLOR_NAMES = { amber: "주황", cyan: "청록", indigo: "남색", pink: "분홍" };
export const CARD_TOTAL = SHAPES.length * COLORS.length * COUNTS.length;

/**
 * 카드 번호를 모양, 색, 개수로 풀어 준다. 번호는 모양, 색, 개수 순으로 센다.
 *
 * @param index 0 이상 CARD_TOTAL 미만의 카드 번호
 * @returns { shape, color, count }
 */
export function cardOf(index) {
  return {
    shape: SHAPES[Math.floor(index / (COLORS.length * COUNTS.length))],
    color: COLORS[Math.floor(index / COUNTS.length) % COLORS.length],
    count: COUNTS[index % COUNTS.length],
  };
}

/**
 * 카드를 소리 내어 읽을 문장으로 바꾼다.
 *
 * @param card { shape, color, count }
 * @returns 예: 주황 원 2개
 */
export function cardLabel(card) {
  return `${COLOR_NAMES[card.color]} ${SHAPE_NAMES[card.shape]} ${card.count}개`;
}

/**
 * 단어 끝에 받침이 있는지 보고 주격 조사를 고른다.
 *
 * @param word 한글로 끝나는 단어
 * @returns 받침이 있으면 "이", 없으면 "가"
 */
function josa(word) {
  return (word.charCodeAt(word.length - 1) - 0xac00) % 28 === 0 ? "가" : "이";
}

const ATOMS = [
  ...SHAPES.map((value) => ({ id: `shape:${value}`, attr: "shape", head: "모양이", value: SHAPE_NAMES[value], test: (card) => card.shape === value, negatable: true })),
  ...COLORS.map((value) => ({ id: `color:${value}`, attr: "color", head: "색이", value: COLOR_NAMES[value], test: (card) => card.color === value, negatable: true })),
  ...COUNTS.map((value) => ({ id: `count:${value}`, attr: "count", head: "개수가", value: `${value}개`, test: (card) => card.count === value, negatable: true })),
  { id: "count:odd", attr: "count", head: "개수가", value: "홀수", test: (card) => card.count % 2 === 1, negatable: false },
  { id: "count:ge2", attr: "count", head: "개수가", value: "2개 이상", test: (card) => card.count >= 2, negatable: false },
  { id: "count:le2", attr: "count", head: "개수가", value: "2개 이하", test: (card) => card.count <= 2, negatable: false },
];

/**
 * 속성 하나의 조건을 문장 조각으로 쓴다.
 *
 * @param atom 속성 조건
 * @returns 예: 모양이 원
 */
function atomText(atom) {
  return `${atom.head} ${atom.value}`;
}

/**
 * 규칙의 참 거짓을 모든 카드에 대해 한 줄 글자로 적는다. 같은 규칙을 가려내는 데 쓴다.
 *
 * @param test 카드를 받아 참 거짓을 돌려주는 함수
 * @returns 0과 1로 된 글자
 */
function tableOf(test) {
  let out = "";
  for (let i = 0; i < CARD_TOTAL; i += 1) out += test(cardOf(i)) ? "1" : "0";
  return out;
}

/**
 * 규칙 목록을 만든다. 난이도 1은 속성 하나, 2는 부정과 개수 조건, 3은 속성 둘의 조합이다.
 * 모든 카드에서 같은 결과를 내는 규칙은 낮은 난이도 하나만 남긴다.
 *
 * @returns { id, level, text, test, table } 목록
 */
function buildRules() {
  const all = [];
  for (const atom of ATOMS) {
    if (atom.id.startsWith("count:") && !/^count:\d$/.test(atom.id)) {
      all.push({ id: atom.id, level: 2, text: atomText(atom), test: atom.test });
    } else {
      all.push({ id: atom.id, level: 1, text: atomText(atom), test: atom.test });
    }
    if (atom.negatable) {
      all.push({ id: `not:${atom.id}`, level: 2, text: `${atom.head} ${atom.value}${josa(atom.value)} 아님`, test: (card) => !atom.test(card) });
    }
  }
  for (let i = 0; i < ATOMS.length; i += 1) {
    for (let j = i + 1; j < ATOMS.length; j += 1) {
      const a = ATOMS[i];
      const b = ATOMS[j];
      if (a.attr === b.attr) continue;
      all.push({ id: `${a.id}&${b.id}`, level: 3, text: `${atomText(a)}이면서 ${atomText(b)}`, test: (card) => a.test(card) && b.test(card) });
      all.push({ id: `${a.id}|${b.id}`, level: 3, text: `${atomText(a)}이거나 ${atomText(b)}`, test: (card) => a.test(card) || b.test(card) });
    }
  }
  const seen = new Map();
  for (const rule of all.sort((x, y) => x.level - y.level)) {
    const table = tableOf(rule.test);
    if (!seen.has(table) && /1/.test(table) && /0/.test(table)) seen.set(table, { ...rule, table });
  }
  return [...seen.values()];
}

export const RULES = buildRules();
const BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

/**
 * 규칙 번호표로 규칙을 찾는다.
 *
 * @param id 규칙 id
 * @returns 규칙, 없으면 undefined
 */
export function ruleById(id) {
  return BY_ID.get(id);
}