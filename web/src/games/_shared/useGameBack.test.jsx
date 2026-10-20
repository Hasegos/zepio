import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGameBack } from "./useGameBack.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let el;
let root;
let api;

function Probe({ allowBack = true }) {
  const [screen, setScreen] = useState(0);
  api = { screen, setScreen };
  useGameBack(screen, () => {
    if (!allowBack) return false;
    setScreen((s) => s - 1);
    return true;
  });
  return <p>{screen}</p>;
}

const mount = (props) => act(async () => root.render(<Probe {...props} />));
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
const goBack = async () => {
  window.history.back();
  await settle();
};

beforeEach(() => {
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
});

afterEach(async () => {
  await act(async () => root.unmount());
  el.remove();
});

describe("useGameBack", () => {
  it("화면이 깊어질 때마다 기록을 쌓고, 뒤로가기는 한 단계씩 되돌린다", async () => {
    await mount();
    const start = window.history.length;
    await act(async () => api.setScreen(2));
    expect(window.history.length).toBe(start + 2);

    await goBack();
    expect(api.screen).toBe(1);
    await goBack();
    expect(api.screen).toBe(0);
  });

  it("게임 안 버튼으로 앞 화면에 돌아가면 쌓아 둔 기록도 걷어 낸다", async () => {
    await mount();
    await act(async () => api.setScreen(1));
    const depthUrl = window.history.state;
    expect(depthUrl).toEqual({ zepioGame: true });
    await act(async () => api.setScreen(0));
    await settle();
    expect(window.history.state).not.toEqual({ zepioGame: true });
    expect(api.screen).toBe(0);
  });

  it("onBack이 false를 돌려주면 그 화면에 머문다", async () => {
    await mount({ allowBack: false });
    await act(async () => api.setScreen(1));
    await goBack();
    expect(api.screen).toBe(1);
    expect(window.history.state).toEqual({ zepioGame: true });
  });
});