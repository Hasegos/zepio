"""zepio 명령줄. generate는 문제 풀 JSON을 만들고, validate는 JSON을 다시 검사한다."""
import argparse
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from .generate import generate_pool
from .models import Puzzle
from .rules import check

DEFAULT_FILE = (
    Path(__file__).resolve().parents[2]
    / "web/src/games/pattern-challenge/data/pool.json"
)


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
    args = parser.parse_args(argv)

    if args.command == "generate":
        puzzles = generate_pool(args.per_level, args.seed)
        write_pool(puzzles, args.out)
        print(f"{len(puzzles)}문제를 {args.out}에 저장했다")
        args.file = args.out
    problems = validate_file(args.file)
    for line in problems:
        print(line)
    print("검증 통과" if not problems else f"검증 실패 {len(problems)}건")
    return 1 if problems else 0