import { createRoot } from "react-dom/client";
import GameErrorBoundary from "./GameErrorBoundary.jsx";

/**
 * React 컴포넌트를 게임 모듈 계약({ mount })으로 감싼다.
 * Root 생성과 정리를 이 함수가 맡고, 연속 unmount에도 안전하다. 렌더링 중 예외는 오류 경계가 잡아 다시 시도 화면을 보여 준다.
 *
 * @param Component 호스트가 넘기는 ctx를 props로 받는 컴포넌트
 * @returns default export로 내보낼 { mount }
 */
export function mountReact(Component) {
  return {
    mount(el, ctx) {
      const root = createRoot(el);
      root.render(
        <GameErrorBoundary>
          <Component {...ctx} />
        </GameErrorBoundary>,
      );
      let done = false;
      return {
        unmount() {
          if (done) return;
          done = true;
          root.unmount();
        },
      };
    },
  };
}