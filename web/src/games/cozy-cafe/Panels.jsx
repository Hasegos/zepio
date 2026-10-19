import { useEffect, useRef } from "react";
import ShareButton from "../ShareButton.jsx";
import { formatCoins, formatCompact, formatSpan } from "./format.js";
import {
  isUnlocked,
  OFFLINE_CAP_MS,
  STAFF,
  STATIONS,
  stationCost,
  staffCost,
  UPGRADES,
} from "./economy.js";
import Icon from "./icons.jsx";
import meta from "./meta.js";
import { cafeShareText } from "./share-text.js";
import { GUEST_LABELS, PHASE_LABELS } from "./simulation.js";
import { operatingProfile } from "./economy.js";

const buyButton = "cafe-buy";

/** 대기 주문의 우선순위와 실제 작업자의 활동을 보여준다. */
export function OperationsPanel({ sim, dispatch }) {
  const orders = sim.guests.filter((g) => ["entering", "waiting", "ordered", "seatWait"].includes(g.status));
  return (
    <div className="cafe-operations">
      <div className="cafe-operations-title"><h4>지금 카페에서는</h4><span>주문 {orders.length}건</span></div>
      <div className="cafe-service-counts"><span>완료 <b>{sim.served}</b></span><span>팁 <b>{formatCoins(sim.tips)}</b></span><span>빈자리 <b>{sim.seats.filter((s) => s.state === "free").length}/{sim.seats.length}</b></span></div>
      <ul className="cafe-live-orders">{orders.length ? orders.slice(0, 6).map((g) => <li key={g.id}>
        <div><strong>#{g.id} {g.menu === "bread" ? "갓 구운 빵" : "따뜻한 커피"}</strong><small>{g.dineIn ? "매장" : "포장"} · {GUEST_LABELS[g.status]} · {Math.floor(g.waited / 1000)}초</small></div>
        {g.status === "waiting" ? <button type="button" aria-label={`${g.id}번 주문 먼저 처리`} aria-pressed={!!g.priority} onClick={() => dispatch({ type: "priority", id: g.id, now: Date.now() })}>{g.priority ? "우선 주문" : "먼저 처리"}</button> : <span>{g.status === "ordered" ? "제조·전달" : GUEST_LABELS[g.status]}</span>}
      </li>) : <li className="cafe-no-orders">곧 손님이 찾아와요. 주인이 자동으로 주문을 받아요.</li>}</ul>
      <div className="cafe-worker-status">{sim.workers.map((w) => <span key={w.id}><i data-working={w.phase !== "idle"} />{w.id === 0 ? "주인" : `직원 ${w.id}`} · {PHASE_LABELS[w.phase]}</span>)}</div>
      <p className="cafe-operations-note">전달 완료 시 결제 · 빠른 서비스에는 팁<br />좌석이 꽉 차면 최대 8초 기다린 뒤 포장해요.</p>
    </div>
  );
}

/**
 * 한 줄짜리 항목 틀. 아이콘, 이름과 설명, 오른쪽 동작을 늘어놓는다.
 *
 * @param props.icon 아이콘 id
 * @param props.title 이름(레벨 포함)
 * @param props.detail 설명
 * @param props.children 오른쪽에 놓을 구매 버튼
 */
function Row({ icon, title, detail, children }) {
  return (
    <li className="cafe-shop-row">
      <span className="cafe-item-icon"><Icon id={icon} /></span>
      <div className="cafe-item-copy">
        <p className="cafe-item-title">{title}</p>
        <p className="cafe-item-detail">{detail}</p>
      </div>
      {children}
    </li>
  );
}

/**
 * 구매 버튼. 코인이 모자라면 눌러도 사지 않고 안내만 나오도록 비활성 모양만 낸다.
 *
 * @param props.cost 가격
 * @param props.coins 가진 코인
 * @param props.label 버튼이 하는 일(낭독용)
 * @param props.onBuy 눌렀을 때 호출
 */
function BuyButton({ cost, coins, label, onBuy }) {
  return (
    <button
      type="button"
      aria-disabled={coins < cost}
      aria-label={`${label}, ${formatCoins(cost)} 코인`}
      onClick={onBuy}
      className={buyButton}
    >
      <span><Icon id="coin" />{formatCoins(cost)}</span>
      <small>{coins < cost ? `${formatCoins(Math.ceil(cost - coins))} 부족` : "구매하기"}</small>
    </button>
  );
}

/**
 * 설비 목록과 직원 고용을 보여준다.
 *
 * @param props.econ 진행 상황
 * @param props.dispatch 구매 동작을 보낸다
 */
export function EquipmentPanel({ econ, dispatch }) {
  const profile = operatingProfile(econ);
  const details = {
    espresso: `제조 ${(profile.coffeeMs / 1000).toFixed(1)}초 · 동시 ${profile.coffeeSlots}잔`,
    oven: econ.levels.oven > 0 ? `빵 제조 ${(profile.breadMs / 1000).toFixed(1)}초` : "구매하면 빵 주문이 열려요",
    terrace: `현재 ${profile.seats}석 · 1레벨 +1석, 3레벨 +1석`,
    beans: `주문 기본 단가 ${formatCoins(profile.price)} 코인`,
    marketing: `손님 도착 약 ${(profile.arrivalMs / 1000).toFixed(1)}초 간격`,
  };
  return (
    <ul className="cafe-shop-list">
      {STATIONS.map((station) => {
        const level = econ.levels[station.id];
        return (
          <Row
            key={station.id}
            icon={station.id}
            title={`${station.name} Lv.${level}`}
            detail={details[station.id]}
          >
            <BuyButton
              cost={stationCost(station.id, level)}
              coins={econ.coins}
              label={`${station.name} 올리기`}
              onBuy={() => dispatch({ type: "station", id: station.id, now: Date.now() })}
            />
          </Row>
        );
      })}
      <Row icon="staff" title={`${STAFF.name} ${econ.staff}명`} detail={econ.staff < 3 ? "최대 3명 배치 · 주문·서빙·정리 자동화" : "추가 고용은 제조 숙련도와 단가에 반영"}>
        <BuyButton
          cost={staffCost(econ.staff)}
          coins={econ.coins}
          label="직원 고용"
          onBuy={() => dispatch({ type: "hire", now: Date.now() })}
        />
      </Row>
    </ul>
  );
}

