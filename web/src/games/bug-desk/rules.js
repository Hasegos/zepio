export const AREAS = ["로그인", "결제", "검색", "알림", "업로드", "프로필", "대시보드", "설정"];

export const SYMPTOMS = {
  lost: { label: "데이터 사라짐", severity: "crit" },
  down: { label: "실행 불가", severity: "high" },
  error: { label: "오류 발생", severity: "high" },
  cut: { label: "연결 끊김", severity: "high" },
  wrong: { label: "값이 틀림", severity: "mid" },
  slow: { label: "느려짐", severity: "mid" },
  ui: { label: "화면 깨짐", severity: "low" },
  typo: { label: "오타", severity: "trivial" },
};
export const SYMPTOM_IDS = Object.keys(SYMPTOMS);
export const SEVERITY_LABELS = { crit: "치명", high: "높음", mid: "중간", low: "낮음", trivial: "사소" };
export const TIER_LABELS = { free: "일반", pro: "프로", vip: "VIP" };

export const ACTIONS = [
  { id: "p0", label: "P0 즉시", note: "지금 바로 고칩니다" },
  { id: "p1", label: "P1 이번 스프린트", note: "이번 주기 안에 고칩니다" },
  { id: "p2", label: "P2 다음 스프린트", note: "다음 주기에 고칩니다" },
  { id: "backlog", label: "백로그", note: "목록에 쌓아 둡니다" },
  { id: "info", label: "정보 요청", note: "재현 방법을 다시 묻습니다" },
  { id: "dup", label: "중복 종료", note: "이미 접수된 건으로 닫습니다" },
];
export const ACTION_IDS = ACTIONS.map((action) => action.id);
export const LADDER = ["backlog", "p2", "p1", "p0"];

export const MASS_USERS = 100;
export const HUGE_USERS = 1000;

export const POLICIES = [
  {
    day: 1,
    title: "기본 정책",
    rules: [
      "기능 요청은 모두 백로그로 보냅니다.",
      "같은 영역에 같은 증상이 이미 접수돼 있으면 중복 종료합니다. 기능 요청은 해당하지 않습니다.",
      "재현 단계가 없으면 정보를 요청합니다. 단, 치명 증상은 재현 단계가 없어도 처리합니다.",
      "치명은 P0입니다. 높음은 영향 100명 이상이면 P0, 아니면 P1입니다. 중간은 영향 100명 이상이면 P1, 아니면 P2입니다. 낮음은 우회 방법이 있으면 백로그, 없으면 P2입니다. 사소는 백로그입니다.",
    ],
  },
  { day: 2, title: "결제 강화", rules: ["결제 영역의 버그는 우선순위를 한 단계 올립니다. (백로그 → P2 → P1 → P0)"] },
  { day: 3, title: "VIP 응대", rules: ["VIP 고객의 버그는 최소 P1으로 처리합니다."] },
  { day: 4, title: "로그인 장애 대응", rules: ["로그인 영역에서 증상이 높음이면 영향 인원과 관계없이 P0입니다."] },
  { day: 5, title: "대규모 영향", rules: ["영향이 1,000명 이상이면 증상과 관계없이 P0입니다."] },
];
export const DAY_NOTE = "정책 2번 이후는 위 기본 정책의 결과가 P0~백로그일 때만 번호 순서대로 적용합니다. 정보 요청과 중복 종료는 바뀌지 않습니다.";

