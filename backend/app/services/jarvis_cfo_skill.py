from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from psycopg import Connection

from app.repositories import cfo_repo
from app.services.jarvis_skill_runtime import SkillContext, register_skill


def _brl(cents: int) -> str:
    return f"R${(cents or 0) / 100:.2f}"


@dataclass(frozen=True)
class CFOJarvisSkill:
    key: str = "cfo"

    def _collect_snapshot(self, conn: Connection) -> dict[str, Any]:
        paid = conn.execute(
            "SELECT COUNT(*)::int, COALESCE(SUM(amount_cents), 0)::bigint FROM billing_checkouts WHERE status='paid'"
        ).fetchone()
        active = conn.execute(
            "SELECT COUNT(*)::int, COALESCE(SUM(amount_cents), 0)::bigint FROM billing_checkouts WHERE status='active'"
        ).fetchone()
        due_pay = conn.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE status='open' AND due_date < current_date)::int AS overdue_count,
              COALESCE(SUM(amount_cents) FILTER (WHERE status='open' AND due_date < current_date), 0)::bigint AS overdue_cents,
              COUNT(*) FILTER (WHERE status='open' AND due_date <= current_date + 7)::int AS next7_count,
              COALESCE(SUM(amount_cents) FILTER (WHERE status='open' AND due_date <= current_date + 7), 0)::bigint AS next7_cents
            FROM cfo_payables
            """
        ).fetchone()
        due_rec = conn.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE status='open' AND due_date < current_date)::int AS overdue_count,
              COALESCE(SUM(amount_cents) FILTER (WHERE status='open' AND due_date < current_date), 0)::bigint AS overdue_cents,
              COUNT(*) FILTER (WHERE status='open' AND due_date <= current_date + 7)::int AS next7_count,
              COALESCE(SUM(amount_cents) FILTER (WHERE status='open' AND due_date <= current_date + 7), 0)::bigint AS next7_cents
            FROM cfo_receivables
            """
        ).fetchone()
        projects = conn.execute("SELECT COUNT(*)::int FROM cfo_projects WHERE status='active'").fetchone()
        clients = conn.execute("SELECT COUNT(*)::int FROM cfo_clients WHERE active=true").fetchone()
        domains = conn.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE status='active')::int,
              COUNT(*) FILTER (WHERE status='active' AND renews_on IS NOT NULL AND renews_on <= current_date + 30)::int
            FROM cfo_domains
            """
        ).fetchone()

        pay_next7_cents = int((due_pay or (0, 0, 0, 0))[3] or 0)
        rec_next7_cents = int((due_rec or (0, 0, 0, 0))[3] or 0)
        net_next7 = rec_next7_cents - pay_next7_cents

        return {
            "billing_paid_count": int((paid or (0, 0))[0] or 0),
            "billing_paid_amount_cents": int((paid or (0, 0))[1] or 0),
            "billing_active_count": int((active or (0, 0))[0] or 0),
            "billing_active_amount_cents": int((active or (0, 0))[1] or 0),
            "payables_overdue_count": int((due_pay or (0, 0, 0, 0))[0] or 0),
            "payables_overdue_cents": int((due_pay or (0, 0, 0, 0))[1] or 0),
            "payables_next7_count": int((due_pay or (0, 0, 0, 0))[2] or 0),
            "payables_next7_cents": pay_next7_cents,
            "receivables_overdue_count": int((due_rec or (0, 0, 0, 0))[0] or 0),
            "receivables_overdue_cents": int((due_rec or (0, 0, 0, 0))[1] or 0),
            "receivables_next7_count": int((due_rec or (0, 0, 0, 0))[2] or 0),
            "receivables_next7_cents": rec_next7_cents,
            "net_projection_next7_cents": net_next7,
            "active_projects_count": int((projects or (0,))[0] or 0),
            "active_clients_count": int((clients or (0,))[0] or 0),
            "active_domains_count": int((domains or (0, 0))[0] or 0),
            "domains_renew_30d_count": int((domains or (0, 0))[1] or 0),
        }

    def build_context(self, *, conn: Connection | None) -> SkillContext:
        if conn is None:
            return SkillContext(snapshot=None, context_blocks=[])
        try:
            snapshot = self._collect_snapshot(conn)
            top_projects = cfo_repo.project_margin_last_days(conn, days=30, limit=5)

            top_summary = ", ".join(
                f"{p['project_name']}={_brl(p['net_cents'])}" for p in top_projects if p.get("project_name")
            )
            if not top_summary:
                top_summary = "sem dados de margem por projeto no periodo."

            context = (
                "Contexto CFO atual: "
                f"pagamentos pendentes vencidos={snapshot['payables_overdue_count']} ({_brl(snapshot['payables_overdue_cents'])}), "
                f"recebimentos vencidos={snapshot['receivables_overdue_count']} ({_brl(snapshot['receivables_overdue_cents'])}), "
                f"projecao 7 dias={_brl(snapshot['net_projection_next7_cents'])}, "
                f"dominios a renovar em 30 dias={snapshot['domains_renew_30d_count']}, "
                f"projetos ativos={snapshot['active_projects_count']}, clientes ativos={snapshot['active_clients_count']}."
            )
            margin_context = f"Margem liquida por projeto (ultimos 30 dias): {top_summary}"
            return SkillContext(snapshot=snapshot, context_blocks=[context, margin_context])
        except Exception:
            return SkillContext(snapshot=None, context_blocks=[])

    def weekly_close(self, *, conn: Connection | None, reference_date: date) -> dict[str, Any]:
        week_start = reference_date - timedelta(days=reference_date.weekday())
        week_end = week_start + timedelta(days=6)

        if conn is None:
            checklist = [
                {"key": "env", "title": "Banco nao configurado", "status": "blocked", "detail": "Definir RUPTUR_DATABASE_URL para fechamento semanal."}
            ]
            return {"reference_date": reference_date.isoformat(), "week_start": week_start.isoformat(), "week_end": week_end.isoformat(), "checklist": checklist, "summary": {"blocked": True}}

        snapshot = self._collect_snapshot(conn)
        checklist: list[dict[str, Any]] = []

        checklist.append(
            {
                "key": "payables_overdue",
                "title": "Quitar ou renegociar contas vencidas",
                "status": "pending" if snapshot["payables_overdue_count"] > 0 else "done",
                "detail": f"{snapshot['payables_overdue_count']} titulos em atraso ({_brl(snapshot['payables_overdue_cents'])}).",
            }
        )
        checklist.append(
            {
                "key": "receivables_overdue",
                "title": "Cobrar recebiveis vencidos",
                "status": "pending" if snapshot["receivables_overdue_count"] > 0 else "done",
                "detail": f"{snapshot['receivables_overdue_count']} titulos vencidos ({_brl(snapshot['receivables_overdue_cents'])}).",
            }
        )
        checklist.append(
            {
                "key": "cash_projection_next7",
                "title": "Validar projecao de caixa de 7 dias",
                "status": "pending" if snapshot["net_projection_next7_cents"] < 0 else "done",
                "detail": f"Projecao liquida: {_brl(snapshot['net_projection_next7_cents'])}.",
            }
        )
        checklist.append(
            {
                "key": "domains_renewal",
                "title": "Revisar renovacoes de dominio em 30 dias",
                "status": "pending" if snapshot["domains_renew_30d_count"] > 0 else "done",
                "detail": f"{snapshot['domains_renew_30d_count']} dominio(s) perto de renovacao.",
            }
        )
        checklist.append(
            {
                "key": "project_margin_review",
                "title": "Revisar margem por projeto",
                "status": "pending",
                "detail": "Conferir projetos com margem negativa e definir correcao de preco/custo.",
            }
        )
        checklist.append(
            {
                "key": "weekly_routine",
                "title": "Fechar rotina semanal CFO",
                "status": "pending",
                "detail": f"Consolidar periodo {week_start.isoformat()} a {week_end.isoformat()} e registrar decisoes.",
            }
        )

        summary = {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "pending_items": sum(1 for i in checklist if i["status"] == "pending"),
            "done_items": sum(1 for i in checklist if i["status"] == "done"),
            "blocked_items": sum(1 for i in checklist if i["status"] == "blocked"),
            "snapshot": snapshot,
        }

        run_id: str | None = None
        try:
            run_id = cfo_repo.insert_weekly_close_run(
                conn,
                reference_date=reference_date,
                checklist=checklist,
                summary=summary,
            )
        except Exception:
            run_id = None

        return {
            "reference_date": reference_date.isoformat(),
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "checklist": checklist,
            "summary": summary,
            "run_id": run_id,
        }


cfo_skill = CFOJarvisSkill()
register_skill(cfo_skill)
