import { useEffect, useRef } from "react";

/**
 * 게임 안 화면을 브라우저 뒤로가기와 이어 준다. 첫 화면보다 깊은 화면마다 기록(history) 항목을 하나 쌓고,
 * 뒤로가기를 누르면 페이지를 떠나지 않고 `onBack`이 한 단계 앞 화면으로 돌려보낸다.
 * 게임 안 버튼으로 앞 화면에 돌아가면 쌓아 둔 항목도 함께 걷어 낸다.
 *
 * @param depth 지금 화면의 깊이(첫 화면 0, 한 단계 들어갈 때마다 1씩 늘어난다)
 * @param onBack 뒤로가기를 눌렀을 때 화면을 한 단계 되돌린다. false를 돌려주면 이동을 막고 그 화면에 머문다
 */
export function useGameBack(depth, onBack) {
  const pushed = useRef(0);
  const skip = useRef(0);
  const handler = useRef(onBack);

  useEffect(() => {
    handler.current = onBack;
  });

  useEffect(() => {
    const diff = depth - pushed.current;
    if (diff > 0) {
      for (let i = 0; i < diff; i += 1) window.history.pushState({ zepioGame: true }, "");
    } else if (diff < 0) {
      skip.current += 1;
      window.history.go(diff);
    }
    pushed.current = depth;
  }, [depth]);

  useEffect(() => {
    const onPop = () => {
      if (skip.current > 0) {
        skip.current -= 1;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current -= 1;
      if (handler.current() === false) {
        window.history.pushState({ zepioGame: true }, "");
        pushed.current += 1;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}