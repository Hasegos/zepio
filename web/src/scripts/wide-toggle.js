import { getWide, setWide } from "../lib/storage.js";

const wrap = document.querySelector("[data-stage-wrap]");
const button = document.querySelector("[data-wide-toggle]");

/**
 * 게임 화면 폭과 버튼 모양을 설정에 맞춘다.
 *
 * @param wide 넓게 볼지
 */
function apply(wide) {
  wrap.dataset.wide = String(wide);
  button.setAttribute("aria-pressed", String(wide));
  button.textContent = wide ? "화면 좁게 보기" : "화면 넓게 보기";
}

if (wrap && button) {
  let wide = getWide() ?? wrap.dataset.wide === "true";
  apply(wide);
  button.addEventListener("click", () => {
    wide = !wide;
    apply(wide);
    setWide(wide);
    button.blur();
  });
}
