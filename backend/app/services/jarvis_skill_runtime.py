from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol

from psycopg import Connection


@dataclass(frozen=True)
class SkillContext:
    snapshot: dict[str, Any] | None
    context_blocks: list[str]


class JarvisSkill(Protocol):
    key: str

    def build_context(self, *, conn: Connection | None) -> SkillContext:
        ...

    def weekly_close(self, *, conn: Connection | None, reference_date: date) -> dict[str, Any]:
        ...


_SKILLS: dict[str, JarvisSkill] = {}


def register_skill(skill: JarvisSkill) -> None:
    _SKILLS[skill.key] = skill


def get_skill(key: str) -> JarvisSkill | None:
    return _SKILLS.get(key)


def list_skills() -> list[str]:
    return sorted(_SKILLS.keys())
