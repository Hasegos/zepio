"""규칙으로 문제를 만든다. 모호성 검사를 통과하지 못한 문제는 버리고 다시 만든다."""
import json
import random
from datetime import date

from .models import COLORS, SHAPES, NumberCell, Puzzle, ShapeCell
from .rules import arith, check, geom

NUMBER_LIMIT = 300
SHAPE_NAMES = {"triangle": "삼각형", "circle": "원", "square": "사각형", "star": "별", "diamond": "마름모"}
COLOR_NAMES = {"indigo": "남색", "cyan": "하늘색", "amber": "주황색"}
MAX_ATTEMPTS = 2000
ATTEMPTS_PER_RULE = 100
DAILY_SLOTS = (1, 1, 2, 2, 3)


def _arith(rng):
    """등차수열. 칸 수 4~5."""
    a, d, shown = rng.randint(1, 20), rng.randint(2, 9), rng.choice([4, 5])
    seq = [a + i * d for i in range(shown + 1)]
    text = f"{d}씩 커집니다. {seq[-2]} 다음은 {seq[-2]} + {d} = {seq[-1]}입니다."
    return seq, text, "arith"


def _geom(rng):
    """등비수열. 4칸."""
    a, r = rng.randint(1, 3), rng.choice([2, 3])
    seq = [a * r**i for i in range(5)]
    text = f"{r}배씩 커집니다. {seq[-2]} 다음은 {seq[-2]} × {r} = {seq[-1]}입니다."
    return seq, text, "geom"


def _diff_arith(rng):
    """차가 등차수열인 수열. 5칸."""
    a, first, step = rng.randint(1, 10), rng.randint(1, 4), rng.randint(1, 3)
    diffs = [first + i * step for i in range(5)]
    seq = [a]
    for d in diffs:
        seq.append(seq[-1] + d)
    shown = ", ".join(map(str, diffs[:-1]))
    text = (
        f"더하는 수는 {shown}처럼 {step}씩 커집니다. 다음에 더하는 수는 {diffs[-1]}입니다. "
        f"{seq[-2]} + {diffs[-1]} = {seq[-1]}입니다."
    )
    return seq, text, "diff-arith"


def _diff_geom(rng):
    """차가 등비수열인 수열. 5칸."""
    a, first, r = rng.randint(1, 5), rng.randint(1, 2), rng.choice([2, 3])
    diffs = [first * r**i for i in range(5)]
    seq = [a]
    for d in diffs:
        seq.append(seq[-1] + d)
    shown = ", ".join(map(str, diffs[:-1]))
    text = (
        f"더하는 수는 {shown}처럼 {r}배씩 커집니다. 다음에 더하는 수는 {diffs[-1]}입니다. "
        f"{seq[-2]} + {diffs[-1]} = {seq[-1]}입니다."
    )
    return seq, text, "diff-geom"


def _affine(rng):
    """x -> a*x + b 수열. 4칸."""
    a, b = rng.choice([2, 3]), rng.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    seq = [rng.randint(2, 6)]
    for _ in range(4):
        seq.append(a * seq[-1] + b)
    sign = "+" if b > 0 else "-"
    text = (
        f"규칙은 앞의 수 × {a} {sign} {abs(b)}입니다. "
        f"{seq[-2]} × {a} {sign} {abs(b)} = {seq[-1]}입니다."
    )
    return seq, text, "affine"


def _fib(rng):
    """앞의 두 수를 더하는 수열. 6칸."""
    seq = [rng.randint(1, 5), rng.randint(1, 5)]
    for _ in range(5):
        seq.append(seq[-1] + seq[-2])
    text = f"앞의 두 수를 더하면 다음 수입니다. 다음은 {seq[-3]} + {seq[-2]} = {seq[-1]}입니다."
    return seq, text, "fib"


