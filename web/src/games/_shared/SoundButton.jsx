/**
 * 소리 켜기와 끄기 버튼. 모든 게임이 같은 모양을 쓰고 색만 게임에 맞춘다.
 *
 * @param props.muted 지금 꺼져 있는지
 * @param props.onToggle 눌렀을 때 부른다
 * @param props.className 테두리, 글자, 호버 색 클래스
 */
export default function SoundButton({ muted, onToggle, className = "border-slate-800 text-slate-900 hover:bg-amber-50" }) {
  return (
    <button type="button" aria-pressed={!muted} onClick={onToggle} className={`rounded-md border-2 px-2 py-0.5 text-xs font-bold ${className}`}>
      <span aria-hidden="true">{muted ? "🔇" : "🔊"} </span>소리
    </button>
  );
}