const TEXTS = {
  lost: {
    titles: ["{a} 화면에서 입력한 내용이 사라졌어요", "{a} 기능을 쓴 뒤 내 데이터가 통째로 없어졌어요"],
    memos: ["저장 버튼을 눌렀는데 다시 들어가 보니 비어 있어요.", "어제까지 있던 기록이 하나도 안 보여요."],
  },
  down: {
    titles: ["{a} 화면이 열리지 않아요", "{a} 버튼을 누르면 앱이 꺼져요"],
    memos: ["몇 번을 다시 해도 같은 곳에서 멈춰요.", "다른 기능은 되는데 여기만 안 돼요."],
  },
  error: {
    titles: ["{a} 화면에서 오류 메시지가 떠요", "{a} 기능을 쓰면 알 수 없는 오류가 나요"],
    memos: ["빨간 경고창이 뜨고 아무것도 진행이 안 돼요.", "같은 오류가 세 번 연속으로 나왔어요."],
  },
  cut: {
    titles: ["{a} 화면을 쓰다가 연결이 끊겨요", "{a} 화면에서 자꾸 로그아웃돼요"],
    memos: ["하던 작업이 중간에 멈춰요.", "몇 분마다 같은 일이 반복돼요."],
  },
  wrong: {
    titles: ["{a} 화면의 숫자가 실제와 달라요", "{a} 결과가 어제와 다르게 나와요"],
    memos: ["직접 계산해 보니 값이 맞지 않아요.", "새로고침할 때마다 다른 값이 보여요."],
  },
  slow: {
    titles: ["{a} 화면이 너무 느려요", "{a} 화면을 열 때마다 한참 걸려요"],
    memos: ["기다리다 지쳐서 그냥 닫았어요.", "예전에는 이렇게 느리지 않았어요."],
  },
  ui: {
    titles: ["{a} 화면의 버튼이 겹쳐 보여요", "{a} 화면 글자가 잘려서 보여요"],
    memos: ["쓰는 데는 지장이 없는데 보기 불편해요.", "스마트폰에서만 그렇게 보여요."],
  },
  typo: {
    titles: ["{a} 화면 안내 문구에 오타가 있어요", "{a} 화면의 문장이 어색해요"],
    memos: ["'확인'이 '화인'으로 적혀 있어요.", "번역투라서 무슨 말인지 헷갈려요."],
  },
  request: {
    titles: ["{a} 화면에 다크 모드를 넣어 주세요", "{a} 화면에서 내보내기를 지원해 주세요", "{a} 화면에 단축키가 있으면 좋겠어요"],
    memos: ["있으면 훨씬 편할 것 같아요.", "다른 서비스에는 이미 있어요."],
  },
};

/**
 * 증상에 맞는 제목과 고객 메모 문구 후보를 돌려준다. 기능 요청은 symptom이 "request"다.
 *
 * @param symptom 증상 id 또는 "request"
 * @returns { titles, memos } 문구 후보, {a}는 영역 이름 자리
 */
export function textsOf(symptom) {
  return TEXTS[symptom];
}

const LADDER_LABELS = ["백로그", "P2", "P1", "P0"];

/**
 * 판정 근거에 덧붙일, 그 증상 등급에서 결과를 가르는 조건을 문장으로 만든다.
 *
 * @param severity 증상 등급
 * @param report 접수 건
 * @returns 조건 문장 조각, 결과를 가르는 조건이 없으면 빈 문자열
 */
function detailOf(severity, report) {
  if (severity === "low") return `, 우회 방법 ${report.workaround ? "있음" : "없음"}`;
  if (severity === "high" || severity === "mid") return `, 영향 ${report.users}명`;
  return "";
}

/**
 * 접수 건을 정책으로 판정한다. 정답과 그 근거를 함께 돌려준다.
 *
 * @param report { kind, area, symptom, repro, workaround, tier, users, dup }
 * @param day 적용할 정책 일수(1~5). 정책 1번부터 이 날짜까지가 켜져 있다
 * @returns { action, steps } action은 ACTIONS의 id, steps는 근거 문장 목록
 */
export function decide(report, day) {
  if (report.kind === "request") return { action: "backlog", steps: ["기능 요청은 모두 백로그입니다."] };
  if (report.dup) return { action: "dup", steps: [`${report.area} 영역의 '${SYMPTOMS[report.symptom].label}'은 이미 접수돼 있어 중복입니다.`] };
  const severity = SYMPTOMS[report.symptom].severity;
  if (!report.repro && severity !== "crit") {
    return { action: "info", steps: ["재현 단계가 없고 치명 증상이 아니라서 정보를 요청합니다."] };
  }
  const mass = report.users >= MASS_USERS;
  let level;
  if (severity === "crit") level = 3;
  else if (severity === "high") level = mass ? 3 : 2;
  else if (severity === "mid") level = mass ? 2 : 1;
  else if (severity === "low") level = report.workaround ? 0 : 1;
  else level = 0;
  const steps = [`증상 ${SEVERITY_LABELS[severity]}${detailOf(severity, report)} → ${LADDER_LABELS[level]}`];
  const raise = (next, why) => {
    if (next <= level) return;
    level = next;
    steps.push(`${why} → ${LADDER_LABELS[level]}`);
  };
  if (day >= 2 && report.area === "결제") raise(Math.min(3, level + 1), "정책 2: 결제 영역이라 한 단계 올림");
  if (day >= 3 && report.tier === "vip") raise(2, "정책 3: VIP 고객은 최소 P1");
  if (day >= 4 && report.area === "로그인" && severity === "high") raise(3, "정책 4: 로그인 장애는 P0");
  if (day >= 5 && report.users >= HUGE_USERS) raise(3, "정책 5: 영향 1,000명 이상은 P0");
  return { action: LADDER[level], steps };
}