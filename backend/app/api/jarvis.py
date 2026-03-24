from __future__ import annotations

from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.security import require_jarvis_access
from app.db import DatabaseNotConfiguredError, connect
from app.repositories import jarvis_ops_repo
from app.services.agent_service import agent_service
from app.services.jarvis_daily_brief_service import build_executive_daily_brief
from app.services.jarvis_governance_context import build_governance_context
from app.services.jarvis_skill_runtime import SkillContext, get_skill

# garante registro da skill no runtime
from app.services import jarvis_cfo_skill as _jarvis_cfo_skill  # noqa: F401
from app.services import jarvis_eggs_skill as _jarvis_eggs_skill  # noqa: F401


# Single control plane para Diego e para a camada de servico do Jarvis.
router = APIRouter(prefix="/jarvis", tags=["jarvis"], dependencies=[Depends(require_jarvis_access)])


class JarvisHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class JarvisAskRequest(BaseModel):
    message: str = Field(min_length=1)
    principal_name: str = Field(default="Diego", min_length=1)
    profile: Literal["ops", "cfo", "vcfo", "vcvo", "eggs", "vceo", "vcontroller", "vadminops", "vfinops"] = "ops"
    history: list[JarvisHistoryItem] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)


class JarvisCfoAskRequest(BaseModel):
    message: str = Field(min_length=1)
    principal_name: str = Field(default="Diego", min_length=1)
    focus: str | None = Field(default=None, description="ex.: caixa, margem, projetos, pessoal, casal")
    history: list[JarvisHistoryItem] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)
    include_snapshot: bool = True


class JarvisEggsAskRequest(BaseModel):
    message: str = Field(min_length=1)
    principal_name: str = Field(default="Diego", min_length=1)
    history: list[JarvisHistoryItem] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)
    include_snapshot: bool = True


class JarvisVcvoAskRequest(BaseModel):
    message: str = Field(min_length=1)
    principal_name: str = Field(default="Diego", min_length=1)
    focus: str | None = Field(default=None, description="ex.: alocacao de capital, prioridade, risco")
    history: list[JarvisHistoryItem] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)
    include_snapshot: bool = True


def _to_history(items: list[JarvisHistoryItem]) -> list[dict[str, str]]:
    return [{"role": i.role, "content": i.content} for i in items]


def _governed_context(profile: str, message: str, context_blocks: list[str]) -> list[str]:
    return build_governance_context(profile=profile, message=message, context_blocks=context_blocks)


def _load_skill_context(skill_key: str) -> SkillContext:
    skill = get_skill(skill_key)
    if not skill:
        return SkillContext(snapshot=None, context_blocks=[])
    try:
        with connect() as conn:
            return skill.build_context(conn=conn)
    except DatabaseNotConfiguredError:
        return skill.build_context(conn=None)
    except Exception:
        return SkillContext(snapshot=None, context_blocks=[])


def _load_cfo_context() -> SkillContext:
    return _load_skill_context("cfo")


def _load_eggs_context() -> SkillContext:
    return _load_skill_context("eggs")


def _load_vcvo_context() -> SkillContext:
    # vCVO decisions depend on both financial and execution context.
    cfo_ctx = _load_cfo_context()
    eggs_ctx = _load_eggs_context()
    blocks = [*cfo_ctx.context_blocks, *eggs_ctx.context_blocks]
    return SkillContext(snapshot={"vcfo": {"vcfo_finance": cfo_ctx.snapshot, "vceo_ops": eggs_ctx.snapshot}}, context_blocks=blocks)