/**
 * 업그레이드 목록을 보여준다. 아직 열리지 않은 것은 ?로 가리고 열리는 조건만 알려준다.
 *
 * @param props.econ 진행 상황
 * @param props.dispatch 구매 동작을 보낸다
 */
export function UpgradePanel({ econ, dispatch }) {
  const open = UPGRADES.filter((upgrade) => !econ.upgrades.includes(upgrade.id));
  const bought = UPGRADES.filter((upgrade) => econ.upgrades.includes(upgrade.id));
  return (
    <ul className="cafe-shop-list">
      {open.map((upgrade) =>
        isUnlocked(econ, upgrade) ? (
          <Row key={upgrade.id} icon="upgrade" title={upgrade.name} detail={upgrade.desc}>
            <BuyButton
              cost={upgrade.cost}
              coins={econ.coins}
              label={`${upgrade.name} 구매`}
              onBuy={() => dispatch({ type: "upgrade", id: upgrade.id, now: Date.now() })}
            />
          </Row>
        ) : (
          <li key={upgrade.id} className="cafe-shop-row cafe-locked">
            <span aria-hidden="true" className="cafe-item-icon">?</span>
            <div className="cafe-item-copy">
              <p className="cafe-item-title">아직 열리지 않았어요</p>
              <p className="cafe-item-detail">누적 수익 {formatCompact(upgrade.unlockAt)} 달성 시 열려요</p>
            </div>
          </li>
        ),
      )}
      {bought.map((upgrade) => (
        <Row key={upgrade.id} icon="upgrade" title={upgrade.name} detail={upgrade.desc}>
          <span className="cafe-purchased">구매 완료</span>
        </Row>
      ))}
    </ul>
  );
}

/**
 * 화면 위에 띄우는 대화 상자. 열리면 첫 버튼으로 초점을 옮기고 Esc로 닫는다.
 *
 * @param props.title 제목
 * @param props.onClose 닫을 때 호출
 * @param props.children 내용(마지막에 닫기 버튼이 있다)
 */
function Dialog({ title, onClose, children }) {
  const headingRef = useRef(null);
  const closeRef = useRef(onClose);
  const dialogRef = useRef(null);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const before = document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], textarea, input, [tabindex="0"]')];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    headingRef.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);

  return (
    <div className="cafe-modal-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cafe-dialog-title"
        className="cafe-modal"
      >
        <span className="cafe-modal-emblem"><Icon id="cup" /></span>
        <h2 id="cafe-dialog-title" ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

const primary = "cafe-modal-primary";

/**
 * 자리를 비운 동안 번 수익을 알려준다.
 *
 * @param props.away 번 코인(earned)과 계산한 시간(ms)
 * @param props.onClose 닫을 때 호출
 */
export function AwayDialog({ away, onClose }) {
  return (
    <Dialog title="자리를 비운 동안" onClose={onClose}>
      <p className="text-4xl font-extrabold text-cafe-accent">+{formatCoins(away.earned)}</p>
      <p className="text-cafe-dark">
        {formatSpan(away.ms)} 동안 카페가 번 코인이에요.
        {away.ms >= OFFLINE_CAP_MS && ` 자리를 비운 시간은 최대 ${formatSpan(OFFLINE_CAP_MS)}까지 계산해요.`}
      </p>
      <button type="button" onClick={onClose} className={primary}>
        받기
      </button>
    </Dialog>
  );
}

/**
 * 목표(누적 수익 1억)에 이르렀을 때 체인점 오픈 카드를 보여준다.
 *
 * @param props.econ 진행 상황
 * @param props.onClose 계속하기를 눌렀을 때 호출
 */
export function GoalDialog({ econ, onClose }) {
  const equipment = Object.values(econ.levels).reduce((sum, level) => sum + level, 0);
  return (
    <Dialog title="체인점 오픈!" onClose={onClose}>
      <p className="text-cafe-dark">작은 카페가 어엿한 체인점이 됐어요.</p>
      <dl className="grid grid-cols-2 gap-2 text-center">
        <div className="flex flex-col-reverse rounded-xl bg-white p-3">
          <dt className="text-sm text-slate-600">누적 수익</dt>
          <dd className="text-xl font-extrabold">{formatCompact(econ.total)}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-white p-3">
          <dt className="text-sm text-slate-600">운영한 시간</dt>
          <dd className="text-xl font-extrabold">{formatSpan(econ.goalAt - econ.startedAt)}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-white p-3">
          <dt className="text-sm text-slate-600">직원</dt>
          <dd className="text-xl font-extrabold">{econ.staff}명</dd>
        </div>
        <div className="flex flex-col-reverse rounded-xl bg-white p-3">
          <dt className="text-sm text-slate-600">설비 레벨 합</dt>
          <dd className="text-xl font-extrabold">{equipment}</dd>
        </div>
      </dl>
      <ShareButton title="Zepio Cozy Cafe" text={cafeShareText(econ)} path={`/games/${meta.slug}/`} />
      <button type="button" onClick={onClose} className={primary}>
        계속하기
      </button>
    </Dialog>
  );
}