def _alt(rng):
    """홀수 번째와 짝수 번째가 따로 커지는 수열. 6칸. 두 증가량이 같으면 None이다."""
    a, step_odd = rng.randint(1, 9), rng.randint(2, 5)
    b, step_even = rng.randint(1, 9), rng.randint(1, 6)
    if step_odd == step_even:
        return None
    seq = [(a + (i // 2) * step_odd) if i % 2 == 0 else (b + (i // 2) * step_even) for i in range(7)]
    text = (
        f"홀수 번째 수는 {step_odd}씩, 짝수 번째 수는 {step_even}씩 커집니다. "
        f"다음은 홀수 번째 수이므로 {seq[-3]} + {step_odd} = {seq[-1]}입니다."
    )
    return seq, text, "alt"


NUMBER_GENERATORS = {
    1: [_arith, _geom],
    2: [_diff_arith, _affine, _alt],
    3: [_diff_geom, _fib],
}

SHAPE_COMBOS = {
    1: [(2, None), (None, 2)],
    2: [(3, None), (None, 3), (2, 3)],
    3: [(3, 2), (3, 3)],
}
SHAPE_SHOWN = {1: 4, 2: 5, 3: 6}


def _number_puzzle(difficulty, index, rng):
    """숫자 문제 한 개를 만든다. 값이 범위를 벗어나면 None이다."""
    generators = NUMBER_GENERATORS[difficulty]
    built = generators[index % len(generators)](rng)
    if built is None:
        return None
    seq, text, rule = built
    if not all(1 <= n <= NUMBER_LIMIT for n in seq):
        return None
    if rule not in ("arith", "geom") and (arith(seq[:-1]) is not None or geom(seq[:-1]) is not None):
        return None
    answer = seq[-1]
    plausible = [seq[-2] + (seq[-2] - seq[-3]), answer + 1, answer - 1]
    spare = [answer + delta for delta in (2, -2, 3, -3, 10, -10)]
    rng.shuffle(spare)
    picks = []
    for value in plausible + spare:
        if 1 <= value <= NUMBER_LIMIT and value != answer and value not in picks:
            picks.append(value)
    options = picks[:4]
    position = rng.randrange(5)
    options.insert(position, answer)
    return {
        "kind": "number",
        "cells": [{"n": n} for n in seq[:-1]] + [None],
        "options": [{"n": n} for n in options],
        "answer": position,
        "explanation": text,
        "rules": [rule],
    }


def _shape_puzzle(difficulty, index, rng):
    """도형 문제 한 개를 만든다. 모양, 색 순환 조합은 난이도별 목록에서 돌아가며 고른다."""
    combos = SHAPE_COMBOS[difficulty]
    shape_cycle, color_cycle = combos[index % len(combos)]
    shapes = rng.sample(SHAPES, shape_cycle or 1)
    colors = rng.sample(COLORS, color_cycle or 1)
    offset = rng.randrange(len(colors)) if color_cycle else 0
    total = SHAPE_SHOWN[difficulty] + 1
    seq = [
        {"shape": shapes[i % len(shapes)], "color": colors[(i + offset) % len(colors)], "rot": 0}
        for i in range(total)
    ]
    answer = seq[-1]
    rules, parts = [], []
    if shape_cycle:
        rules.append(f"shape-cycle-{shape_cycle}")
        parts.append("모양은 " + ", ".join(SHAPE_NAMES[s] for s in shapes) + " 순서로 반복됩니다.")
    if color_cycle:
        rules.append(f"color-cycle-{color_cycle}")
        ordered = [colors[(offset + i) % len(colors)] for i in range(len(colors))]
        parts.append("색은 " + ", ".join(COLOR_NAMES[c] for c in ordered) + " 순서로 반복됩니다.")
    parts.append(f"다음은 {COLOR_NAMES[answer['color']]} {SHAPE_NAMES[answer['shape']]}입니다.")

    wrong = [seq[-2]]
    wrong += [{**answer, "shape": s} for s in SHAPES if s != answer["shape"]]
    wrong += [{**answer, "color": c} for c in COLORS if c != answer["color"]]
    rest = wrong[1:]
    rng.shuffle(rest)
    options = []
    for cell in [wrong[0], *rest]:
        if cell != answer and cell not in options:
            options.append(cell)
    options = options[:4]
    position = rng.randrange(5)
    options.insert(position, answer)
    return {
        "kind": "shape",
        "cells": seq[:-1] + [None],
        "options": options,
        "answer": position,
        "explanation": " ".join(parts),
        "rules": rules,
    }


def signature(kind, rules, cells) -> tuple:
    """같은 문제인지 비교하는 서명을 만든다. 종류, 규칙, 보이는 칸이 같으면 같은 서명이다."""
    return (kind, tuple(rules), json.dumps(cells, sort_keys=True))


def puzzle_signature(puzzle: Puzzle) -> tuple:
    """만들어 둔 문제의 서명을 돌려준다."""
    dumped = puzzle.model_dump(mode="json")
    return signature(dumped["kind"], dumped["rules"], dumped["cells"])


def make_puzzle(kind, difficulty, index, rng, seen, puzzle_id) -> Puzzle:
    """모호성 검사를 통과하고 seen에 없는 문제를 만들 때까지 다시 시도한다.

    Args:
        kind: number 또는 shape
        difficulty: 1, 2, 3
        index: 같은 난이도 안에서 규칙을 고르는 번호(개수로 나눈 나머지를 쓰고, 한 규칙으로 100번 실패하면 다음 규칙으로 넘어간다)
        rng: 난수 생성기
        seen: 이미 만든 문제의 서명 집합. 새로 만든 문제의 서명이 더해진다
        puzzle_id: 문제 id
    Raises:
        RuntimeError: 시도 횟수 안에 통과하는 문제를 만들지 못했을 때
    """
    build = _number_puzzle if kind == "number" else _shape_puzzle
    for attempt in range(MAX_ATTEMPTS):
        data = build(difficulty, index + attempt // ATTEMPTS_PER_RULE, rng)
        if data is None:
            continue
        sign = signature(data["kind"], data["rules"], data["cells"])
        if sign in seen:
            continue
        puzzle = Puzzle(id=puzzle_id, difficulty=difficulty, **data)
        if check(puzzle):
            continue
        seen.add(sign)
        return puzzle
    raise RuntimeError(f"{puzzle_id}: 난이도 {difficulty} {kind} 문제를 만들지 못했다")


def generate_pool(per_level: int = 20, seed: int = 20261019) -> list[Puzzle]:
    """난이도 1, 2, 3마다 per_level개씩 문제를 만든다. 숫자와 도형을 번갈아 만들고, 같은 시드는 같은 결과를 낸다.

    Args:
        per_level: 난이도별 문제 수
        seed: 난수 시드
    Returns:
        모호성 검사를 통과한 문제 목록
    Raises:
        RuntimeError: 시도 횟수 안에 통과하는 문제를 만들지 못했을 때
    """
    rng = random.Random(seed)
    pool, seen = [], set()
    for difficulty in (1, 2, 3):
        for i in range(per_level):
            kind = "number" if i % 2 == 0 else "shape"
            pool.append(make_puzzle(kind, difficulty, i // 2, rng, seen, f"pc-{len(pool) + 1:03d}"))
    return pool


def generate_daily(day: date, avoid=frozenset()) -> list[Puzzle]:
    """날짜 하나의 일일 문제 5개(난이도 1,1,2,2,3)를 만든다. 같은 날짜는 항상 같은 문제를 낸다.

    숫자와 도형은 날짜마다 번갈아 시작하고 마지막 문제의 종류만 무작위로 정한다.

    Args:
        day: 일일 문제 날짜
        avoid: 만들지 말아야 할 문제의 서명 집합(최근 날짜와 겹치지 않게 할 때 쓴다)
    Returns:
        모호성 검사를 통과한 문제 5개
    """
    rng = random.Random(f"zepio-daily-{day.isoformat()}")
    first = day.toordinal() % 2
    kinds = ["number" if (i + first) % 2 == 0 else "shape" for i in range(4)]
    kinds.append(rng.choice(["number", "shape"]))
    seen, puzzles = set(avoid), []
    for number, (difficulty, kind) in enumerate(zip(DAILY_SLOTS, kinds), start=1):
        index = rng.randrange(6)
        puzzles.append(make_puzzle(kind, difficulty, index, rng, seen, f"{day.isoformat()}-{number}"))
    return puzzles