import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { mountReact } from "./mount-react.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("mountReact", () => {
  it("연속 unmount에도 경고나 오류 없이 비워진다", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    let instance;

    await act(async () => {
      instance = mountReact(() => <p>hello</p>).mount(el, {});
    });
    expect(el.textContent).toBe("hello");

    await act(async () => {
      instance.unmount();
      instance.unmount();
    });
    expect(el.textContent).toBe("");
    expect(error).not.toHaveBeenCalled();

    el.remove();
    error.mockRestore();
  });

  it("ctx를 props로 전달한다", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    let instance;

    await act(async () => {
      instance = mountReact(({ mode }) => <p>{mode}</p>).mount(el, { mode: "daily" });
    });
    expect(el.textContent).toBe("daily");

    await act(async () => instance.unmount());
    el.remove();
  });
});

describe("오류 경계", () => {
  it("렌더링 중 예외가 나면 안내와 다시 시도 버튼을 보여 주고 다시 시도하면 복구된다", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    let broken = true;
    function Flaky() {
      if (broken) throw new Error("boom");
      return <p>ok</p>;
    }
    let instance;
    await act(async () => {
      instance = mountReact(Flaky).mount(el, {});
    });
    expect(el.querySelector('[role="alert"]').textContent).toContain("게임에서 문제가 생겼어요");
    broken = false;
    await act(async () => el.querySelector("button").click());
    expect(el.textContent).toBe("ok");
    await act(async () => instance.unmount());
    el.remove();
    error.mockRestore();
  });
});
