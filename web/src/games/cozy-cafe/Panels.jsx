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
import { buildingIncome, plotUnlocked } from "./economy.js";

const buyButton = "cafe-buy";

/** 주민 활동과 자동 운영 상태를 요약한다. */
export function OperationsPanel({ sim }) {
  return <div className="town-activity"><span className="town-live-dot"/><p><strong>마을은 스스로 자라는 중</strong><span>주민 {sim.guests.length}명이 산책하고 가게를 방문해요. 수익은 자동으로 쌓여요.</span></p></div>;
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
function BuyButton({ cost, coins, label, onBuy, locked = false }) {
  return (
    <button
      type="button"
      aria-disabled={locked || coins < cost}
      disabled={locked}
      aria-label={`${label}, ${formatCoins(cost)} 코인`}
      onClick={onBuy}
      className={buyButton}
    >
      <span><Icon id="coin" />{formatCoins(cost)}</span>
      <small>{locked ? "부지 잠김" : coins < cost ? `${formatCoins(Math.ceil(cost - coins))} 부족` : "구매하기"}</small>
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
  const free = econ.staff - Object.values(econ.managers ?? {}).filter(Boolean).length;
  return <ul className="cafe-shop-list">
    {STATIONS.map((station,i)=>{
      const level=econ.levels[station.id];
      const open=plotUnlocked(econ,station.id);
      return <Row key={station.id} icon={station.id} title={`${station.name} Lv.${level}`} detail={level?`자동 생산 +${formatCoins(buildingIncome(econ,station.id))}/초` : open?"부지 개방 · 새 건물을 지어 보세요":`${STATIONS[i-1]?.name} 5레벨 필요`}><BuyButton locked={!open} cost={stationCost(station.id,level)} coins={econ.coins} label={`${station.name} ${level?"증축":"건설"}`} onBuy={()=>dispatch({type:"station",id:station.id,now:Date.now()})}/>{level>0&&<button type="button" className="town-manager" disabled={!econ.managers?.[station.id]&&free<=0} onClick={()=>dispatch({type:"manager",id:station.id,now:Date.now()})}>{econ.managers?.[station.id]?"★ 매니저 근무 중 · 생산 2배 · 배치 해제":free>0?"＋ 매니저 배치 · 이 건물 생산 2배":"매니저를 고용하면 배치할 수 있어요"}</button>}</Row>;
    })}
    <Row icon="staff" title={`${STAFF.name} ${econ.staff}명`} detail={`미배치 ${free}명 · 기본 +2/초 · 배치한 건물 생산 2배`}><BuyButton cost={staffCost(econ.staff)} coins={econ.coins} label="매니저 고용" onBuy={()=>dispatch({type:"hire",now:Date.now()})}/></Row>
  </ul>;
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
        {formatSpan(away.ms)} 동안 마을이 번 코인이에요.
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
    <Dialog title="마을의 랜드마크!" onClose={onClose}>
      <p className="text-cafe-dark">작은 카페에서 시작한 마을이 누적 수익 1억을 달성했어요.</p>
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
