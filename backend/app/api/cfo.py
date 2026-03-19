from __future__ import annotations

from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.security import require_jarvis_access
from app.db import DatabaseNotConfiguredError, connect
from app.repositories import cfo_repo
from app.services.jarvis_skill_runtime import get_skill

# garante registro da skill no runtime
from app.services import jarvis_cfo_skill as _jarvis_cfo_skill  # noqa: F401


# Protegido por autenticacao humana com role forte ou por token de servico do Jarvis.
router = APIRouter(prefix="/cfo", tags=["cfo"], dependencies=[Depends(require_jarvis_access)])


class CfoClient(BaseModel):
    id: str
    name: str
    segment: str | None = None
    active: bool = True
    notes: str | None = None
    created_at: str


class CreateCfoClientRequest(BaseModel):
    name: str = Field(min_length=1)
    segment: str | None = None
    active: bool = True
    notes: str | None = None


class CfoProject(BaseModel):
    id: str
    name: str
    project_type: str
    status: str
    client_id: str | None = None
    client_name: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str


class CreateCfoProjectRequest(BaseModel):
    name: str = Field(min_length=1)
    project_type: Literal["internal", "client", "product"] = "internal"
    status: Literal["active", "paused", "closed"] = "active"
    client_id: str | None = None
    notes: str | None = None


class CfoDomain(BaseModel):
    id: str
    hostname: str
    registrar: str | None = None
    annual_cost_cents: int = 0
    renews_on: str | None = None
    status: str
    project_id: str | None = None
    project_name: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str


class CreateCfoDomainRequest(BaseModel):
    hostname: str = Field(min_length=1)
    registrar: str | None = None
    annual_cost_cents: int = Field(default=0, ge=0)
    renews_on: date | None = None
    status: Literal["active", "inactive"] = "active"
    project_id: str | None = None
    notes: str | None = None


class CfoPayable(BaseModel):
    id: str
    description: str
    amount_cents: int
    due_date: str
    status: str
    category: str
    project_id: str | None = None
    project_name: str | None = None
    client_id: str | None = None
    client_name: str | None = None
    paid_at: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str


class CreateCfoPayableRequest(BaseModel):
    description: str = Field(min_length=1)
    amount_cents: int = Field(ge=0)
    due_date: date
    status: Literal["open", "paid", "canceled"] = "open"
    category: str = Field(default="operacional")
    project_id: str | None = None
    client_id: str | None = None
    notes: str | None = None


class CfoReceivable(BaseModel):
    id: str
    description: str
    amount_cents: int
    due_date: str
    status: str
    category: str
    project_id: str | None = None
    project_name: str | None = None
    client_id: str | None = None
    client_name: str | None = None
    received_at: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str


class CreateCfoReceivableRequest(BaseModel):
    description: str = Field(min_length=1)
    amount_cents: int = Field(ge=0)
    due_date: date
    status: Literal["open", "received", "lost"] = "open"
    category: str = Field(default="receita")
    project_id: str | None = None
    client_id: str | None = None
    notes: str | None = None


class UpdatePayableStatusRequest(BaseModel):
    status: Literal["open", "paid", "canceled"]


class UpdateReceivableStatusRequest(BaseModel):
    status: Literal["open", "received", "lost"]


@router.get("/overview")
def get_overview() -> dict[str, Any]:
    skill = get_skill("cfo")
    if not skill:
        return {"ok": False, "reason": "skill_cfo_not_registered"}
    try:
        with connect() as conn:
            context = skill.build_context(conn=conn)
            return {"ok": True, "snapshot": context.snapshot, "context": context.context_blocks}
    except DatabaseNotConfiguredError:
        return {"ok": True, "snapshot": None, "context": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "snapshot": None, "context": [], "reason": "database_unavailable"}


