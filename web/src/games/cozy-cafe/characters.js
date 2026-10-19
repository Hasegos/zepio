export const REGULARS = [
  { id: "doyun", name: "도윤", job: "새벽 배달 기사", menu: "espresso", patience: 22000, time: "새벽·아침", color: "#d69672", tone: "짧고 무뚝뚝하지만 다정함", greeting: "한 잔만요. 아직 세 군데 남아서.", reward: "다시 달리는 힘 · 음료 판매액 +10%", acts: [
    { title: "식어도 괜찮아요", lines: ["도윤이 컵을 두 손으로 감쌌다. 엔진 소리는 밖에 두고 왔다.", "할머니는 늘 뚜껑에 해를 그려 줬어요. 새벽에도 뜬다고."] },
    { title: "빈 배송지", lines: ["오늘 마지막 주소가 여기였어요. 보낼 물건은 없는데.", "도윤은 낡은 지도에 작은 동그라미를 그렸다. 자기 몫의 쉼표였다."] },
    { title: "나에게 보내는 것", lines: ["이번엔 안 급해요. 제 그림, 한 장만 봐 주실래요?", "컵을 든 골목 사람들. 그림 속 도윤도 처음으로 앉아 있었다.", "카페 벽에 첫 그림이 걸렸다. 제목은 ‘배송 완료’."] },
  ] },
  { id: "dalbong", name: "달봉", job: "은퇴한 우체부", menu: "drip", patience: 46000, time: "아침", color: "#98a8a5", tone: "느긋한 존댓말과 작은 비유", greeting: "천천히 내려요. 기다리는 일은 익숙해서.", reward: "느린 우편 · 모든 손님 인내심 +6초", acts: [
    { title: "우표 없는 봉투", lines: ["달봉은 주머니에서 모서리가 닳은 봉투를 꺼냈다.", "남의 편지는 참 잘도 전했지요. 내 편지는 길을 잃었고."] },
    { title: "수신인", lines: ["받을 사람이 이젠 없어요. 그래서 주소를 못 쓰겠더군요.", "할머니가 그랬지요. 전하지 못한 말도 앉을 자리는 필요하다고."] },
    { title: "도착한 마음", lines: ["편지는 오늘도 안 부쳤어요. 대신 소리 내 읽었지요.", "‘잘 지냅니다. 당신이 좋아하던 커피도 아직 씁니다.’", "제피가 빈 우편함을 닦았다. 달봉은 그 안에 봉투 대신 꽃을 꽂았다."] },
  ] },
  { id: "moka", name: "모카", job: "골목의 길고양이", menu: "milk", patience: 35000, time: "비 오는 날", color: "#c69362", tone: "울음과 몸짓으로만 말함", greeting: "먀. …먀아.", reward: "작은 행운 · 직접 서빙 팁 +20%", acts: [
    { title: "젖은 발자국", lines: ["문 앞에 작은 발자국 여섯 개. 모카는 일곱 번째를 망설였다.", "제피가 수건을 내려놓자, 젖은 꼬리 끝이 먼저 들어왔다."] },
    { title: "예약석", lines: ["모카가 빈 의자 위에서 동그랗게 잠들었다.", "달봉이 작은 종이를 붙였다. ‘이 자리는 먼저 온 분의 것.’"] },
    { title: "여기가 집", lines: ["오늘은 비가 오지 않았다. 그런데도 문 앞에 모카가 있었다.", "먀옹. 짧은 인사 뒤에, 모카는 망설이지 않고 안으로 걸어왔다.", "창가에 작은 방석이 놓였다. 카페의 첫 주소 없는 단골이었다."] },
  ] },
  { id: "hayun", name: "하윤", job: "수험생", menu: "latte", patience: 42000, time: "밤", color: "#b8a0b8", tone: "조심스러운 혼잣말", premise: "합격보다 먼저 필요한 자기 자리" },
  { id: "critic", name: "서 평론가", job: "음식 평론가", menu: "cloud", patience: 20000, time: "저녁·예약", color: "#718696", tone: "날카로운 단정 뒤의 망설임", premise: "평가하는 사람으로만 살아온 습관" },
  { id: "han", name: "한 이사", job: "투자자", menu: "espresso", patience: 30000, time: "4챕터 예약", color: "#8d899f", tone: "격식 있는 제안", premise: "카페의 가치를 숫자로 설명하려는 사람" },
  { id: "miru", name: "미루", job: "수리공", menu: "cloud", patience: 32000, time: "낮", color: "#d4ac6d", tone: "씩씩하고 구체적인 말", premise: "고치는 일과 떠나보내는 일" },
  { id: "yeonwoo", name: "연우", job: "꽃집 주인", menu: "drip", patience: 48000, time: "오후", color: "#8ea985", tone: "식물에 빗대는 조용한 말", premise: "문 닫은 꽃집 앞에 남은 화분" },
  { id: "eunchae", name: "은채", job: "간호사", menu: "milk", patience: 38000, time: "교대 후", color: "#8fafba", tone: "담백한 농담", premise: "돌보던 사람이 돌봄을 받는 밤" },
  { id: "sunja", name: "순자", job: "버스 기사", menu: "toast", patience: 34000, time: "저녁", color: "#bda46c", tone: "호쾌한 반말", premise: "마지막 운행 뒤에도 남는 정류장" },
];
export const FIRST_REGULARS = REGULARS.slice(0, 3);
export const ACT_COUNTS = [5, 20, 50];

/** 등록된 단골을 찾는다. */
export function regularById(id) {
  return REGULARS.find((person) => person.id === id);
}
