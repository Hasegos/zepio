"""zepio 명령줄. generate는 문제 풀, daily는 날짜별 일일 문제 파일을 만들고, validate는 JSON을 다시 검사한다."""
import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from pydantic import ValidationError

from .generate import generate_daily, generate_pool, puzzle_signature
from .models import DailyFile, Puzzle
from .rules import check

DEFAULT_FILE = (
    Path(__file__).resolve().parents[2]
    / "web/src/games/pattern-challenge/data/pool.json"
)
DEFAULT_DAILY_DIR = Path(__file__).resolve().parents[2] / "web/public/data/daily"
KST = timezone(timedelta(hours=9))


def today_kst() -> date:
    """한국 표준시(KST) 기준 오늘 날짜를 돌려준다."""
    return datetime.now(KST).date()


def write_pool(puzzles: list[Puzzle], path: Path) -> None:
    """문제를 한 줄에 하나씩 JSON 배열로 저장한다."""
    lines = [json.dumps(p.model_dump(mode="json"), ensure_ascii=False) for p in puzzles]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("[\n" + ",\n".join(lines) + "\n]\n", encoding="utf-8")


def validate_file(path: Path) -> list[str]:
    """JSON 파일의 모든 문제를 형식과 모호성으로 검사한다.

    Returns:
        문제점 문장 목록. 비어 있으면 통과다.
    """
    problems = []
    seen = set()
    for raw in json.loads(path.read_text(encoding="utf-8")):
        try:
            puzzle = Puzzle.model_validate(raw)
        except ValidationError as error:
            problems.append(f"{raw.get('id', '?')}: 형식 오류 {error.errors()[0]['msg']}")
            continue
        if puzzle.id in seen:
            problems.append(f"{puzzle.id}: id가 중복된다")
        seen.add(puzzle.id)
        problems += check(puzzle)
    return problems


def write_daily(day: date, puzzles: list[Puzzle], directory: Path, force: bool = False) -> bool:
    """날짜의 일일 문제 파일을 저장한다. 이미 있으면 force가 아닌 한 덮어쓰지 않는다.

    Returns:
        저장했으면 True, 건너뛰었으면 False
    """
    path = directory / f"{day.isoformat()}.json"
    if path.exists() and not force:
        return False
    lines = [json.dumps(p.model_dump(mode="json"), ensure_ascii=False) for p in puzzles]
    directory.mkdir(parents=True, exist_ok=True)
    body = ",\n".join(lines)
    path.write_text(f'{{"date": "{day.isoformat()}", "puzzles": [\n{body}\n]}}\n', encoding="utf-8")
    return True


def recent_signatures(directory: Path, day: date, window: int = 14) -> set:
    """day 앞 window일 안의 일일 파일에 있는 문제들의 서명을 모은다. 파일이 없거나 깨졌으면 건너뛴다."""
    found = set()
    for back in range(1, window + 1):
        path = directory / f"{(day - timedelta(days=back)).isoformat()}.json"
        if not path.exists():
            continue
        try:
            daily = DailyFile.model_validate_json(path.read_text(encoding="utf-8"))
        except ValidationError:
            continue
        found |= {puzzle_signature(p) for p in daily.puzzles}
    return found


def validate_daily_dir(directory: Path, min_ahead: int | None = None, today: date | None = None) -> list[str]:
    """일일 문제 파일을 모두 검사하고, min_ahead가 있으면 오늘부터 그 일수만큼 파일이 있는지 확인한다.

    Args:
        directory: 일일 파일 폴더
        min_ahead: 오늘을 포함해 앞으로 있어야 하는 일수
        today: 기준 날짜(기본은 KST 오늘)
    Returns:
        문제점 문장 목록. 비어 있으면 통과다.
    """
    problems = []
    existing = set()
    for path in sorted(directory.glob("*.json")) if directory.exists() else []:
        try:
            daily = DailyFile.model_validate_json(path.read_text(encoding="utf-8"))
        except ValidationError as error:
            problems.append(f"{path.name}: 형식 오류 {error.errors()[0]['msg']}")
            continue
        if path.stem != daily.date:
            problems.append(f"{path.name}: 파일 이름과 날짜 {daily.date}가 다르다")
        existing.add(daily.date)
        for puzzle in daily.puzzles:
            problems += check(puzzle)
    if min_ahead:
        start = today or today_kst()
        for offset in range(min_ahead):
            day = (start + timedelta(days=offset)).isoformat()
            if day not in existing:
                problems.append(f"{day}: 일일 문제 파일이 없다")
    return problems


def main(argv=None) -> int:
    """명령을 실행하고 종료 코드를 돌려준다. 검증에 문제가 있으면 1이다."""
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(prog="zepio")
    commands = parser.add_subparsers(dest="command", required=True)
    gen = commands.add_parser("generate", help="문제 풀을 만들어 JSON으로 저장한다")
    gen.add_argument("--per-level", type=int, default=20)
    gen.add_argument("--seed", type=int, default=20261019)
    gen.add_argument("--out", type=Path, default=DEFAULT_FILE)
    val = commands.add_parser("validate", help="JSON 파일의 모든 문제를 검사한다")
    val.add_argument("--file", type=Path, default=DEFAULT_FILE)
    val.add_argument("--daily-dir", type=Path, default=DEFAULT_DAILY_DIR)
    val.add_argument("--min-ahead", type=int, default=None, help="오늘부터 이 일수만큼 일일 파일이 있어야 한다")
    day = commands.add_parser("daily", help="날짜별 일일 문제 파일을 만든다")
    day.add_argument("--start", type=date.fromisoformat, default=None, help="시작 날짜(기본 KST 오늘)")
    day.add_argument("--days", type=int, default=30)
    day.add_argument("--out-dir", type=Path, default=DEFAULT_DAILY_DIR)
    day.add_argument("--force", action="store_true", help="이미 있는 날짜 파일도 다시 만든다")
    args = parser.parse_args(argv)

    if args.command == "generate":
        puzzles = generate_pool(args.per_level, args.seed)
        write_pool(puzzles, args.out)
        print(f"{len(puzzles)}문제를 {args.out}에 저장했다")
        args.file = args.out
    if args.command == "daily":
        start = args.start or today_kst()
        written = 0
        for offset in range(args.days):
            day = start + timedelta(days=offset)
            avoid = recent_signatures(args.out_dir, day)
            if write_daily(day, generate_daily(day, avoid), args.out_dir, args.force):
                written += 1
        print(f"{written}일 치를 {args.out_dir}에 저장했다 (건너뜀 {args.days - written}일)")
        problems = validate_daily_dir(args.out_dir)
    elif args.command == "validate":
        problems = validate_file(args.file) + validate_daily_dir(args.daily_dir, args.min_ahead)
    else:
        problems = validate_file(args.file)
    for line in problems:
        print(line)
    print("검증 통과" if not problems else f"검증 실패 {len(problems)}건")
    return 1 if problems else 0