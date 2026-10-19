import { useEffect, useRef } from "react";
import { createAudio } from "./audio.js";

/**
 * 게임이 쓰는 소리 컨트롤러를 만들고 생명주기를 맞춘다. 첫 클릭이나 키 입력에서 소리를 열고, 내려가면 닫는다.
 *
 * @param muted 소리를 끌지
 * @returns createAudio가 돌려주는 컨트롤러(music, sfx 등)
 */
export function useAudio(muted) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = createAudio();
  const audio = ref.current;

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.dispose();
    };
  }, [audio]);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);

  return audio;
}