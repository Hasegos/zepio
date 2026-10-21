import { useEffect, useRef } from "react";
import Card from "./Card.jsx";
import { candidateTexts, GUESS_LIMIT, scoreOf, TEST_LIMIT } from "./engine.js";
import { cardLabel, cardOf, ruleById } from "./rules.js";

/**
 * 통과 여부 표시를 색과 글자로 함께 보여 준다.
 *
 * @param props.pass 통과했는지
 */
function Badge({ pass }) {
  return (
    <span className={`mt-1 block text-center text-xs font-bold ${pass ? "text-success-strong" : "text-danger-strong"}`}>
      {pass ? "○ 통과" : "✕ 불통과"}
    </span>
  );
}

/**
 * 라운드 하나를 보여 주고 시험, 후보 선택, 제출, 다음 라운드 이동을 받는다.
 * 숫자 키 1~5로 후보를 고르고, 포커스가 버튼 밖에 있을 때 Enter로 제출하거나 다음으로 넘어간다.
 *
 * @param props.round 현재 라운드
 * @param props.index 라운드 번호(0부터)
 * @param props.total 전체 라운드 수
 * @param props.score 지금까지 번 점수
 * @param props.tests 한 시험 { card, pass } 목록
 * @param props.selected 고른 후보 번호 또는 null
 * @param props.wrongs 이미 틀린 후보 번호 목록
 * @param props.revealed 라운드가 끝나 정답을 공개했는지
 * @param props.onTest 시험할 카드 번호를 받는다
 * @param props.onSelect 후보 번호를 받는다
 * @param props.onSubmit 제출을 눌렀을 때 호출
 * @param props.onNext 다음 라운드로 넘어갈 때 호출
 */
export default function Board({ round, index, total, score, tests, selected, wrongs, revealed, onTest, onSelect, onSubmit, onNext }) {
  const headingRef = useRef(null);
  const nextRef = useRef(null);
  const texts = candidateTexts(round);
  const tested = new Set(tests.map((test) => test.card));
  const solved = revealed && wrongs.length < GUESS_LIMIT;
  const last = index === total - 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    if (revealed) nextRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= texts.length) {
        onSelect(number - 1);
        return;
      }
      const interactive = "a, button, summary, input, select, textarea";
      if (event.key === "Enter" && !event.repeat && !event.target.closest?.(interactive)) {
        if (!revealed && selected === null) return;
        event.preventDefault();
        if (revealed) onNext();
        else onSubmit();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [round, revealed, selected, texts.length, onSelect, onSubmit, onNext]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>
          라운드 {index + 1} / {total}
        </span>
        <span>
          시험 {tests.length} / {TEST_LIMIT}
        </span>
        <span>{score}점</span>
      </div>
      <div
        role="progressbar"
        aria-label="진행도"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (revealed ? 1 : 0)}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
        ○ 카드가 통과하는 숨은 규칙은 무엇일까요?
      </h2>

      <div>
        <p className="mb-2 text-sm font-bold text-slate-700">지금까지 알려진 카드</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[...round.examples, ...tests].map(({ card, pass }) => (
            <li key={card} className="min-w-0">
              <Card index={card} />
              <Badge pass={pass} />
            </li>
          ))}
        </ul>
      </div>

      {!revealed && (
        <div>
          <p className="mb-2 text-sm font-bold text-slate-700">
            카드를 눌러 시험해 보세요 (남은 {TEST_LIMIT - tests.length}번)
          </p>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="시험할 카드">
            {round.tray
              .filter((card) => !tested.has(card))
              .map((card) => (
                <button
                  key={card}
                  type="button"
                  disabled={tests.length >= TEST_LIMIT}
                  aria-label={`${cardLabel(cardOf(card))} 시험하기`}
                  onClick={() => onTest(card)}
                  className="rounded-xl border-2 border-slate-200 bg-white p-0.5 hover:border-primary/60 disabled:opacity-40"
                >
                  <Card index={card} decorative />
                </button>
              ))}
          </div>
        </div>
      )}

      <div role="group" aria-label="후보 규칙" className="flex flex-col gap-2">
        <p className="text-sm font-bold text-slate-700">숨은 규칙 후보</p>
        {texts.map((text, i) => {
          const isAnswer = revealed && i === round.answer;
          const isWrong = wrongs.includes(i);
          const tone = isAnswer
            ? "border-success bg-emerald-50"
            : isWrong
              ? "border-danger bg-red-50 text-slate-500 line-through"
              : i === selected
                ? "border-primary ring-2 ring-primary/30"
                : "border-slate-200 hover:border-primary/60";
          return (
            <button
              key={round.candidates[i]}
              type="button"
              disabled={revealed || isWrong}
              aria-pressed={i === selected}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-3 text-left font-semibold ${tone}`}
            >
              <span aria-hidden="true" className="text-xs font-semibold text-slate-500">
                {i + 1}
              </span>
              <span className="flex-1">{text}</span>
              {isAnswer && <span aria-label="정답">✓</span>}
              {isWrong && <span className="sr-only">틀린 후보</span>}
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <button
          type="button"
          disabled={selected === null}
          onClick={onSubmit}
          className="btn-primary disabled:bg-slate-300 disabled:text-slate-600"
        >
          이 규칙으로 제출
        </button>
      ) : (
        <>
          <p role="status" className={`text-center font-bold ${solved ? "text-success-strong" : "text-danger-strong"}`}>
            {solved
              ? `정답! +${scoreOf(tests.length, wrongs.length, true)}점`
              : `아쉬워요. 정답 규칙: ${ruleById(round.rule).text}`}
          </p>
          <button ref={nextRef} type="button" onClick={onNext} className="btn-primary">
            {last ? "결과 보기" : "다음 라운드"}
          </button>
        </>
      )}
      {!revealed && wrongs.length > 0 && (
        <p role="status" className="text-center text-sm font-bold text-danger-strong">
          틀렸어요! 한 번 더 고를 수 있어요.
        </p>
      )}
    </div>
  );
}