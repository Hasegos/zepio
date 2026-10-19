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