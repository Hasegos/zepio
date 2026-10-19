import { ACT_COUNTS, FIRST_REGULARS } from "./characters.js";
import { menuById, RECIPES } from "./recipes.js";

export const EVENTS = [
  { id: "inherit", at: 0, title: "할머니의 마지막 열쇠", speaker: "제피", text: "폐업 안내문 뒤에 열쇠가 있었어. 할머니가 못 찾게 숨긴 건 아니겠지? 우리, 오늘 하루만 문 열어 볼까?", prop: "열쇠" },
  { id: "firstbell", at: 15000, title: "종이 다시 울렸다", speaker: "도윤", text: "불 켜졌네요. …없어진 줄 알았는데. 에스프레소, 전처럼 되나요?", prop: "문종" },
  { id: "latte", at: 60000, title: "우유 거품의 기억", speaker: "제피", text: "작은 피처는 아직 반짝여. 라떼도 내놓을 수 있겠어! 메뉴판 네 칸 중 어디에 적을까?", prop: "우유 피처" },
  { id: "notebook", at: 90000, title: "밀가루 묻은 노트", speaker: "할머니의 메모", text: "진한 새벽 위에 하얀 구름을 얹으렴. 재료 이름은 적지 않을게. 맛은 네가 찾아야 하니까.", prop: "레시피 노트" },
  { id: "postman", at: 120000, title: "우체부의 빈 가방", speaker: "달봉", text: "오늘은 배달할 게 없어요. 그래도 이 골목은 한 바퀴 돌아야 마음이 놓이지요.", prop: "가방 걸이" },
  { id: "style", at: 180000, title: "어떤 카페로 기억될까", speaker: "제피", text: "문 앞 메뉴판이 비었네. ‘든든한 한 끼’와 ‘오래 쉬는 한 잔’. 오늘 우리에게 더 어울리는 말은 뭘까?", prop: "손글씨 메뉴판" },
  { id: "apron", at: 300000, title: "작은 앞치마", speaker: "제피", text: "나도 앞치마가 맞아! 음료는 내가 맡을게. 파티시에를 부르면 빵도 덜 기다리겠지? 서버는 손님들의 기다림을 돌봐 줄 거야.", prop: "제피의 앞치마" },
  { id: "paw", at: 420000, title: "문밖의 작은 발", speaker: "제피", text: "빗소리에 섞인 소리 들었어? 저 고양이, 카페 이름보다 먼저 우유 그릇 위치를 외웠나 봐.", prop: "우유 그릇" },
  { id: "cake", at: 480000, title: "냉장고의 노란 쪽지", speaker: "할머니의 메모", text: "레몬은 마지막 한 방울까지. 비 오는 날엔 누군가 작은 해를 먹고 싶어 한단다.", prop: "레몬 케이크" },
  { id: "rain", at: 600000, title: "2장 · 비 오는 골목", speaker: "제피", text: "다들 우산을 접고 조금 더 앉아 있네. 장사는 아직 서툴지만, 여긴 벌써 누군가의 쉼터인가 봐.", prop: "우산꽂이" },
  { id: "comfort", at: 750000, title: "창가의 빈 의자", speaker: "달봉", text: "빠르게 내어 주는 자리도, 오래 기다려 주는 자리도 필요하지요. 이 의자엔 어떤 손님을 모실까요?", prop: "창가 의자" },
  { id: "collar", at: 900000, title: "목걸이 없는 손님", speaker: "도윤", text: "배달길에서 봤어요. 저 고양이요. 오늘은 비 피할 데가 생겼네. …우유값은 제 거에 붙여요.", prop: "작은 계산서" },
  { id: "cup", at: 1050000, title: "금 간 컵의 두 번째 일", speaker: "제피", text: "이 컵은 물이 새네. 버리려다가 연필을 꽂았더니 딱 맞아. 쓸모가 끝난 게 아니라 바뀐 거였어.", prop: "컵 연필꽂이" },
  { id: "stamp", at: 1200000, title: "바삭한 우표", speaker: "할머니의 메모", text: "천천히 내린 향 옆에 바삭한 우표 한 장. 답장을 쓰는 사람에게는 손이 덜 끈적한 간식이 좋지.", prop: "두 번째 레시피" },
  { id: "bellrepair", at: 1350000, title: "문종의 나사 하나", speaker: "제피", text: "덜그럭거리던 종을 고쳤어. 문 열릴 때마다 할머니가 기침하는 것 같았는데, 이제 맑게 인사하네.", prop: "수리한 문종" },
  { id: "umbrella", at: 1500000, title: "돌아오지 않아도 되는 우산", speaker: "달봉", text: "빌려 가신 분이 아직 안 오셨네요. 괜찮아요. 비를 덜 맞았으면 제 일은 한 거지요.", prop: "빌려 쓰는 우산" },
  { id: "drawing", at: 1650000, title: "영수증 뒷면", speaker: "도윤", text: "그냥 끄적인 거예요. 저기, 컵 뒤에 있는 게 제피고요. 귀는… 다음엔 좀 덜 크게 그릴게요.", prop: "작은 스케치" },
  { id: "curtain", at: 1800000, title: "빛이 들어오는 틈", speaker: "제피", text: "커튼을 걷으니까 유리에 할머니 손자국이 보여. 늘 이 높이에서 밖을 보셨구나. 여긴 닦지 말자.", prop: "걷힌 커튼" },
  { id: "flower", at: 1950000, title: "이름 없는 화분", speaker: "제피", text: "누가 문 앞에 화분을 두고 갔어. 쪽지엔 ‘불이 켜져서 좋았어요’. 물 주는 건 내가 외워 둘게.", prop: "골목의 화분" },
  { id: "sparekey", at: 2100000, title: "예비 열쇠의 자리", speaker: "할머니의 메모", text: "내가 없는 날엔 화분 밑을 보렴. 하지만 네가 기다리는 사람이 있다면, 열쇠보다 먼저 이름을 불러 주고.", prop: "예비 열쇠" },
  { id: "lamplight", at: 2250000, title: "아직 영업 중", speaker: "제피", text: "옆집 셔터가 내려갔네. 우리 불빛은 골목 끝까지 갈까? 오늘은 한 잔만 더 기다려 보자.", prop: "따뜻한 간판" },
  { id: "chapter2end", at: 2400000, title: "골목에 남은 불빛", speaker: "제피", text: "폐업 안내문은 서랍에 넣었어. 아직 내일이 무섭지만, 오늘 다시 와 준 얼굴들이 있잖아. 다음 이야기는 이 불빛 밖에서 시작될 거야.", prop: "새로운 영업 안내" },
];
export const CHOICES = [
  { id: "style", at: 180000, title: "골목 메뉴판", options: [{ id: "meal", name: "든든한 한 끼", desc: "디저트 판매액 +25%" }, { id: "rest", name: "오래 쉬는 한 잔", desc: "음료 판매액 +15%" }] },
  { id: "comfort", at: 750000, title: "창가의 자리", options: [{ id: "quick", name: "빠르게 따뜻하게", desc: "자동 서빙 간격 -15%" }, { id: "patient", name: "천천히 머물러요", desc: "모든 손님 인내심 +10초" }] },
];

