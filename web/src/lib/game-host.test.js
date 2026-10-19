import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGameHost } from "./game-host.js";

/**
 * 밖에서 완료 시점을 정하는 Promise를 만든다.
 */
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/**
 * 대기 중인 마이크로태스크가 끝나도록 한 틱 기다린다.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * 호출 횟수를 셀 수 있는 가짜 게임 인스턴스를 만든다.
 */
function fakeInstance() {
  return { unmount: vi.fn() };
}

/**
 * mount가 주어진 결과를 돌려주는 가짜 모듈 로더를 만든다.
 */
function loaderOf(mount) {
  return vi.fn(async () => ({ default: { mount } }));
}

describe("createGameHost", () => {
  let root;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it("start 후 mount 1회, destroy 후 unmount 1회가 호출된다", async () => {
    const instance = fakeInstance();
    const mount = vi.fn(() => instance);
    const host = createGameHost({ root, load: loaderOf(mount) });

    await host.start();
    expect(mount).toHaveBeenCalledTimes(1);
    expect(root.children).toHaveLength(1);

    host.destroy();
    await flush();
    expect(instance.unmount).toHaveBeenCalledTimes(1);
    expect(root.children).toHaveLength(0);
  });

  it("로더가 늦는 동안 destroy하면 mount를 호출하지 않는다", async () => {
    const gate = deferred();
    const mount = vi.fn(() => fakeInstance());
    const host = createGameHost({
      root,
      load: () => gate.promise,
    });

    const started = host.start();
    host.destroy();
    gate.resolve({ default: { mount } });
    await started;

    expect(mount).not.toHaveBeenCalled();
    expect(root.children).toHaveLength(0);
  });

  it("mount가 늦게 끝나면 완료 즉시 unmount하고 컨테이너를 남기지 않는다", async () => {
    const gate = deferred();
    const instance = fakeInstance();
    const mount = vi.fn(() => gate.promise);
    const host = createGameHost({ root, load: loaderOf(mount) });

    const started = host.start();
    await flush();
    expect(mount).toHaveBeenCalledTimes(1);

    host.destroy();
    gate.resolve(instance);
    await started;
    await flush();

    expect(instance.unmount).toHaveBeenCalledTimes(1);
    expect(root.children).toHaveLength(0);
  });

  it("start를 연속 호출하면 늦게 끝난 이전 실행만 정리되고 마지막 실행이 남는다", async () => {
    const firstGate = deferred();
    const first = fakeInstance();
    const second = fakeInstance();
    const queue = [firstGate.promise, Promise.resolve(second)];
    const mount = vi.fn(() => queue.shift());
    const host = createGameHost({ root, load: loaderOf(mount) });

    const firstStart = host.start();
    await flush();
    const secondStart = host.start();
    await secondStart;

    firstGate.resolve(first);
    await firstStart;
    await flush();

    expect(first.unmount).toHaveBeenCalledTimes(1);
    expect(second.unmount).not.toHaveBeenCalled();
    expect(root.children).toHaveLength(1);

    host.destroy();
    await flush();
    expect(second.unmount).toHaveBeenCalledTimes(1);
  });

  it("destroy를 두 번 불러도 unmount는 한 번이고 예외는 흡수된다", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const instance = {
      unmount: vi.fn(() => {
        throw new Error("boom");
      }),
    };
    const host = createGameHost({ root, load: loaderOf(() => instance) });

    await host.start();
    host.destroy();
    host.destroy();
    await flush();

    expect(instance.unmount).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(root.children).toHaveLength(0);
  });

  it("mount가 실패하면 오류 UI를 보여주고 다시 시도로 복구한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const instance = fakeInstance();
    const mount = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("fail");
      })
      .mockImplementation(() => instance);
    const host = createGameHost({ root, load: loaderOf(mount) });

    await host.start();
    expect(root.querySelector('[role="alert"]')).not.toBeNull();

    root.querySelector("button").click();
    await flush();
    expect(mount).toHaveBeenCalledTimes(2);
    expect(root.querySelector('[role="alert"]')).toBeNull();

    host.destroy();
    await flush();
    expect(instance.unmount).toHaveBeenCalledTimes(1);
  });

  it("signal이 destroy 때 abort되어 등록한 리스너가 해제된다", async () => {
    const handler = vi.fn();
    let received;
    const mount = vi.fn((el, ctx) => {
      received = ctx.signal;
      window.addEventListener("zepio-test", handler, { signal: ctx.signal });
      return fakeInstance();
    });
    const host = createGameHost({ root, load: loaderOf(mount) });

    await host.start();
    window.dispatchEvent(new Event("zepio-test"));
    expect(handler).toHaveBeenCalledTimes(1);

    host.destroy();
    await flush();
    window.dispatchEvent(new Event("zepio-test"));

    expect(received.aborted).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("pagehide와 pageshow(bfcache 복원)에서는 게임을 정리하지 않는다", async () => {
    const instance = fakeInstance();
    const host = createGameHost({ root, load: loaderOf(() => instance) });

    await host.start();
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pageshow"));
    await flush();

    expect(instance.unmount).not.toHaveBeenCalled();
    expect(root.children).toHaveLength(1);

    host.destroy();
  });
});