@router.get("/clients")
def list_clients(limit: int = Query(default=100, ge=1, le=500)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = cfo_repo.list_clients(conn, limit=limit)
            return {"ok": True, "items": [CfoClient(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.post("/clients")
def create_client(req: CreateCfoClientRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            client_id = cfo_repo.create_client(conn, name=req.name, segment=req.segment, active=req.active, notes=req.notes)
            conn.commit()
            return {"ok": True, "id": client_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/projects")
def list_projects(limit: int = Query(default=100, ge=1, le=500)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = cfo_repo.list_projects(conn, limit=limit)
            return {"ok": True, "items": [CfoProject(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.post("/projects")
def create_project(req: CreateCfoProjectRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            project_id = cfo_repo.create_project(
                conn,
                name=req.name,
                project_type=req.project_type,
                status=req.status,
                client_id=req.client_id,
                notes=req.notes,
            )
            conn.commit()
            return {"ok": True, "id": project_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/domains")
def list_domains(limit: int = Query(default=100, ge=1, le=500)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = cfo_repo.list_domains(conn, limit=limit)
            return {"ok": True, "items": [CfoDomain(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.post("/domains")
def create_domain(req: CreateCfoDomainRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            domain_id = cfo_repo.create_domain(
                conn,
                hostname=req.hostname,
                registrar=req.registrar,
                annual_cost_cents=req.annual_cost_cents,
                renews_on=req.renews_on,
                status=req.status,
                project_id=req.project_id,
                notes=req.notes,
            )
            conn.commit()
            return {"ok": True, "id": domain_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/payables")
def list_payables(limit: int = Query(default=100, ge=1, le=500), status: str | None = None) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = cfo_repo.list_payables(conn, limit=limit, status=status)
            return {"ok": True, "items": [CfoPayable(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.post("/payables")
def create_payable(req: CreateCfoPayableRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            payable_id = cfo_repo.create_payable(
                conn,
                description=req.description,
                amount_cents=req.amount_cents,
                due_date=req.due_date,
                status=req.status,
                category=req.category,
                project_id=req.project_id,
                client_id=req.client_id,
                notes=req.notes,
            )
            conn.commit()
            return {"ok": True, "id": payable_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.patch("/payables/{payable_id}/status")
def update_payable_status(payable_id: str, req: UpdatePayableStatusRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = cfo_repo.update_payable_status(conn, payable_id=payable_id, status=req.status)
            if not ok:
                raise HTTPException(status_code=404, detail="payable_not_found")
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.get("/receivables")
def list_receivables(limit: int = Query(default=100, ge=1, le=500), status: str | None = None) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = cfo_repo.list_receivables(conn, limit=limit, status=status)
            return {"ok": True, "items": [CfoReceivable(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "items": [], "reason": "database_unavailable"}


@router.post("/receivables")
def create_receivable(req: CreateCfoReceivableRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            receivable_id = cfo_repo.create_receivable(
                conn,
                description=req.description,
                amount_cents=req.amount_cents,
                due_date=req.due_date,
                status=req.status,
                category=req.category,
                project_id=req.project_id,
                client_id=req.client_id,
                notes=req.notes,
            )
            conn.commit()
            return {"ok": True, "id": receivable_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.patch("/receivables/{receivable_id}/status")
def update_receivable_status(receivable_id: str, req: UpdateReceivableStatusRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = cfo_repo.update_receivable_status(conn, receivable_id=receivable_id, status=req.status)
            if not ok:
                raise HTTPException(status_code=404, detail="receivable_not_found")
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
    except Exception:
        raise HTTPException(status_code=503, detail="database_unavailable")


@router.post("/weekly-close")
def weekly_close(reference_date: date | None = None) -> dict[str, Any]:
    ref = reference_date or date.today()
    skill = get_skill("cfo")
    if not skill:
        return {"ok": False, "reason": "skill_cfo_not_registered"}
    try:
        with connect() as conn:
            result = skill.weekly_close(conn=conn, reference_date=ref)
            conn.commit()
            return {"ok": True, "result": result}
    except DatabaseNotConfiguredError:
        return {"ok": True, "result": skill.weekly_close(conn=None, reference_date=ref), "reason": "database_not_configured"}
    except Exception:
        return {"ok": True, "result": skill.weekly_close(conn=None, reference_date=ref), "reason": "schema_or_query_unavailable"}
