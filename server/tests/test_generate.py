"""문제 생성과 CLI 테스트."""
import json

from zepio.cli import main, write_pool
from zepio.generate import generate_pool
from zepio.rules import check


def test_생성된_문제는_모두_모호성_검사를_통과하고_id가_유일하다():
    pool = generate_pool(per_level=10, seed=1)
    assert len(pool) == 30
    assert len({p.id for p in pool}) == 30
    assert all(check(p) == [] for p in pool)


def test_난이도와_종류가_고르게_나온다():
    pool = generate_pool(per_level=10, seed=1)
    for level in (1, 2, 3):
        kinds = [p.kind for p in pool if p.difficulty == level]
        assert kinds.count("number") == 5 and kinds.count("shape") == 5


def test_같은_시드는_같은_결과를_낸다():
    a = [p.model_dump() for p in generate_pool(per_level=6, seed=7)]
    b = [p.model_dump() for p in generate_pool(per_level=6, seed=7)]
    assert a == b


def test_cli_generate_후_validate가_통과한다(tmp_path):
    out = tmp_path / "pool.json"
    assert main(["generate", "--per-level", "6", "--out", str(out)]) == 0
    assert main(["validate", "--file", str(out)]) == 0


def test_cli_validate는_모호한_문제가_있으면_1을_돌려준다(tmp_path):
    out = tmp_path / "pool.json"
    write_pool(generate_pool(per_level=6, seed=3), out)
    data = json.loads(out.read_text(encoding="utf-8"))
    number = next(p for p in data if p["kind"] == "number")
    number["answer"] = (number["answer"] + 1) % 5
    out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    assert main(["validate", "--file", str(out)]) == 1