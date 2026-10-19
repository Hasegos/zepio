const STAFF_SPOTS = ["first", "second", "third"];

/** 독립된 아트 레이어를 배치한다. 경제 상태는 읽거나 변경하지 않는다. */
function Sprite({ kind, className = "", children }) {
  return <div className={`cafe-sprite cafe-sprite--${kind} ${className}`} aria-hidden="true">{children}</div>;
}

/** 실제 보유 설비와 직원 수를 받아 카페 장면만 그린다. */
export default function Scene({ stage, staff, levels, brewing, onBrew, feedback, purchaseId }) {
  return (
    <div className="cafe-world">
      <div
        role="img"
        aria-label={`카페 장면, 성장 단계 ${stage} / 5, 직원 ${staff}명`}
        className={`cafe-scene ${brewing ? "is-brewing" : ""}`}
        data-stage={stage}
      >
        <img className="cafe-room" src={`/games/cozy-cafe/${levels.terrace > 0 ? "room-terrace" : "room"}.webp`} width="1536" height="1024" alt="" draggable="false" />
        <div className="cafe-room-sign" aria-hidden="true">COZY<br /><span>little moments, good coffee</span></div>
        <Sprite kind="barista" className="cafe-owner" />
        {STAFF_SPOTS.slice(0, Math.min(staff, 3)).map((spot) => (
          <Sprite key={spot} kind="barista" className={`cafe-staff cafe-staff--${spot}`} />
        ))}
        <Sprite kind="espresso" className={levels.espresso >= 10 ? "cafe-machine is-premium" : "cafe-machine"}>
          <span className="cafe-steam"><i /><i /><i /></span>
        </Sprite>
        {levels.oven > 0 && <Sprite key={`oven-${levels.oven}`} kind="oven" className="cafe-bakery cafe-arrival" />}
        {levels.beans > 0 && <Sprite kind="beans" className="cafe-beans cafe-arrival" />}
        {levels.terrace > 0 && (
          <>
            <Sprite kind="terrace" className="cafe-terrace cafe-arrival" />
            <Sprite kind="guest" className="cafe-guest cafe-guest--first" />
            {levels.terrace >= 3 && <Sprite kind="guest" className="cafe-guest cafe-guest--second" />}
          </>
        )}
        {levels.marketing > 0 && <div className="cafe-bunting" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>}
        <div className="cafe-scene-caption" aria-hidden="true">{staff > 0 ? "오늘도 정성껏 내리는 중" : "나만의 작은 카페, 첫 잔부터"}</div>
      </div>
      <button className="cafe-machine-hit" type="button" aria-label="카페 머신으로 커피 내리기" onClick={onBrew} />
      <div className="cafe-floats" aria-hidden="true">
        {feedback.map((item) => <span key={item.id} className={`cafe-float cafe-float--${item.id % 3}`}>+{item.value}</span>)}
      </div>
      {purchaseId > 0 && <div key={purchaseId} className="cafe-purchase-glow" aria-hidden="true" />}
      <span className="cafe-open"><i /> OPEN</span>
    </div>
  );
}
