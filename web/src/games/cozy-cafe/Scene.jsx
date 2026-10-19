import { GUEST_LABELS, PHASE_LABELS, TABLES } from "./simulation.js";

/** 독립된 설비 아트 레이어를 배치한다. */
function Sprite({ kind, className = "", children }) {
  return <div className={`cafe-sprite cafe-sprite--${kind} ${className}`} aria-hidden="true">{children}</div>;
}

/** 공용 통로 위의 캐릭터 위치와 방향별 걷기 프레임을 표시한다. */
function Actor({ actor, worker = false }) {
  const row = actor.phase === "making" || actor.status === "drinking" ? 4 : ({ front: 0, back: 1, left: 2, right: 3 }[actor.direction] ?? 0);
  const walking = actor.route.length > 0;
  const working = worker && ["making", "cleaning"].includes(actor.phase);
  const label = worker ? `${actor.id === 0 ? "주인" : `직원 ${actor.id}`} · ${PHASE_LABELS[actor.phase]}` : `${actor.id}번 · ${GUEST_LABELS[actor.status]}`;
  return (
    <div className="cafe-actor-position" style={{ transform: `translate3d(${actor.x}%, ${actor.y}%, 0)`, zIndex: Math.round(actor.y * 10) }} data-actor={worker ? `worker-${actor.id}` : `guest-${actor.id}`} data-state={worker ? actor.phase : actor.status} aria-hidden="true">
      <div className={`cafe-actor ${worker ? "cafe-actor--worker" : "cafe-actor--guest"} ${walking ? "is-walking" : ""} ${working ? "is-working" : ""} ${actor.phase === "making" ? "is-making" : ""} ${actor.status === "drinking" ? "is-seated" : ""}`} style={{ "--sprite-row": `${row / 4 * 100}%`, "--sprite-first": worker ? "0%" : "57.142857%", "--sprite-last": worker ? "42.857143%" : "100%" }}>
        <span className="cafe-actor-label">{label}</span>
        {!worker && ["waiting", "ordered", "seatWait"].includes(actor.status) && <span className="cafe-order-bubble">{actor.menu === "bread" ? "빵" : "커피"}<i style={{ width: `${Math.max(0, 100 - actor.waited / 700)}%` }} /></span>}
        {working && <span className="cafe-task-bubble">{actor.phase === "cleaning" ? "정리" : "제조"}<i /></span>}
        {(worker && actor.phase === "delivery" || !worker && actor.paid && actor.status !== "leaving") && <span className="cafe-held-cup" />}
      </div>
    </div>
  );
}

/** 좌석은 예약·사용·청소 필요 상태를 실제 운영 데이터에서 읽는다. */
function Table({ seat }) {
  const spot = { ...TABLES[seat.id], x: TABLES[seat.id].x + (seat.id === 2 ? -4 : seat.id === 3 ? 6 : 0) };
  return (
    <div className={`cafe-table cafe-table--${seat.state} ${seat.id >= 2 ? "cafe-table--outdoor" : ""}`} style={{ left: `${spot.x}%`, top: `${spot.y}%`, zIndex: Math.round(spot.y * 10) }} data-seat={seat.id} aria-hidden="true">
      {seat.id < 2 && <svg viewBox="0 0 140 125"><ellipse cx="70" cy="109" rx="56" ry="9" fill="#45322030" /><path d="M17 42v40m106-40v40M48 62l-7 45m51-45 7 45" stroke="#765337" strokeWidth="8" strokeLinecap="round" /><rect x="6" y="27" width="25" height="32" rx="9" fill="#b18b5b" stroke="#745036" strokeWidth="3" /><rect x="109" y="27" width="25" height="32" rx="9" fill="#b18b5b" stroke="#745036" strokeWidth="3" /><ellipse cx="70" cy="60" rx="45" ry="25" fill="#704b30" /><ellipse cx="70" cy="54" rx="45" ry="24" fill="#b98451" stroke="#e3b77c" strokeWidth="2" /><path d="M36 47q30-12 64 0M34 56q32-9 70 0M45 66q25-6 48 0" fill="none" stroke="#9d6c40" strokeWidth="2" /><ellipse cx="70" cy="49" rx="10" ry="5" fill="#ede2bf" /><path d="M66 46v-9q8-8 12 0v9" fill="#7b9360" /></svg>}
      <span className="cafe-seat-marker">{seat.state === "dirty" ? "정리 필요" : seat.state === "occupied" ? "이용 중" : seat.state === "reserved" ? "예약" : "빈자리"}</span>
      {seat.state === "dirty" && <span className="cafe-dirty-cups">컵 · 접시</span>}
    </div>
  );
}

/** 이동·제조·좌석 이용을 경제와 분리된 실제 운영 상태로 그린다. */
export default function Scene({ stage, staff, levels, sim, onBrew, purchaseId }) {
  const making = sim.workers.some((w) => w.phase === "making");
  return (
    <div className="cafe-world cafe-world--simulation">
      <div role="img" aria-label={`카페 장면, 성장 단계 ${stage} / 5, 직원 ${staff}명, 손님 ${sim.guests.length}명, 완료 주문 ${sim.served}건`} className={`cafe-scene ${making ? "is-brewing" : ""}`} data-stage={stage}>
        <img className="cafe-room" src={`/games/cozy-cafe/${levels.terrace > 0 ? "room-terrace" : "room"}.webp`} width="1536" height="1024" alt="" draggable="false" />
        <div className="cafe-room-sign" aria-hidden="true">COZY<br /><span>little moments, good coffee</span></div>
        <Sprite kind="espresso" className={levels.espresso >= 10 ? "cafe-machine is-premium" : "cafe-machine"}><span className="cafe-steam"><i /><i /><i /></span></Sprite>
        {levels.oven > 0 && <Sprite key={`oven-${levels.oven}`} kind="oven" className="cafe-bakery cafe-arrival" />}
        {levels.beans > 0 && <Sprite kind="beans" className="cafe-beans cafe-arrival" />}
        {levels.terrace > 0 && <Sprite kind="terrace" className="cafe-terrace cafe-arrival" />}
        {sim.seats.map((seat) => <Table key={seat.id} seat={seat} />)}
        {levels.marketing > 0 && <div className="cafe-bunting" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>}
        {sim.guests.map((guest) => <Actor key={`guest-${guest.id}`} actor={guest} />)}
        {sim.workers.map((worker) => <Actor key={`worker-${worker.id}`} actor={worker} worker />)}
        <div className="cafe-scene-caption" aria-hidden="true">{sim.workers.some((w) => w.phase === "cleaning") ? "다음 손님을 위해 테이블 정리 중" : making ? "주문하신 메뉴를 만들고 있어요" : "어서 오세요, 나의 작은 카페"}</div>
      </div>
      <button className="cafe-machine-hit" type="button" aria-label="카페 작업 돕기" onClick={onBrew} />
      {sim.lastSale && <div className="cafe-floats" aria-hidden="true"><span key={sim.lastSale.id} className="cafe-float">+{sim.lastSale.amount}<small> 전달 완료</small></span></div>}
      {purchaseId > 0 && <div key={purchaseId} className="cafe-purchase-glow" aria-hidden="true" />}
      <span className="cafe-open"><i /> OPEN · 영업 중</span>
    </div>
  );
}
