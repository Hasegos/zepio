export const MENUS = [
  { id: "espresso", name: "에스프레소", short: "진한 한 잔", kind: "drink", price: 14, icon: "espresso", unlock: 0 },
  { id: "drip", name: "드립커피", short: "천천히 내린 향", kind: "drink", price: 18, icon: "drip", unlock: 0 },
  { id: "milk", name: "따뜻한 우유", short: "작은 그릇에도", kind: "drink", price: 8, icon: "milk", unlock: 0 },
  { id: "toast", name: "버터 토스트", short: "가장자리까지 노릇", kind: "dessert", price: 22, icon: "toast", unlock: 0 },
  { id: "latte", name: "카페라떼", short: "우유 수염 한 모금", kind: "drink", price: 24, icon: "latte", unlock: 60000 },
  { id: "cake", name: "레몬 케이크", short: "비 오는 날의 노란빛", kind: "dessert", price: 44, icon: "cake", unlock: 480000 },
  { id: "cloud", name: "구름 라떼", short: "할머니의 첫 비밀", kind: "drink", price: 32, icon: "cloud", hidden: true },
  { id: "letter", name: "편지 세트", short: "기다림을 곁들여요", kind: "dessert", price: 36, icon: "letter", hidden: true },
];
export const RECIPES = [
  { id: "cloud", pair: ["espresso", "milk"], hint: "진한 새벽 위에 하얀 구름을 얹으렴.", note: "할머니의 메모: 젓기 전에 한 번 웃어 주기." },
  { id: "letter", pair: ["drip", "toast"], hint: "천천히 내린 향 옆에 바삭한 우표 한 장.", note: "할머니의 메모: 편지가 길어져도 빵은 따뜻하게." },
];

/** 메뉴 정의를 찾는다. */
export function menuById(id) {
  return MENUS.find((menu) => menu.id === id);
}

/** 현재 공개된 메뉴를 반환한다. */
export function availableMenus(state) {
  return MENUS.filter((menu) => menu.hidden ? state.discovered.includes(menu.id) : state.elapsed >= menu.unlock);
}

/** 준비 메뉴 네 칸 중 한 칸을 알려진 메뉴로 교체한다. */
export function setMenu(state, slot, id) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 4 || !availableMenus(state).some((menu) => menu.id === id) || state.menus.includes(id)) return state;
  const menus = [...state.menus];
  menus[slot] = id;
  return { ...state, menus };
}

/** 알려진 메뉴 두 개를 조합하고 처음 발견한 레시피만 기록한다. */
export function discoverRecipe(state, pair) {
  if (state.elapsed < 90000 || !Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) return { state, message: "노트가 열리면 서로 다른 메뉴 두 개를 골라 주세요." };
  const known = availableMenus(state).map((menu) => menu.id);
  if (!pair.every((id) => known.includes(id))) return { state, message: "아직 모르는 재료가 있어요." };
  const recipe = RECIPES.find((entry) => entry.pair.every((id) => pair.includes(id)));
  if (!recipe) return { state, message: "아직 맛이 이어지지 않네요. 노트의 문장을 읽어 볼까요?" };
  if (state.discovered.includes(recipe.id)) return { state, message: "이미 노트에 적어 둔 맛이에요." };
  return { state: { ...state, discovered: [...state.discovered, recipe.id] }, message: `${menuById(recipe.id).name} 발견! 메뉴 편성에서 준비할 수 있어요.` };
}
