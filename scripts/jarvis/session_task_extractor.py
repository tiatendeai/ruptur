#!/usr/bin/env python3
"""
session_task_extractor.py
Automação: Captura tarefas emergentes de sessão e as registra canonicamente.

Integrações:
  - registry/backlog_governanca.yaml  (registro local canônico)
  - GitHub Projects via API (quando GH_TOKEN estiver disponível)

Uso:
  python scripts/jarvis/session_task_extractor.py \
    --titulo "Migrar Terraform para infrastructure-state" \
    --responsavel "vOps-Dev" \
    --entregavel "infrastructure-state/iac/ funcional" \
    --sessao "2026-03-24 | Auditoria da pasta infra" \
    [--project-id PVT_kwHODOO6r84BSQul]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

import yaml  # type: ignore

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKLOG_PATH = REPO_ROOT / "registry" / "backlog_governanca.yaml"

# GitHub Projects API
GH_API = "https://api.github.com/graphql"
DEFAULT_PROJECT_IDS = [
    "PVT_kwHODOO6r84BSQul",
    "PVT_kwHODOO6r84BRgVS",
]


def load_backlog() -> dict:
    return yaml.safe_load(BACKLOG_PATH.read_text(encoding="utf-8"))


def next_back_id(items: list) -> str:
    ids = [int(i["id"].split("-")[1]) for i in items if i.get("id", "").startswith("BACK-")]
    return f"BACK-{(max(ids) + 1) if ids else 1:03d}"


def add_to_backlog(titulo: str, responsavel: str, entregavel: str, sessao: str, blockers: list) -> str:
    data = load_backlog()
    items: list = data.get("backlog", [])
    new_id = next_back_id(items)
    items.append({
        "id": new_id,
        "titulo": titulo,
        "status": "pending",
        "responsavel": responsavel,
        "entregavel": entregavel,
        "data": None,
        "blockers": blockers,
        "origem_sessao": sessao,
    })
    data["backlog"] = items
    BACKLOG_PATH.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(f"✅  Tarefa registrada localmente: {new_id} — {titulo}")
    return new_id


def gh_create_project_item(title: str, project_id: str, token: str) -> None:
    """Cria um item rascunho no GitHub Projects v2 via GraphQL."""
    mutation = """
    mutation($projectId: ID!, $title: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title}) {
        projectItem { id }
      }
    }"""
    payload = json.dumps({"query": mutation, "variables": {"projectId": project_id, "title": title}})
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", GH_API,
         "-H", f"Authorization: bearer {token}",
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True, check=True,
    )
    resp = json.loads(result.stdout)
    if "errors" in resp:
        print(f"⚠️  GitHub Projects error: {resp['errors']}", file=sys.stderr)
    else:
        print(f"✅  Item criado no GitHub Projects ({project_id}).")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Registra tarefas emergentes de sessão no backlog e GitHub Projects.")
    parser.add_argument("--titulo", required=True, help="Título da tarefa.")
    parser.add_argument("--responsavel", default="J.A.R.V.I.S.", help="Agente responsável.")
    parser.add_argument("--entregavel", default="", help="O que será entregue.")
    parser.add_argument("--sessao", default=str(date.today()), help="Descrição da sessão de origem.")
    parser.add_argument("--blocker", action="append", default=[], dest="blockers")
    parser.add_argument("--project-id", action="append", dest="project_ids",
                        default=None, help="GitHub Project ID (pode repetir). Padrão: projetos ativos do connectome.")
    args = parser.parse_args(argv)

    # Registro local canônico
    task_id = add_to_backlog(
        titulo=args.titulo,
        responsavel=args.responsavel,
        entregavel=args.entregavel,
        sessao=args.sessao,
        blockers=args.blockers,
    )

    # Registro GitHub Projects (só se GH_TOKEN disponível)
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not token:
        print("ℹ️  GH_TOKEN não encontrado. Pulando registro no GitHub Projects.")
        return 0

    project_ids = args.project_ids or DEFAULT_PROJECT_IDS
    full_title = f"[{task_id}] {args.titulo}"
    for pid in project_ids:
        try:
            gh_create_project_item(full_title, pid, token)
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  Falha ao criar item no projeto {pid}: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
