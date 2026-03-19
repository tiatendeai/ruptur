from __future__ import annotations

from datetime import date
from typing import Any

from app.services.agent_service import agent_service


def _safe_snapshot(snapshot: dict[str, Any] | None) -> dict[str, int]:
    base = snapshot or {}
    return {
        "planned_count": int(base.get("planned_count") or 0),
        "in_progress_count": int(base.get("in_progress_count") or 0),
        "blocked_count": int(base.get("blocked_count") or 0),
        "done_count": int(base.get("done_count") or 0),
        "canceled_count": int(base.get("canceled_count") or 0),
        "overdue_open_count": int(base.get("overdue_open_count") or 0),
    }


def _mission_label(item: dict[str, Any]) -> str:
    title = str(item.get("title") or "Missao sem titulo").strip()
    status = str(item.get("status") or "unknown").strip()
    priority = str(item.get("priority") or "-").strip()
    owner = str(item.get("owner") or "sem dono").strip()
    return f"{title} [{status}/{priority}] · owner={owner}"


def _delivery_label(item: dict[str, Any]) -> str:
    title = str(item.get("mission_title") or "Entrega sem titulo").strip()
    message = str(item.get("message") or "sem detalhe").strip()
    return f"{title}: {message}"


def _context_blocks(
    *,
    snapshot: dict[str, int],
    blocked: list[dict[str, Any]],
    critical_in_progress: list[dict[str, Any]],
    critical_planned: list[dict[str, Any]],
    delivery_news: list[dict[str, Any]],
    reason: str | None,
) -> list[str]:
    blocked_lines = "; ".join(_mission_label(item) for item in blocked[:5]) or "sem bloqueios criticos registrados"
    in_progress_lines = "; ".join(_mission_label(item) for item in critical_in_progress[:5]) or "sem p0 em execucao"
    planned_lines = "; ".join(_mission_label(item) for item in critical_planned[:5]) or "sem p0 planejado"
    delivery_lines = "; ".join(_delivery_label(item) for item in delivery_news[:5]) or "sem entregas recentes"
    return [
        (
            "Snapshot confirmado de operacoes: "
            f"planned={snapshot['planned_count']}, in_progress={snapshot['in_progress_count']}, "
            f"blocked={snapshot['blocked_count']}, done={snapshot['done_count']}, "
            f"canceled={snapshot['canceled_count']}, overdue_open={snapshot['overdue_open_count']}."
        ),
        f"Bloqueios relevantes: {blocked_lines}.",
        f"Criticos em execucao: {in_progress_lines}.",
        f"Criticos planejados: {planned_lines}.",
        f"Noticias de entrega: {delivery_lines}.",
        f"Motivo operacional do contexto: {reason or 'database_ok'}.",
    ]


def build_executive_daily_brief(
    *,
    principal_name: str,
    reference_date: date,
    snapshot: dict[str, Any] | None,
    blocked: list[dict[str, Any]],
    critical_in_progress: list[dict[str, Any]],
    critical_planned: list[dict[str, Any]],
    delivery_news: list[dict[str, Any]],
    reason: str | None = None,
    include_ai: bool = True,
) -> dict[str, Any]:
    safe = _safe_snapshot(snapshot)
    context_blocks = _context_blocks(
        snapshot=safe,
        blocked=blocked,
        critical_in_progress=critical_in_progress,
        critical_planned=critical_planned,
        delivery_news=delivery_news,
        reason=reason,
    )

    status_summary: str | None = None
    jarvis_summary: str | None = None
    if include_ai:
        status_prompt = (
            "Monte um status executivo curtissimo em pt-BR, mobile-first, com 4 linhas e sem inventar dados. "
            "Formato: Ontem | Agora | Atenção imediata | Proxima janela. "
            "Se nao houver dado suficiente, diga isso explicitamente."
        )
        status_summary = agent_service.get_response(
            profile="ops",
            principal_name=principal_name,
            user_message=status_prompt,
            persona="iazinha",
            context_blocks=context_blocks,
        )

        jarvis_prompt = (
            "Com base nos dados confirmados e no resumo do Status abaixo, gere um resumo executivo de CEO operacional. "
            "Estrutura obrigatoria: (1) ontem, (2) hoje, (3) amanha, (4) risco principal, (5) decisao recomendada. "
            "Se houver bloqueio critico, destaque no topo."
        )
        jarvis_context = [*context_blocks]
        if isinstance(status_summary, str) and status_summary.strip():
            jarvis_context.append(f"Resumo do Status/IAzinha: {status_summary.strip()}")
        jarvis_summary = agent_service.get_jarvis_eggs_response(
            principal_name=principal_name,
            user_message=jarvis_prompt,
            context_blocks=jarvis_context,
        )

    return {
        "ok": True,
        "reference_date": reference_date.isoformat(),
        "snapshot": safe,
        "blocked": blocked,
        "critical_in_progress": critical_in_progress,
        "critical_planned": critical_planned,
        "delivery_news": delivery_news,
        "reason": reason or "database_ok",
        "duo": {
            "status": {
                "persona": "iazinha",
                "profile": "ops",
                "summary": status_summary,
            },
            "jarvis": {
                "persona": "jarvis",
                "profile": "eggs",
                "summary": jarvis_summary,
            },
        },
    }
