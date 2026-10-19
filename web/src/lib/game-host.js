/**
 * 마운트된 게임 인스턴스를 정리한다. unmount가 던진 예외는 기록만 한다.
 * 한 실행의 인스턴스는 teardown과 늦은 mount 완료 경로 중 하나에서만 정리되므로 한 번만 호출된다.
 *
 * @param instance mount가 돌려준 인스턴스, 없으면 아무것도 하지 않는다
 */
async function safeUnmount(instance) {
  if (!instance || typeof instance !== "object") return;
  try {
    await instance.unmount?.();
  } catch (error) {
    console.error("[game-host] unmount failed", error);
  }
}

/**
 * 컨테이너에 오류 문구와 다시 시도 버튼을 그린다.
 *
 * @param box 실행 전용 컨테이너
 * @param onRetry 다시 시도 버튼을 눌렀을 때 호출
 */
function renderError(box, onRetry) {
  const alert = document.createElement("div");
  alert.setAttribute("role", "alert");
  alert.className = "flex flex-col items-center gap-3 p-8 text-center";
  const message = document.createElement("p");
  message.textContent = "게임을 불러오지 못했어요.";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "다시 시도";
  button.className = "rounded-xl bg-primary px-5 py-3 font-bold text-white";
  button.addEventListener("click", onRetry);
  alert.append(message, button);
  box.replaceChildren(alert);
}

/**
 * 게임 모듈의 mount/unmount 생명주기를 관리하는 호스트를 만든다.
 * start마다 실행 세대와 AbortController, 전용 컨테이너를 새로 만들어
 * 늦게 끝난 이전 실행이 현재 화면을 건드리지 못하게 한다.
 *
 * @param options.root 게임을 붙일 컨테이너
 * @param options.load 게임 모듈을 동적으로 불러오는 함수, default export가 { mount }여야 한다
 * @param options.ctx mount에 넘길 공통 값, signal은 호스트가 덮어쓴다
 * @returns start와 destroy를 가진 호스트
 */
export function createGameHost({ root, load, ctx = {} }) {
  let generation = 0;
  let current = null;

  /**
   * 현재 실행을 취소하고 인스턴스와 컨테이너를 정리한다.
   */
  function teardown() {
    generation += 1;
    if (!current) return;
    const run = current;
    current = null;
    run.abort.abort();
    safeUnmount(run.instance).finally(() => run.box.remove());
  }

  /**
   * 이전 실행을 정리하고 게임을 새로 불러와 마운트한다. 마운트가 끝나거나 취소되거나 실패하면 끝난다.
   */
  async function start() {
    teardown();
    const mine = generation;
    const abort = new AbortController();
    const box = document.createElement("div");
    box.className = "size-full";
    root.append(box);
    const run = { abort, box, instance: null };
    current = run;
    const isStale = () => abort.signal.aborted || mine !== generation;

    try {
      const module = await load();
      if (isStale()) return;
      const instance = await module.default.mount(box, { ...ctx, signal: abort.signal });
      if (isStale()) {
        await safeUnmount(instance);
        return;
      }
      run.instance = instance;
    } catch (error) {
      if (isStale()) return;
      console.error("[game-host] mount failed", error);
      renderError(box, start);
    }
  }

  return { start, destroy: teardown };
}