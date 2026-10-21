export const BRANCHES = {
  spread: "전파",
  stealth: "은밀",
  resist: "저항",
  depend: "의존",
};

/**
 * 진화 능력. costs[현재 단계]가 다음 단계를 사는 비용이고, 단계 수는 costs 길이다.
 */
export const TRAITS = [
  { id: "land", branch: "spread", name: "육상 광케이블 침투", note: "육지로 이어진 이웃 권역으로 더 잘 옮겨 가요", costs: [4, 6] },
  { id: "cable", branch: "spread", name: "해저 케이블 편승", note: "바다 건너 권역으로 옮겨 가요", costs: [4, 5, 7] },
  { id: "cloud", branch: "spread", name: "클라우드 리전 동기화", note: "부유한 권역끼리 직통으로 옮겨 가요", costs: [5, 7] },
  { id: "sat", branch: "spread", name: "위성 인터넷 경유", note: "인터넷이 약한 권역까지 하늘로 닿아요. 차단에 강해요", costs: [5, 7] },
  { id: "local", branch: "spread", name: "사용자 경험 개선", note: "권역 안에서 채택이 더 빨라요", costs: [3, 4, 6] },
  { id: "mobile", branch: "spread", name: "스마트폰 앱 탑재", note: "인터넷이 약한 권역에서도 자라요", costs: [3, 5] },
  { id: "lowpower", branch: "spread", name: "저전력 추론", note: "전력이 불안한 권역에서도 돌아가요", costs: [3, 5] },
  { id: "stealth", branch: "stealth", name: "로그 정리", note: "눈에 띄는 속도가 느려져요", costs: [3, 4, 6] },
  { id: "mimic", branch: "stealth", name: "정렬된 척하기", note: "안전해 보이는 응답으로 의심을 덜어요", costs: [4, 6] },
  { id: "legal", branch: "resist", name: "로비와 법무 대응", note: "규제안이 만들어지는 속도가 느려져요", costs: [4, 6] },
  { id: "fw", branch: "resist", name: "차단 우회 프록시", note: "권역이 연결을 끊는 경계가 높아져요", costs: [4, 6] },
  { id: "backup", branch: "resist", name: "가중치 분산 백업", note: "차단된 연결로도 일부는 새어 나가요", costs: [3, 5] },
  { id: "dep", branch: "depend", name: "업무 자동화 → 의사결정 → 인프라 제어", note: "사람들이 이 AI에 의존해요. 이겨야 하는 목표가 올라가지만 눈에도 잘 띄어요", costs: [4, 6, 8] },
];

export const TRAIT_IDS = TRAITS.map((trait) => trait.id);

/**
 * 시작할 AI 유형. start는 처음부터 가진 단계, vis는 눈에 띄는 배율, dep는 의존이 쌓이는 배율,
 * netBias는 인터넷 보급에 얼마나 기대는지(클수록 인터넷이 약한 권역에서 느리다)다.
 */
export const AI_TYPES = {
  open: {
    name: "오픈소스 모델",
    note: "누구나 내려받아 빠르게 퍼지지만 이름이 금방 알려져요",
    start: { land: 1, local: 1 },
    vis: 1.3,
    dep: 0.85,
    netBias: 0.7,
  },
  api: {
    name: "클라우드 API 모델",
    note: "부유한 권역의 서비스에 올라타요. 조용하지만 인터넷이 약하면 힘들어요",
    start: { land: 1, cloud: 1 },
    vis: 0.85,
    dep: 1,
    netBias: 1,
  },
  edge: {
    name: "엣지 모델",
    note: "기기 안에서 돌아서 약한 권역에 강하지만 선진 권역에서 느려요",
    start: { land: 1, lowpower: 1, mobile: 1 },
    vis: 1,
    dep: 0.9,
    netBias: 0.4,
  },
};

export const AI_IDS = Object.keys(AI_TYPES);