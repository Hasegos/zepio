"""일일 문제 생성과 검증 테스트."""
import json
from datetime import date, timedelta

from zepio.cli import main, validate_daily_dir
from zepio.generate import generate_daily, puzzle_signature
from zepio.models import DailyFile
from zepio.rules import check

DAY = date(2026, 10, 19)


def test_하루_문제는_5개이고_난이도_슬롯과_모호성_검사를_통과한다():
    puzzles = generate_daily(DAY)
    assert [p.difficulty for p in puzzles] == [1, 1, 2, 2, 3]
    assert [p.id for p in puzzles] == [f"2026-10-19-{n}" for n in range(1, 6)]
    assert all(check(p) == [] for p in puzzles)


def test_같은_날짜는_같은_문제이고_다른_날짜는_다르다():
    first = [p.model_dump() for p in generate_daily(DAY)]
    assert first == [p.model_dump() for p in generate_daily(DAY)]
    other = [p.model_dump() for p in generate_daily(DAY + timedelta(days=1))]
    assert [p["cells"] for p in first] != [p["cells"] for p in other]


def test_100일_치를_만들어도_모두_통과하고_숫자와_도형이_함께_나온다():
    for offset in range(100):
        puzzles = generate_daily(DAY + timedelta(days=offset))
        assert all(check(p) == [] for p in puzzles)
        assert {p.kind for p in puzzles[:4]} == {"number", "shape"}


def test_cli_daily는_파일을_만들고_있는_날짜는_건너뛴다(tmp_path):
    assert main(["daily", "--start", "2026-10-19", "--days", "3", "--out-dir", str(tmp_path)]) == 0
    names = sorted(path.name for path in tmp_path.glob("*.json"))
    assert names == ["2026-10-19.json", "2026-10-20.json", "2026-10-21.json"]

    path = tmp_path / "2026-10-19.json"
    path.write_text(path.read_text(encoding="utf-8").replace("2026-10-19-1", "edited"), encoding="utf-8")
    main(["daily", "--start", "2026-10-19", "--days", "1", "--out-dir", str(tmp_path)])
    assert "edited" in path.read_text(encoding="utf-8")
    main(["daily", "--start", "2026-10-19", "--days", "1", "--out-dir", str(tmp_path), "--force"])
    assert "edited" not in path.read_text(encoding="utf-8")
    assert json.loads(path.read_text(encoding="utf-8"))["date"] == "2026-10-19"


def test_앞으로_N일_치가_없으면_검증이_실패한다(tmp_path):
    main(["daily", "--start", "2026-10-19", "--days", "2", "--out-dir", str(tmp_path)])
    assert validate_daily_dir(tmp_path, 2, today=DAY) == []
    problems = validate_daily_dir(tmp_path, 4, today=DAY)
    assert problems == ["2026-10-21: 일일 문제 파일이 없다", "2026-10-22: 일일 문제 파일이 없다"]


def test_파일_이름과_날짜가_다르거나_모호한_문제가_있으면_검증이_실패한다(tmp_path):
    main(["daily", "--start", "2026-10-19", "--days", "1", "--out-dir", str(tmp_path)])
    (tmp_path / "2026-10-19.json").rename(tmp_path / "2026-10-25.json")
    assert any("파일 이름과 날짜" in line for line in validate_daily_dir(tmp_path))

    path = tmp_path / "2026-10-25.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    number = next(p for p in data["puzzles"] if p["kind"] == "number")
    number["answer"] = (number["answer"] + 1) % 5
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    assert any("정답과 하나로 일치하지 않는다" in line for line in validate_daily_dir(tmp_path))


def test_14일_안에는_같은_문제가_다시_나오지_않는다(tmp_path):
    main(["daily", "--start", "2026-10-19", "--days", "45", "--out-dir", str(tmp_path)])
    days = {}
    for path in sorted(tmp_path.glob("*.json")):
        daily = DailyFile.model_validate_json(path.read_text(encoding="utf-8"))
        days[date.fromisoformat(daily.date)] = [puzzle_signature(p) for p in daily.puzzles]
    for day, signs in days.items():
        assert len(set(signs)) == 5
        for back in range(1, 15):
            earlier = days.get(day - timedelta(days=back), [])
            assert not set(signs) & set(earlier), (day, back)


def test_나중_날짜를_먼저_만들어도_앞날짜가_겹치지_않고_검증이_겹침을_잡는다(tmp_path):
    main(["daily", "--start", "2026-10-24", "--days", "7", "--out-dir", str(tmp_path)])
    main(["daily", "--start", "2026-10-19", "--days", "5", "--out-dir", str(tmp_path)])
    assert validate_daily_dir(tmp_path) == []

    first = DailyFile.model_validate_json((tmp_path / "2026-10-20.json").read_text(encoding="utf-8"))
    other = tmp_path / "2026-10-29.json"
    data = json.loads(other.read_text(encoding="utf-8"))
    data["puzzles"][0] = first.puzzles[0].model_dump(mode="json")
    data["puzzles"][0]["id"] = "2026-10-29-1"
    data["puzzles"][0]["difficulty"] = 1
    other.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    assert any("2026-10-20와 2026-10-29" in line for line in validate_daily_dir(tmp_path))


def test_avoid에_든_문제는_만들지_않는다():
    first = generate_daily(DAY)
    again = generate_daily(DAY, {puzzle_signature(p) for p in first})
    assert not {puzzle_signature(p) for p in first} & {puzzle_signature(p) for p in again}
