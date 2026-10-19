import { Building, Resident } from "./TownArt.jsx";

/**
 * 항목 아이콘 하나를 그린다. 이름은 옆 글자가 말하므로 화면 낭독기에는 숨긴다.
 *
 * @param props.id 설비 id(espresso, oven, terrace, beans, marketing), staff, upgrade 중 하나
 */
export default function Icon({ id }) {
  const building = ["espresso", "oven", "terrace", "beans", "marketing"].indexOf(id);
  if (building >= 0) return <svg viewBox="-105 -220 210 245" width="36" height="36" aria-hidden="true"><Building index={building}/></svg>;
  if (id === "staff") return <svg viewBox="-18 -49 36 53" width="36" height="36" aria-hidden="true"><Resident id={0} manager/></svg>;
  const shapes = {
    cup: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h15v7a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z" /><path d="M20 12h2a3 3 0 0 1 0 6h-2M3 25h20M9 7c-3-3 3-3 0-6M15 7c-3-3 3-3 0-6" /></g>,
    coin: <g><circle cx="14" cy="14" r="11" fill="#eac16c" stroke="#bb853c" strokeWidth="1.5" /><circle cx="14" cy="14" r="7.5" fill="none" stroke="#fff0bb" strokeWidth="1.5" /><path d="M16.5 10.5c-5-3-8 4-3 5 5 1 2 5-2 2M14 7.5v13" fill="none" stroke="#966527" strokeWidth="1.6" strokeLinecap="round" /></g>,
    leaf: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4C7 1 1 12 9 19c6 5 15-1 14-15zM6 25 18 10M10 20l-1-7M14 15h6" /></g>,
    settings: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m11 3-1 4-4 1-3 4 2 3v4l4 1 2 5h5l2-4 4-1 3-4-2-3V8l-5-1-2-4z" /><circle cx="14" cy="14" r="4" /></g>,
    upgrade: <path d="M14 3 l3.4 7 7.6 1 -5.5 5.3 1.4 7.6 -6.9 -3.7 -6.9 3.7 1.4 -7.6 -5.5 -5.3 7.6 -1z" fill="#f7c873" />,
  };
  return (
    <svg viewBox="0 0 28 28" width="36" height="36" aria-hidden="true" focusable="false" className="shrink-0">
      {shapes[id] ?? shapes.upgrade}
    </svg>
  );
}
