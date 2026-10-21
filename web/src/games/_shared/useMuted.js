import { useCallback, useState } from "react";
import { getMuted, setMuted } from "../../lib/storage.js";

/**
 * 모든 게임이 함께 쓰는 소리 끔 설정을 읽고 바꾼다. 한 게임에서 끄면 다른 게임에서도 꺼진 채로 열린다.
 *
 * @returns [muted, toggle] toggle은 설정을 뒤집고 저장한다
 */
export function useMuted() {
  const [muted, setState] = useState(getMuted);
  const toggle = useCallback(() => {
    setState(!muted);
    setMuted(!muted);
  }, [muted]);
  return [muted, toggle];
}