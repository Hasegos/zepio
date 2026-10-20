/**
 * 한글 단어 끝소리에 받침이 있는지 확인한다. 한글이 아니면 받침이 없다고 본다.
 *
 * @param word 단어
 * @returns 받침이 있으면 true
 */
function hasFinal(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/**
 * 단어에 알맞은 조사를 붙인다.
 *
 * @param word 단어
 * @param pair "은/는", "이/가", "와/과" 같은 받침 있음/없음 쌍
 * @returns 조사를 붙인 단어
 */
function josa(word, pair) {
  const [withFinal, without] = pair.split("/");
  return `${word}${hasFinal(word) ? withFinal : without}`;
}

/**
 * 진술의 내용을 문장으로 만든다.
 *
 * @param claim { t: "is" | "not" | "in" | "notin", x?, xs? } 범인에 대한 주장
 * @param names 용의자 이름 목록
 * @returns 진술 문장
 */
function claimText(claim, names) {
  switch (claim.t) {
    case "is":
      return `범인은 ${names[claim.x]}입니다.`;
    case "not":
      return `범인은 ${josa(names[claim.x], "이/가")} 아닙니다.`;
    case "in":
      return `범인은 ${josa(names[claim.xs[0]], "과/와")} ${names[claim.xs[1]]} 중 한 명입니다.`;
    default:
      return `범인은 ${josa(names[claim.xs[0]], "과/와")} ${names[claim.xs[1]]} 모두 아닙니다.`;
  }
}

/**
 * 범인이 누구일 때 진술이 참인지 확인한다.
 *
 * @param claim 범인에 대한 주장
 * @param culprit 범인 번호
 * @returns 참이면 true
 */
function claimHolds(claim, culprit) {
  switch (claim.t) {
    case "is":
      return culprit === claim.x;
    case "not":
      return culprit !== claim.x;
    case "in":
      return claim.xs.includes(culprit);
    default:
      return !claim.xs.includes(culprit);
  }
}

/**
 * 참인 진술이 정확히 truths개가 되는 범인 후보를 모두 구한다.
 *
 * @param claims 진술 목록 [{ who, ...claim }]
 * @param count 용의자 수
 * @param truths 참인 진술의 수
 * @returns 후보 번호 목록(정답이 되는 퍼즐은 하나뿐이다)
 */
function culpritsOf(claims, count, truths) {
  return [...Array(count).keys()].filter((c) => claims.filter((cl) => claimHolds(cl, c)).length === truths);
}

/**
 * 진술 모순 퍼즐을 만든다. 정답은 진술에서 계산하고, 후보가 하나가 아니면 만들지 못한다.
 *
 * @param def { id, title, intro, suspects, truths, claims }
 * @returns 퍼즐
 */
export function liarsPuzzle(def) {
  const { suspects, truths, claims } = def;
  const found = culpritsOf(claims, suspects.length, truths);
  if (found.length !== 1) throw new Error(`${def.id}: 정답이 ${found.length}개`);
  const [culprit] = found;
  const speakers = claims.filter((cl) => claimHolds(cl, culprit)).map((cl) => suspects[cl.who]);
  return {
    id: def.id,
    title: def.title,
    intro: def.intro,
    kind: "liars",
    prompt: `용의자 ${suspects.length}명 중 정확히 ${truths}명만 진실을 말합니다. 범인은 누구일까요?`,
    docs: [],
    suspects,
    truths,
    claims,
    items: claims.map((cl) => `${suspects[cl.who]}: "${claimText(cl, suspects)}"`),
    options: suspects,
    answer: [culprit],
    kinds: {},
    explain: `범인은 ${suspects[culprit]}입니다. ${josa(suspects[culprit], "이/가")} 범인일 때 참인 진술은 ${speakers.join(", ")}의 ${truths}개뿐이에요. 다른 사람을 범인으로 놓으면 참인 진술 수가 ${truths}개와 맞지 않아 모순이 생깁니다. 한 명씩 범인이라고 가정하고 진술을 세어 보는 것이 가장 확실한 방법이에요.`,
    hints: [
      "진술이 참이라고 가정해 보고, 다른 진술과 부딪히는지 확인해 보세요.",
      `참인 진술은 정확히 ${truths}개입니다. 범인 후보를 한 명씩 바꿔 가며 참인 진술이 몇 개인지 세어 보세요.`,
      `범인은 ${suspects[culprit]}입니다.`,
    ],
  };
}

function firstSlotHint({ slots, cats, solution }) {
  const items = cats.map((cat, c) => cat.options[solution[c][0]]);
  const head = items.slice(0, -1).map((item) => `${item}, `).join("");
  return `${slots[0]}에는 ${head}${josa(items.at(-1), "이/가")} 있습니다.`;
}

const AXIS = {
  seat: {
    at: (slot) => `${slot}입니다.`,
    left: (a, b) => `${josa(a, "은/는")} ${b}보다 왼쪽에 있습니다.`,
    next: (a, b) => `${josa(a, "과/와")} ${josa(b, "은/는")} 바로 이웃해 있습니다.`,
  },
  time: {
    at: (slot) => `${slot}입니다.`,
    left: (a, b) => `${josa(a, "은/는")} ${b}보다 먼저입니다.`,
    next: (a, b) => `${josa(a, "과/와")} ${josa(b, "은/는")} 바로 이어서 일어났습니다.`,
  },
};

/**
 * 격자 논리 단서를 문장으로 만든다.
 *
 * @param clue { t, a, b?, p? } a와 b는 [분류 번호, 항목 번호], p는 칸 번호
 * @param puzzle { cats, slots, unit, axis }
 * @returns 단서 문장
 */
function clueText(clue, puzzle) {
  const name = ([c, o]) => puzzle.cats[c].options[o];
  const a = name(clue.a);
  const b = clue.b ? name(clue.b) : "";
  const words = AXIS[puzzle.axis];
  switch (clue.t) {
    case "eq":
      return `${josa(a, "과/와")} ${josa(b, "은/는")} 같은 ${puzzle.unit}입니다.`;
    case "ne":
      return `${josa(a, "과/와")} ${josa(b, "은/는")} 다른 ${puzzle.unit}입니다.`;
    case "at":
      return `${josa(a, "은/는")} ${words.at(puzzle.slots[clue.p])}`;
    case "notat":
      return `${josa(a, "은/는")} ${josa(puzzle.slots[clue.p], "이/가")} 아닙니다.`;
    case "left":
      return words.left(a, b);
    default:
      return words.next(a, b);
  }
}

/**
 * 격자 논리 퍼즐을 만든다. 해답과 단서는 데이터로 주고, 문장과 힌트와 해설은 여기서 만든다.
 *
 * @param def { id, title, intro, unit, axis, slots, cats: [{ name, options }], solution, clues }
 * @returns 퍼즐
 */
export function gridPuzzle(def) {
  const { slots, cats, solution } = def;
  const lines = slots.map((slot, s) => `${slot}: ${cats.map((cat, c) => cat.options[solution[c][s]]).join(", ")}`);
  return {
    id: def.id,
    title: def.title,
    intro: def.intro,
    kind: "grid",
    prompt: `단서를 읽고 표를 채우세요. 칸을 누를 때마다 비어 있음, ✗(아님), ●(맞음)로 바뀝니다. 줄마다 ●는 하나뿐입니다.`,
    docs: [],
    unit: def.unit,
    axis: def.axis,
    slots,
    cats,
    clues: def.clues,
    items: def.clues.map((clue) => clueText(clue, def)),
    answer: solution,
    kinds: {},
    explain: `정답은 ${lines.join(" / ")}입니다. 확실한 단서 하나에서 시작해 ✗로 가능성을 지워 나가면 마지막에 하나만 남아요. 추측으로 채우지 않고 단서가 허락하는 칸만 채우는 것이 추리의 기본입니다.`,
    hints: [
      "자리나 순서가 곧바로 정해지는 단서부터 표에 ●로 채우고, 같은 줄과 같은 열의 나머지 칸은 ✗로 지우세요.",
      "단서마다 메모 색을 칠해 두면 이미 쓴 단서와 아직 안 쓴 단서를 구분할 수 있어요. 한 줄과 한 열에는 ●가 하나뿐입니다.",
      firstSlotHint(def),
    ],
  };
}