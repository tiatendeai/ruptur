from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from psycopg import Connection

from app.repositories import jarvis_ops_repo
from app.services.jarvis_skill_runtime import SkillContext, register_skill


@dataclass(frozen=True)
class EggsJarvisSkill:
    key: str = "eggs"

    def build_context(self, *, conn: Connection | None) -> SkillContext:
        if conn is None:
            return SkillContext(snapshot=None, context_blocks=[])
        try:
            snapshot = jarvis_ops_repo.mission_snapshot(conn)
            deliveries = jarvis_ops_repo.list_delivery_news(conn, limit=3)
            delivery_titles = ", ".join(d.mission_title for d in deliveries if d.mission_title) or "sem entregas recentes."
            context = (
                "Contexto Eggs (execucao operacional): "
                f"planned={snapshot['planned_count']}, in_progress={snapshot['in_progress_count']}, "
                f"blocked={snapshot['blocked_count']}, done={snapshot['done_count']}, "
                f"overdue_abertas={snapshot['overdue_open_count']}."
            )
            delivery_context = f"Ultimas noticias de entrega: {delivery_titles}"
            return SkillContext(snapshot=snapshot, context_blocks=[context, delivery_context])
        except Exception:
            return SkillContext(snapshot=None, context_blocks=[])

    def weekly_close(self, *, conn: Connection | None, reference_date: date) -> dict[str, Any]:
        week_start = reference_date - timedelta(days=reference_date.weekday())
        week_end = week_start + timedelta(days=6)
        if conn is None:
            checklist = [
                {"key": "env", "title": "Banco nao configurado", "status": "blocked", "detail": "Definir banco para fechamento operacional."}
            ]
            return {
                "reference_date": reference_date.isoformat(),
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "checklist": checklist,
                "summary": {"blocked": True},
            }

        snapshot = jarvis_ops_repo.mission_snapshot(conn)
        checklist = [
            {
                "key": "blocked_missions",
                "title": "Destravar missoes bloqueadas",
                "status": "pending" if snapshot["blocked_count"] > 0 else "done",
                "detail": f"{snapshot['blocked_count']} missao(oes) bloqueada(s).",
            },
            {
                "key": "overdue_open",
                "title": "Regularizar missoes atrasadas",
                "status": "pending" if snapshot["overdue_open_count"] > 0 else "done",
                "detail": f"{snapshot['overdue_open_count']} missao(oes) abertas em atraso.",
            },
            {
                "key": "delivery_rate",
                "title": "Consolidar entregas concluidas",
                "status": "pending" if snapshot["done_count"] == 0 else "done",
                "detail": f"{snapshot['done_count']} missao(oes) concluidas no painel atual.",
            },
        ]
        summary = {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "pending_items": sum(1 for i in checklist if i["status"] == "pending"),
            "done_items": sum(1 for i in checklist if i["status"] == "done"),
            "snapshot": snapshot,
        }
        return {
            "reference_date": reference_date.isoformat(),
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "checklist": checklist,
            "summary": summary,
        }


eggs_skill = EggsJarvisSkill()
register_skill(eggs_skill)
