/**
 * 문자열을 32비트 정수 시드로 바꾼다(FNV-1a).
 *
 * @param text 시드로 쓸 문자열
 * @returns 0 이상의 정수
 */
export function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 시드가 같으면 같은 수열을 만드는 난수 함수를 만든다(mulberry32).
 *
 * @param seed 정수 시드
 * @returns 0 이상 1 미만의 수를 돌려주는 함수
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 목록을 섞은 새 목록을 돌려준다(원본은 바꾸지 않는다).
 *
 * @param list 섞을 목록
 * @param rng 난수 함수
 * @returns 섞인 새 목록
 */
export function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}