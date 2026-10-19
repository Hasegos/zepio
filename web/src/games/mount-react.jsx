import { createRoot } from "react-dom/client";

/**
 * React 컴포넌트를 게임 모듈 계약({ mount })으로 감싼다.
 * Root 생성과 정리를 이 함수가 맡고, 연속 unmount에도 안전하다.
 *
 * @param Component 호스트가 넘기는 ctx를 props로 받는 컴포넌트
 * @returns default export로 내보낼 { mount }
 */
export function mountReact(Component) {
  return {
    mount(el, ctx) {
      const root = createRoot(el);
      root.render(<Component {...ctx} />);
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