/** 한 번만 공개되는 사건을 기록하고 사연을 보관함에 더한다. */
export function refreshStory(state) {
  let next = state;
  for (const event of EVENTS) {
    if (state.elapsed < event.at || next.seen.includes(event.id)) continue;
    next = publish(next, { ...event, kind: "event" });
  }
  for (const person of FIRST_REGULARS) {
    for (let act = 0; act < 3; act++) {
      const id = `${person.id}-${act}`;
      if (next.counts[person.id] < ACT_COUNTS[act] || next.seen.includes(id)) continue;
      const entry = person.acts[act];
      next = publish(next, { id, title: `${person.name} · ${entry.title}`, speaker: person.name, text: entry.lines.join("\n"), kind: "act", person: person.id, act });
    }
  }
  return next;
}

/** 실제 보관함과 화면 알림에 공개한 사건만 신선도 기록에 남긴다. */
function publish(state, entry) {
  return { ...state, seen: [...state.seen, entry.id], inbox: [...state.inbox, entry.id], timeline: [...state.timeline, { id: entry.id, at: state.elapsed, kind: entry.kind }], latest: entry.id };
}

/** 보관함의 사건 내용을 찾는다. */
export function storyEntry(id) {
  const recipe = RECIPES.find(entry=>id===`recipe-${entry.id}`);
  if (recipe) return {id,title:`발견 · ${menuById(recipe.id).name}`,speaker:"할머니의 노트",text:recipe.note,kind:"recipe"};
  const event = EVENTS.find((entry) => entry.id === id);
  if (event) return event;
  const person = FIRST_REGULARS.find((p) => id.startsWith(`${p.id}-`));
  const act = Number(id.split("-").at(-1));
  if (!person || !Number.isInteger(act) || !person.acts[act]) return null;
  return { id, title: `${person.name} · ${person.acts[act].title}`, speaker: person.name, text: person.acts[act].lines.join("\n"), kind: "act", person: person.id, act };
}

/** 선택은 처음 무료이며 이미 고른 선택은 30코인으로 되돌릴 수 있다. */
export function choose(state, id, option) {
  const choice = CHOICES.find((item) => item.id === id);
  if (!choice || state.elapsed < choice.at || !choice.options.some((item) => item.id === option) || state.choices[id] === option) return state;
  const cost = state.choices[id] ? 30 : 0;
  if (state.coins < cost) return state;
  const next = { ...state, coins: state.coins - cost, choices: { ...state.choices, [id]: option } };
  if (id === "comfort") {
    const delta = (option === "patient" ? 10000 : 0) - (state.choices.comfort === "patient" ? 10000 : 0);
    next.queue = state.queue.map(order=>({...order,remaining:Math.max(1000,order.remaining+delta),patience:Math.max(1000,order.patience+delta)}));
  }
  return next;
}

/** 첫 공개 시각부터 검사 구간 끝까지 새 콘텐츠 공백을 계산한다. */
export function freshnessGaps(timeline, until = 2400000) {
  const points = [0, ...timeline.filter((event) => event.at <= until).map((event) => event.at), until].sort((a, b) => a - b);
  return points.slice(1).map((at, index) => ({ from: points[index], to: at, gap: at - points[index] })).filter((range) => range.gap > 180000);
}
