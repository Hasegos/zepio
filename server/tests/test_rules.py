"""규칙 집합 R과 모호성 검사 테스트."""
import json
from pathlib import Path

from zepio.models import Puzzle
from zepio.rules import check

FIXED = Path(__file__).resolve().parents[2] / "web/src/games/pattern-challenge/data/fixed-puzzles.json"


def number_puzzle(shown, answer, options):
    """숫자 문제를 만든다. 선택지는 answer를 한 번 포함해야 한다."""
    return Puzzle.model_validate(
        {
            "id": "t",
            "kind": "number",
            "difficulty": 1,
            "cells": [{"n": n} for n in shown] + [None],
            "options": [{"n": n} for n in options],
            "answer": options.index(answer),
            "explanation": "테스트",
            "rules": ["t"],
        }
    )


def test_고정_문제는_모두_통과한다():
    for raw in json.loads(FIXED.read_text(encoding="utf-8")):
        assert check(Puzzle.model_validate(raw)) == [], raw["id"]


def test_두_규칙이_다르게_예측하면_모호하다():
    puzzle = number_puzzle([2, 3, 5, 8], 12, [12, 13, 9, 10, 11])
    assert "정답과 하나로 일치하지 않는다" in check(puzzle)[0]


def test_증거가_부족하면_통과하지_못한다():
    puzzle = number_puzzle([2, 4], 6, [6, 7, 8, 9, 10])
    assert "어떤 규칙도" in check(puzzle)[0]


def test_정답이_예측과_다르면_탈락한다():
    puzzle = number_puzzle([3, 6, 9, 12], 14, [14, 15, 16, 17, 18])
    assert check(puzzle)


def test_도형은_모양과_색_예측이_각각_하나여야_한다():
    cell = lambda s, c: {"shape": s, "color": c, "rot": 0}
    puzzle = Puzzle.model_validate(
        {
            "id": "t",
            "kind": "shape",
            "difficulty": 1,
            "cells": [cell("triangle", "indigo"), cell("circle", "indigo")] * 2 + [None],
            "options": [cell(s, "indigo") for s in ("triangle", "circle", "square", "star", "diamond")],
            "answer": 0,
            "explanation": "테스트",
            "rules": ["shape-cycle-2"],
        }
    )
    assert check(puzzle) == []