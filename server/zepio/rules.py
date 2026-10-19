"""규칙 집합 R과 모호성 검사.

정답이 하나뿐이라는 말은 "R 안의 규칙 중 보이는 칸에 맞는 것이 모두 같은 값을 예측한다"는 뜻이다.
모든 가능한 가설을 막는 것이 아니다. 규칙마다 최소 증거(필요한 칸 수)를 두어 너무 적은 칸으로는 맞다고 보지 않는다.
"""
from fractions import Fraction
from itertools import product

from .models import NumberCell, Puzzle, ShapeCell


def arith(seq):
    """등차수열의 다음 값. 3칸 이상 필요하다."""
    if len(seq) < 3:
        return None
    d = seq[1] - seq[0]
    return seq[-1] + d if all(b - a == d for a, b in zip(seq, seq[1:])) else None


def geom(seq):
    """등비수열의 다음 값. 3칸 이상 필요하고 정수일 때만 인정한다."""
    if len(seq) < 3 or 0 in seq:
        return None
    r = Fraction(seq[1], seq[0])
    if not all(Fraction(b, a) == r for a, b in zip(seq, seq[1:])):
        return None
    value = seq[-1] * r
    return int(value) if value.denominator == 1 else None


def _diffs(seq):
    """이웃한 칸의 차 목록을 돌려준다."""
    return [b - a for a, b in zip(seq, seq[1:])]


def diff_arith(seq):
    """차가 등차수열인 수열의 다음 값. 차가 3개 이상 필요하다."""
    diffs = _diffs(seq)
    nxt = arith(diffs) if len(diffs) >= 3 else None
    return seq[-1] + nxt if nxt is not None else None


def diff_geom(seq):
    """차가 등비수열인 수열의 다음 값. 차가 3개 이상 필요하다."""
    diffs = _diffs(seq)
    nxt = geom(diffs) if len(diffs) >= 3 else None
    return seq[-1] + nxt if nxt is not None else None


def affine(seq):
    """x -> a*x + b (a는 2 또는 3, b는 -5..5)로 이어지는 수열의 다음 값. 4칸 이상 필요하다."""
    if len(seq) < 4:
        return None
    found = {
        a * seq[-1] + b
        for a in (2, 3)
        for b in range(-5, 6)
        if all(seq[i + 1] == a * seq[i] + b for i in range(len(seq) - 1))
    }
    return found.pop() if len(found) == 1 else None


def fib(seq):
    """앞의 두 수의 합이 다음 수인 수열의 다음 값. 4칸 이상 필요하다."""
    if len(seq) >= 4 and all(seq[i + 2] == seq[i] + seq[i + 1] for i in range(len(seq) - 2)):
        return seq[-1] + seq[-2]
    return None


def alt(seq):
    """홀수 번째와 짝수 번째가 따로 등차인 수열의 다음 값. 각각 3칸 이상 필요하다."""
    odd, even = seq[0::2], seq[1::2]
    if len(odd) < 3 or len(even) < 3:
        return None
    next_odd, next_even = arith(odd), arith(even)
    if next_odd is None or next_even is None:
        return None
    return next_odd if len(seq) % 2 == 0 else next_even


def square(seq):
    """(k+i)^2 + c 꼴 수열의 다음 값. k는 1..4, c는 -5..5이고 3칸 이상 필요하다."""
    if len(seq) < 3:
        return None
    for c in range(-5, 6):
        for k in range(1, 5):
            if all(seq[i] == (k + i) ** 2 + c for i in range(len(seq))):
                return (k + len(seq)) ** 2 + c
    return None


NUMBER_RULES = {
    "arith": arith,
    "geom": geom,
    "diff-arith": diff_arith,
    "diff-geom": diff_geom,
    "affine": affine,
    "fib": fib,
    "alt": alt,
    "square": square,
}


def _constant(seq):
    """모두 같은 값이면 그 값을 돌려준다. 3칸 이상 필요하다."""
    return seq[0] if len(seq) >= 3 and len(set(seq)) == 1 else None


def _cycle(k):
    """k칸 주기로 반복하는 값의 규칙을 만든다. k+2칸 이상 필요하다."""
    def rule(seq):
        """주기가 맞으면 다음 값을 돌려준다."""
        if len(seq) < k + 2 or not all(seq[i] == seq[i - k] for i in range(k, len(seq))):
            return None
        return seq[len(seq) - k]

    return rule


ATTRIBUTE_RULES = {"const": _constant, "cycle-2": _cycle(2), "cycle-3": _cycle(3)}


def _attribute_predictions(values):
    """도형 속성 하나(모양, 색, 회전)의 규칙들이 예측하는 다음 값의 집합을 돌려준다."""
    found = {rule(values) for rule in ATTRIBUTE_RULES.values()}
    found.discard(None)
    return found


def predictions(puzzle: Puzzle) -> set:
    """보이는 칸에 맞는 R의 규칙들이 예측하는 다음 칸 값의 집합을 돌려준다. 맞는 규칙이 없으면 빈 집합이다."""
    shown = puzzle.cells[:-1]
    if puzzle.kind == "number":
        found = {rule([c.n for c in shown]) for rule in NUMBER_RULES.values()}
        found.discard(None)
        return found
    per_attribute = [
        _attribute_predictions([getattr(c, name) for c in shown]) for name in ("shape", "color", "rot")
    ]
    return set(product(*per_attribute))


def answer_value(puzzle: Puzzle):
    """정답 선택지를 predictions와 비교할 수 있는 값으로 바꾼다."""
    option = puzzle.options[puzzle.answer]
    if isinstance(option, NumberCell):
        return option.n
    assert isinstance(option, ShapeCell)
    return (option.shape, option.color, option.rot)


def check(puzzle: Puzzle) -> list[str]:
    """문제의 모호성 문제를 문장 목록으로 돌려준다. 비어 있으면 통과다."""
    found = predictions(puzzle)
    if not found:
        return [f"{puzzle.id}: R의 어떤 규칙도 보이는 칸에 맞지 않는다"]
    if found != {answer_value(puzzle)}:
        return [f"{puzzle.id}: 규칙들의 예측 {sorted(map(str, found))}이 정답과 하나로 일치하지 않는다"]
    return []