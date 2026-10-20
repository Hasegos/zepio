import { useEffect, useRef } from "react";

/**
 * 게임이 쓰는 소리 컨트롤러를 만들고 생명주기를 맞춘다. 첫 클릭이나 키 입력에서 소리를 열고, 탭이 가려지면 멈췄다가 다시 보이면 이어 가고, 내려가면 닫는다.
 *
 * @param muted 소리를 끌지
 * @param create 컨트롤러를 만드는 함수(게임마다 곡과 효과음을 담아 createSynth를 부른다)
 * @returns create가 돌려주는 컨트롤러(music, sfx 등)
 */
export function useAudio(muted, create) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = create();
  const audio = ref.current;

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const onVisibility = () => (document.hidden ? audio.suspend() : audio.resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.dispose();
    };
  }, [audio]);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  return audio;
}