@router.post("/ask")
def ask(req: JarvisAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]

    if req.profile == "cfo":
        cfo_ctx = _load_cfo_context()
        context_blocks.extend(cfo_ctx.context_blocks)
        context_blocks = _governed_context("vcfo", req.message, context_blocks)
        response = agent_service.get_jarvis_cfo_response(
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile == "vcfo":
        cfo_ctx = _load_cfo_context()
        context_blocks.extend(cfo_ctx.context_blocks)
        context_blocks = _governed_context("vcfo", req.message, context_blocks)
        response = agent_service.get_jarvis_cfo_response(
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile == "vcvo":
        vcvo_ctx = _load_vcvo_context()
        context_blocks.extend(vcvo_ctx.context_blocks)
        context_blocks = _governed_context("vcvo", req.message, context_blocks)
        response = agent_service.get_jarvis_vcvo_response(
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile == "vcontroller":
        cfo_ctx = _load_cfo_context()
        context_blocks.extend(cfo_ctx.context_blocks)
        context_blocks = _governed_context("vcontroller", req.message, context_blocks)
        response = agent_service.get_profile_response(
            profile="vcontroller",
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile == "vadminops":
        eggs_ctx = _load_eggs_context()
        context_blocks.extend(eggs_ctx.context_blocks)
        context_blocks = _governed_context("vadminops", req.message, context_blocks)
        response = agent_service.get_profile_response(
            profile="vadminops",
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile == "vfinops":
        cfo_ctx = _load_cfo_context()
        eggs_ctx = _load_eggs_context()
        context_blocks.extend(cfo_ctx.context_blocks)
        context_blocks.extend(eggs_ctx.context_blocks)
        context_blocks = _governed_context("vfinops", req.message, context_blocks)
        response = agent_service.get_profile_response(
            profile="vfinops",
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    elif req.profile in {"eggs", "vceo"}:
        eggs_ctx = _load_eggs_context()
        context_blocks.extend(eggs_ctx.context_blocks)
        context_blocks = _governed_context("vceo", req.message, context_blocks)
        response = agent_service.get_jarvis_eggs_response(
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )
    else:
        context_blocks = _governed_context("ops", req.message, context_blocks)
        response = agent_service.get_response(
            profile="ops",
            principal_name=req.principal_name,
            user_message=req.message,
            history=history,
            context_blocks=context_blocks,
        )

    return {"ok": True, "profile": req.profile, "response": response}


@router.post("/ask/cfo")
def ask_cfo(req: JarvisCfoAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]

    cfo_ctx = _load_cfo_context()
    if req.include_snapshot:
        context_blocks.extend(cfo_ctx.context_blocks)
    context_blocks = _governed_context("vcfo", req.message, context_blocks)

    response = agent_service.get_jarvis_cfo_response(
        principal_name=req.principal_name,
        user_message=req.message,
        focus=req.focus,
        history=history,
        context_blocks=context_blocks,
    )

    return {"ok": True, "profile": "vcfo", "response": response, "snapshot": cfo_ctx.snapshot if req.include_snapshot else None}


@router.post("/ask/vcfo")
def ask_vcfo(req: JarvisCfoAskRequest) -> dict[str, Any]:
    return ask_cfo(req)


@router.post("/ask/vcvo")
def ask_vcvo(req: JarvisVcvoAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]
    vcvo_ctx = _load_vcvo_context()
    if req.include_snapshot:
        context_blocks.extend(vcvo_ctx.context_blocks)
    if req.focus and req.focus.strip():
        context_blocks.append(f"Foco atual do vCVO: {req.focus.strip()}.")
    context_blocks = _governed_context("vcvo", req.message, context_blocks)

    response = agent_service.get_jarvis_vcvo_response(
        principal_name=req.principal_name,
        user_message=req.message,
        history=history,
        context_blocks=context_blocks,
    )
    return {"ok": True, "profile": "vcvo", "response": response, "snapshot": vcvo_ctx.snapshot if req.include_snapshot else None}


@router.post("/ask/eggs")
def ask_eggs(req: JarvisEggsAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]
    eggs_ctx = _load_eggs_context()
    if req.include_snapshot:
        context_blocks.extend(eggs_ctx.context_blocks)
    context_blocks = _governed_context("vceo", req.message, context_blocks)

    response = agent_service.get_jarvis_eggs_response(
        principal_name=req.principal_name,
        user_message=req.message,
        history=history,
        context_blocks=context_blocks,
    )

    return {"ok": True, "profile": "eggs", "response": response, "snapshot": eggs_ctx.snapshot if req.include_snapshot else None}


@router.post("/ask/vceo")
def ask_vceo(req: JarvisEggsAskRequest) -> dict[str, Any]:
    result = ask_eggs(req)
    result["profile"] = "vceo"
    return result


@router.post("/ask/vcontroller")
def ask_vcontroller(req: JarvisCfoAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]
    cfo_ctx = _load_cfo_context()
    if req.include_snapshot:
        context_blocks.extend(cfo_ctx.context_blocks)
    if req.focus and req.focus.strip():
        context_blocks.append(f"Foco atual do vController: {req.focus.strip()}.")
    context_blocks = _governed_context("vcontroller", req.message, context_blocks)
    response = agent_service.get_profile_response(
        profile="vcontroller",
        principal_name=req.principal_name,
        user_message=req.message,
        history=history,
        context_blocks=context_blocks,
    )
    return {"ok": True, "profile": "vcontroller", "response": response, "snapshot": cfo_ctx.snapshot if req.include_snapshot else None}


@router.post("/ask/vadminops")
def ask_vadminops(req: JarvisEggsAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]
    eggs_ctx = _load_eggs_context()
    if req.include_snapshot:
        context_blocks.extend(eggs_ctx.context_blocks)
    context_blocks = _governed_context("vadminops", req.message, context_blocks)
    response = agent_service.get_profile_response(
        profile="vadminops",
        principal_name=req.principal_name,
        user_message=req.message,
        history=history,
        context_blocks=context_blocks,
    )
    return {"ok": True, "profile": "vadminops", "response": response, "snapshot": eggs_ctx.snapshot if req.include_snapshot else None}


@router.post("/ask/vfinops")
def ask_vfinops(req: JarvisCfoAskRequest) -> dict[str, Any]:
    history = _to_history(req.history)
    context_blocks = [c for c in req.context if isinstance(c, str) and c.strip()]
    cfo_ctx = _load_cfo_context()
    eggs_ctx = _load_eggs_context()
    if req.include_snapshot:
        context_blocks.extend(cfo_ctx.context_blocks)
        context_blocks.extend(eggs_ctx.context_blocks)
    if req.focus and req.focus.strip():
        context_blocks.append(f"Foco atual do vFinOps: {req.focus.strip()}.")
    context_blocks = _governed_context("vfinops", req.message, context_blocks)
    response = agent_service.get_profile_response(
        profile="vfinops",
        principal_name=req.principal_name,
        user_message=req.message,
        history=history,
        context_blocks=context_blocks,
    )
    return {
        "ok": True,
        "profile": "vfinops",
        "response": response,
        "snapshot": {"vcfo": cfo_ctx.snapshot, "vceo": eggs_ctx.snapshot} if req.include_snapshot else None,
    }


class JarvisCfoWeeklyCloseRequest(BaseModel):
    principal_name: str = Field(default="Diego", min_length=1)
    reference_date: date | None = None
    include_ai_summary: bool = True
    history: list[JarvisHistoryItem] = Field(default_factory=list)


@router.post("/cfo/weekly-close")
def jarvis_cfo_weekly_close(req: JarvisCfoWeeklyCloseRequest) -> dict[str, Any]:
    ref = req.reference_date or date.today()
    skill = get_skill("cfo")
    if not skill:
        return {"ok": False, "reason": "skill_cfo_not_registered"}

    try:
        with connect() as conn:
            close_result = skill.weekly_close(conn=conn, reference_date=ref)
            conn.commit()
    except DatabaseNotConfiguredError:
        close_result = skill.weekly_close(conn=None, reference_date=ref)
    except Exception:
        close_result = skill.weekly_close(conn=None, reference_date=ref)

    ai_summary: str | None = None
    if req.include_ai_summary:
        checklist = close_result.get("checklist") or []
        checklist_lines = "; ".join(
            f"{item.get('title')}: {item.get('status')} ({item.get('detail')})" for item in checklist
        )
        prompt = (
            "Use o fechamento semanal e entregue um resumo executivo com prioridades da semana. "
            "Se houver pendencias de caixa, destacar no topo.\n"
            f"Checklist: {checklist_lines}"
        )
        ai_summary = agent_service.get_jarvis_cfo_response(
            principal_name=req.principal_name,
            user_message=prompt,
            focus="fechamento semanal",
            history=_to_history(req.history),
            context_blocks=[],
        )

    return {"ok": True, "profile": "vcfo", "weekly_close": close_result, "ai_summary": ai_summary}


@router.post("/vcfo/weekly-close")
def jarvis_vcfo_weekly_close(req: JarvisCfoWeeklyCloseRequest) -> dict[str, Any]:
    return jarvis_cfo_weekly_close(req)


class JarvisVcvoWeeklyBriefRequest(BaseModel):
    principal_name: str = Field(default="Diego", min_length=1)
    reference_date: date | None = None
    include_ai_summary: bool = True
    history: list[JarvisHistoryItem] = Field(default_factory=list)


@router.post("/vcvo/weekly-brief")
def jarvis_vcvo_weekly_brief(req: JarvisVcvoWeeklyBriefRequest) -> dict[str, Any]:
    ref = req.reference_date or date.today()
    cfo_skill = get_skill("cfo")
    eggs_skill = get_skill("eggs")
    if not cfo_skill and not eggs_skill:
        return {"ok": False, "reason": "vcfo_and_eggs_skills_not_registered"}

    try:
        with connect() as conn:
            vcfo_weekly = cfo_skill.weekly_close(conn=conn, reference_date=ref) if cfo_skill else None
            eggs_weekly = eggs_skill.weekly_close(conn=conn, reference_date=ref) if eggs_skill else None
            conn.commit()
    except DatabaseNotConfiguredError:
        vcfo_weekly = cfo_skill.weekly_close(conn=None, reference_date=ref) if cfo_skill else None
        eggs_weekly = eggs_skill.weekly_close(conn=None, reference_date=ref) if eggs_skill else None
    except Exception:
        vcfo_weekly = cfo_skill.weekly_close(conn=None, reference_date=ref) if cfo_skill else None
        eggs_weekly = eggs_skill.weekly_close(conn=None, reference_date=ref) if eggs_skill else None

    ai_summary: str | None = None
    if req.include_ai_summary:
        vcfo_pending = (vcfo_weekly or {}).get("summary", {}).get("pending_items", 0)
        eggs_pending = (eggs_weekly or {}).get("summary", {}).get("pending_items", 0)
        prompt = (
            "Consolide um weekly brief executivo para o Diego (CVO). "
            "Priorize decisões por impacto, risco e caixa. "
            f"Pendencias vCFO={vcfo_pending}; pendencias vCEO(Eggs)={eggs_pending}."
        )
        ai_summary = agent_service.get_jarvis_vcvo_response(
            principal_name=req.principal_name,
            user_message=prompt,
            history=_to_history(req.history),
            context_blocks=[],
        )

    return {"ok": True, "profile": "vcvo", "vcfo_weekly": vcfo_weekly, "eggs_weekly": eggs_weekly, "ai_summary": ai_summary}


class JarvisEggsWeeklyCloseRequest(BaseModel):
    principal_name: str = Field(default="Diego", min_length=1)
    reference_date: date | None = None
    include_ai_summary: bool = True
    history: list[JarvisHistoryItem] = Field(default_factory=list)


@router.post("/eggs/weekly-close")
def jarvis_eggs_weekly_close(req: JarvisEggsWeeklyCloseRequest) -> dict[str, Any]:
    ref = req.reference_date or date.today()
    skill = get_skill("eggs")
    if not skill:
        return {"ok": False, "reason": "skill_eggs_not_registered"}

    try:
        with connect() as conn:
            close_result = skill.weekly_close(conn=conn, reference_date=ref)
    except DatabaseNotConfiguredError:
        close_result = skill.weekly_close(conn=None, reference_date=ref)
    except Exception:
        close_result = skill.weekly_close(conn=None, reference_date=ref)

    ai_summary: str | None = None
    if req.include_ai_summary:
        checklist = close_result.get("checklist") or []
        checklist_lines = "; ".join(
            f"{item.get('title')}: {item.get('status')} ({item.get('detail')})" for item in checklist
        )
        prompt = (
            "Use o fechamento operacional e entregue um resumo executivo curto. "
            "Destaque bloqueios e o proximo passo objetivo.\n"
            f"Checklist: {checklist_lines}"
        )
        ai_summary = agent_service.get_jarvis_eggs_response(
            principal_name=req.principal_name,
            user_message=prompt,
            history=_to_history(req.history),
            context_blocks=[],
        )

    return {"ok": True, "profile": "eggs", "weekly_close": close_result, "ai_summary": ai_summary}


@router.post("/vceo/weekly-close")
def jarvis_vceo_weekly_close(req: JarvisEggsWeeklyCloseRequest) -> dict[str, Any]:
    result = jarvis_eggs_weekly_close(req)
    result["profile"] = "vceo"
    return result


class JarvisCommandRequest(BaseModel):
    demand: str = Field(min_length=1)
    title: str | None = None
    priority: Literal["p0", "p1", "p2", "p3"] = "p2"
    owner: str | None = None
    team: str | None = None
    source: str = Field(default="diego", min_length=1)
    acceptance_criteria: str | None = None
    due_date: date | None = None
    metadata: dict[str, Any] | None = None


class UpdateMissionRequest(BaseModel):
    status: Literal["planned", "in_progress", "blocked", "done", "canceled"] | None = None
    priority: Literal["p0", "p1", "p2", "p3"] | None = None
    owner: str | None = None
    team: str | None = None
    acceptance_criteria: str | None = None
    due_date: date | None = None
    note: str | None = None
    note_kind: Literal["note", "delivery", "risk", "blocker"] = "note"
    note_created_by: str = "jarvis"


class CreateMissionUpdateRequest(BaseModel):
    kind: Literal["note", "delivery", "risk", "blocker"] = "note"
    message: str = Field(min_length=1)
    created_by: str = Field(default="jarvis", min_length=1)


def _mission_title_from_demand(demand: str) -> str:
    first_line = demand.strip().splitlines()[0].strip()
    if len(first_line) <= 72:
        return first_line
    return f"{first_line[:69].rstrip()}..."


@router.post("/command")
def jarvis_command(req: JarvisCommandRequest) -> dict[str, Any]:
    mission_title = (req.title or "").strip() or _mission_title_from_demand(req.demand)
    try:
        with connect() as conn:
            mission_id = jarvis_ops_repo.create_mission(
                conn,
                title=mission_title,
                demand=req.demand,
                status="planned",
                priority=req.priority,
                owner=req.owner,
                team=req.team,
                source=req.source,
                acceptance_criteria=req.acceptance_criteria,
                due_date=req.due_date,
                metadata=req.metadata,
            )
            conn.commit()
            return {"ok": True, "mission_id": mission_id, "title": mission_title}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/missions")
def list_missions(
    limit: int = Query(default=100, ge=1, le=500),
    status: Literal["planned", "in_progress", "blocked", "done", "canceled"] | None = None,
    priority: Literal["p0", "p1", "p2", "p3"] | None = None,
    owner: str | None = None,
    team: str | None = None,
) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = jarvis_ops_repo.list_missions(
                conn,
                limit=limit,
                status=status,
                priority=priority,
                owner=owner,
                team=team,
            )
            return {"ok": True, "items": [r.__dict__ for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.patch("/missions/{mission_id}")
def update_mission(mission_id: str, req: UpdateMissionRequest) -> dict[str, Any]:
    update_payload_present = any(
        [
            req.status is not None,
            req.priority is not None,
            req.owner is not None,
            req.team is not None,
            req.acceptance_criteria is not None,
            req.due_date is not None,
            bool(req.note and req.note.strip()),
        ]
    )
    if not update_payload_present:
        raise HTTPException(status_code=400, detail="empty_update")

    try:
        with connect() as conn:
            mission = jarvis_ops_repo.get_mission(conn, mission_id=mission_id)
            if not mission:
                raise HTTPException(status_code=404, detail="mission_not_found")

            # Evita "entrega fake": para concluir missão, exige critério de aceite e update tipo delivery.
            if req.status == "done":
                if not (req.note and req.note.strip() and req.note_kind == "delivery"):
                    raise HTTPException(status_code=400, detail="done_requires_delivery_note")
                effective_acceptance = (req.acceptance_criteria or mission.acceptance_criteria or "").strip()
                if not effective_acceptance:
                    raise HTTPException(status_code=400, detail="done_requires_acceptance_criteria")

            ok = jarvis_ops_repo.update_mission(
                conn,
                mission_id=mission_id,
                status=req.status,
                priority=req.priority,
                owner=req.owner,
                team=req.team,
                acceptance_criteria=req.acceptance_criteria,
                due_date=req.due_date,
            )
            if not ok:
                raise HTTPException(status_code=404, detail="mission_not_found")

            update_id: str | None = None
            if req.note and req.note.strip():
                update_id = jarvis_ops_repo.create_mission_update(
                    conn,
                    mission_id=mission_id,
                    kind=req.note_kind,
                    message=req.note.strip(),
                    created_by=req.note_created_by,
                )

            conn.commit()
            return {"ok": True, "update_id": update_id}
    except HTTPException:
        raise
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.post("/missions/{mission_id}/updates")
def create_mission_update(mission_id: str, req: CreateMissionUpdateRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            update_id = jarvis_ops_repo.create_mission_update(
                conn,
                mission_id=mission_id,
                kind=req.kind,
                message=req.message,
                created_by=req.created_by,
            )
            if not update_id:
                raise HTTPException(status_code=404, detail="mission_not_found")
            conn.commit()
            return {"ok": True, "id": update_id}
    except HTTPException:
        raise
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/missions/{mission_id}/updates")
def list_mission_updates(mission_id: str, limit: int = Query(default=50, ge=1, le=500)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = jarvis_ops_repo.list_mission_updates(conn, mission_id=mission_id, limit=limit)
            return {"ok": True, "items": [r.__dict__ for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.get("/news/deliveries")
def list_delivery_news(limit: int = Query(default=20, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = jarvis_ops_repo.list_delivery_news(conn, limit=limit)
            return {"ok": True, "items": [r.__dict__ for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.get("/brief/executive-daily")
def executive_daily_brief(
    limit: int = Query(default=5, ge=1, le=20),
    principal_name: str = Query(default="Diego", min_length=1),
    include_ai: bool = Query(default=True),
) -> dict[str, Any]:
    try:
        with connect() as conn:
            snapshot = jarvis_ops_repo.mission_snapshot(conn)
            blocked = jarvis_ops_repo.list_missions(conn, limit=limit, status="blocked")
            critical_in_progress = jarvis_ops_repo.list_missions(conn, limit=limit, status="in_progress", priority="p0")
            critical_planned = jarvis_ops_repo.list_missions(conn, limit=limit, status="planned", priority="p0")
            delivery_news = jarvis_ops_repo.list_delivery_news(conn, limit=limit)
        return build_executive_daily_brief(
            principal_name=principal_name,
            reference_date=date.today(),
            snapshot=snapshot,
            blocked=[b.__dict__ for b in blocked],
            critical_in_progress=[m.__dict__ for m in critical_in_progress],
            critical_planned=[m.__dict__ for m in critical_planned],
            delivery_news=[d.__dict__ for d in delivery_news],
            include_ai=include_ai,
        )
    except DatabaseNotConfiguredError:
        return build_executive_daily_brief(
            principal_name=principal_name,
            reference_date=date.today(),
            snapshot=None,
            blocked=[],
            critical_in_progress=[],
            critical_planned=[],
            delivery_news=[],
            reason="database_not_configured",
            include_ai=include_ai,
        )
    except Exception:
        return build_executive_daily_brief(
            principal_name=principal_name,
            reference_date=date.today(),
            snapshot=None,
            blocked=[],
            critical_in_progress=[],
            critical_planned=[],
            delivery_news=[],
            reason="database_unavailable",
            include_ai=include_ai,
        )


@router.get("/brief/daily")
def daily_brief(limit: int = Query(default=5, ge=1, le=20)) -> dict[str, Any]:
    try:
        with connect() as conn:
            snapshot = jarvis_ops_repo.mission_snapshot(conn)
            blocked = jarvis_ops_repo.list_missions(conn, limit=limit, status="blocked")
            critical_in_progress = jarvis_ops_repo.list_missions(conn, limit=limit, status="in_progress", priority="p0")
            critical_planned = jarvis_ops_repo.list_missions(conn, limit=limit, status="planned", priority="p0")
            return {
                "ok": True,
                "snapshot": snapshot,
                "blocked": [b.__dict__ for b in blocked],
                "critical_in_progress": [m.__dict__ for m in critical_in_progress],
                "critical_planned": [m.__dict__ for m in critical_planned],
            }
    except DatabaseNotConfiguredError:
        return {"ok": True, "snapshot": None, "blocked": [], "critical_in_progress": [], "critical_planned": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "snapshot": None, "blocked": [], "critical_in_progress": [], "critical_planned": [], "reason": "database_unavailable"}
