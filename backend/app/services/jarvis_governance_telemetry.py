from __future__ import annotations

from collections import Counter, deque
from datetime import datetime, timezone
from typing import Any
import logging


logger = logging.getLogger(__name__)

_EVENTS: deque[dict[str, Any]] = deque(maxlen=200)
_COUNTERS: Counter[str] = Counter()


def _normalize(text: str | None) -> str:
    return (text or "").strip().lower()


def _truncate(text: str | None, limit: int = 180) -> str:
    value = " ".join((text or "").strip().split())
    if len(value) <= limit:
        return value
    return f"{value[: limit - 3].rstrip()}..."


def evaluate_no_go_adherence(response_text: str | None) -> dict[str, Any]:
    normalized = _normalize(response_text)
    flags = {
        "has_recommended_path": any(token in normalized for token in ("caminho recomendado", "recomendado:", "seguir")),
        "has_no_go_path": any(token in normalized for token in ("caminho não seguir", "caminho nao seguir", "não seguir", "nao seguir", "não fazer", "nao fazer")),
        "has_state_decision": any(token in normalized for token in ("bloqueado", "abortado", "reenquadrar", "seguir")),
        "has_missing_evidence": any(token in normalized for token in ("evidência faltante", "evidencia faltante", "faltam evidências", "faltam evidencias", "faltam dados", "evidência que falta", "evidencia que falta")),
        "has_recovery_condition": any(token in normalized for token in ("condição de retomada", "condicao de retomada", "retomar quando", "retomada")),
    }
    criteria_count = len(flags)
    score = int(round(sum(1 for ok in flags.values() if ok) / criteria_count * 100)) if criteria_count else 0
    return {"score": score, "flags": flags}


def record_governance_event(
    *,
    profile: str,
    principal_name: str,
    message: str,
    trigger_groups: list[str],
    guardrail_blocks_added: int,
    response_text: str | None,
) -> dict[str, Any]:
    adherence = evaluate_no_go_adherence(response_text)
    event = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "principal_name": principal_name,
        "message_preview": _truncate(message),
        "trigger_groups": trigger_groups,
        "trigger_count": len(trigger_groups),
        "guardrail_blocks_added": guardrail_blocks_added,
        "no_go_expected": "no_go" in trigger_groups,
        "no_go_score": adherence["score"],
        "adherence": adherence["flags"],
    }

    _EVENTS.appendleft(event)
    _COUNTERS["requests_total"] += 1
    _COUNTERS[f"profile:{profile}"] += 1
    _COUNTERS[f"no_go_score_total"] += adherence["score"]
    if "no_go" in trigger_groups:
        _COUNTERS["no_go_expected_total"] += 1
    if adherence["score"] >= 80:
        _COUNTERS["no_go_high_adherence_total"] += 1
    for trigger in trigger_groups:
        _COUNTERS[f"trigger:{trigger}"] += 1

    logger.info(
        "jarvis_governance_event profile=%s triggers=%s guardrail_blocks=%s no_go_score=%s preview=%s",
        profile,
        ",".join(trigger_groups) or "-",
        guardrail_blocks_added,
        adherence["score"],
        event["message_preview"],
    )
    return event


def list_governance_events(*, limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))
    return list(_EVENTS)[:safe_limit]


def get_governance_summary() -> dict[str, Any]:
    requests_total = _COUNTERS.get("requests_total", 0)
    avg_score = round(_COUNTERS.get("no_go_score_total", 0) / requests_total, 2) if requests_total else 0.0
    trigger_counts = {
        key.removeprefix("trigger:"): value
        for key, value in _COUNTERS.items()
        if key.startswith("trigger:")
    }
    profile_counts = {
        key.removeprefix("profile:"): value
        for key, value in _COUNTERS.items()
        if key.startswith("profile:")
    }
    return {
        "requests_total": requests_total,
        "no_go_expected_total": _COUNTERS.get("no_go_expected_total", 0),
        "no_go_high_adherence_total": _COUNTERS.get("no_go_high_adherence_total", 0),
        "avg_no_go_score": avg_score,
        "trigger_counts": dict(sorted(trigger_counts.items())),
        "profile_counts": dict(sorted(profile_counts.items())),
        "buffer_size": len(_EVENTS),
    }
