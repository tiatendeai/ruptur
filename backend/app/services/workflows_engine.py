from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any


@dataclass(frozen=True)
class StepDecision:
    status: str  # running|paused|done
    next_due_at: datetime | None
    touchpoint: dict[str, Any] | None


def decide_next(*, definition: dict[str, Any], state: dict[str, Any]) -> StepDecision:
    """
    Minimal workflow engine (MVP):
    - definition.steps = [{key, delayMinutes, kind, templateKey, payload}, ...]
    - state.cursor = index of next step
    - returns next_due_at and an optional touchpoint to log.

    This is config-driven and intentionally simple; we evolve into full triggers/conditions later.
    """
    steps = definition.get("steps")
    if not isinstance(steps, list) or not steps:
        return StepDecision(status="done", next_due_at=None, touchpoint=None)

    cursor = state.get("cursor")
    try:
        idx = int(cursor) if cursor is not None else 0
    except Exception:
        idx = 0

    if idx >= len(steps):
        return StepDecision(status="done", next_due_at=None, touchpoint=None)

    step = steps[idx] if isinstance(steps[idx], dict) else {}
    delay_min = step.get("delayMinutes")
    try:
        delay = int(delay_min) if delay_min is not None else 0
    except Exception:
        delay = 0

    now = datetime.now(timezone.utc)
    next_due = now + timedelta(minutes=max(0, delay))

    # Touchpoint is emitted when the step is "executed" by a runner; here we just describe it.
    tp = {
        "kind": str(step.get("kind") or "message"),
        "templateKey": step.get("templateKey"),
        "payload": step.get("payload") if isinstance(step.get("payload"), dict) else {},
        "stepKey": step.get("key") or f"step_{idx+1}",
        "cursorNext": idx + 1,
    }
    return StepDecision(status="running", next_due_at=next_due, touchpoint=tp)


def advance_state(*, state: dict[str, Any], cursor_next: int) -> dict[str, Any]:
    new_state = dict(state or {})
    new_state["cursor"] = cursor_next
    new_state["lastAdvancedAt"] = datetime.now(timezone.utc).isoformat()
    return new_state

