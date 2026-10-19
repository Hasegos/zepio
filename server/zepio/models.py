"""Pattern Challenge 문제 형식. 웹 게임이 읽는 JSON과 같은 모양이다."""
from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SHAPES = ("triangle", "circle", "square", "star", "diamond")
COLORS = ("indigo", "cyan", "amber")


class NumberCell(BaseModel):
    """숫자 칸."""

    model_config = ConfigDict(extra="forbid")

    n: int


class ShapeCell(BaseModel):
    """도형 칸. rot는 회전 각도이고 생성기는 항상 0을 쓴다."""

    model_config = ConfigDict(extra="forbid")

    shape: Literal["triangle", "circle", "square", "star", "diamond"]
    color: Literal["indigo", "cyan", "amber"]
    rot: int = 0


Cell = NumberCell | ShapeCell


class Puzzle(BaseModel):
    """한 문제. 마지막 칸이 빈칸(None)이고 선택지는 5개이며 answer는 선택지 번호다."""

    model_config = ConfigDict(extra="forbid")

    id: str
    kind: Literal["number", "shape"]
    difficulty: Literal[1, 2, 3]
    cells: list[Cell | None]
    options: list[Cell] = Field(min_length=5, max_length=5)
    answer: int = Field(ge=0, le=4)
    explanation: str = Field(min_length=1)
    rules: list[str] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_shape(self) -> "Puzzle":
        """빈칸 위치, 칸 종류 일치, 선택지 중복을 검사한다."""
        if self.cells[-1] is not None or any(c is None for c in self.cells[:-1]):
            raise ValueError("빈칸은 마지막 한 칸이어야 한다")
        cell_type = NumberCell if self.kind == "number" else ShapeCell
        if not all(isinstance(c, cell_type) for c in [*self.cells[:-1], *self.options]):
            raise ValueError("칸 종류가 kind와 다르다")
        dumped = [o.model_dump_json() for o in self.options]
        if len(set(dumped)) != len(dumped):
            raise ValueError("선택지가 서로 달라야 한다")
        return self


class DailyFile(BaseModel):
    """날짜 하나의 일일 문제 파일. 문제 5개의 난이도는 1,1,2,2,3 순서다."""

    model_config = ConfigDict(extra="forbid")

    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    puzzles: list[Puzzle] = Field(min_length=5, max_length=5)

    @model_validator(mode="after")
    def _check_daily(self) -> "DailyFile":
        """날짜가 실제 날짜인지, 난이도 순서와 id 중복을 검사한다."""
        Date.fromisoformat(self.date)
        if [p.difficulty for p in self.puzzles] != [1, 1, 2, 2, 3]:
            raise ValueError("난이도 순서는 1,1,2,2,3이어야 한다")
        if len({p.id for p in self.puzzles}) != 5:
            raise ValueError("문제 id가 중복된다")
        return self
