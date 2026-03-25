#!/usr/bin/env python3
"""
backlog_gate.py — Quality Gate do Backlog Ruptur

Responsabilidade:
  Valida se um item de backlog possui os 5 campos obrigatórios antes de
  permitir inserção no yaml canônico. Itens incompletos são marcados
  como `draft` e NÃO são enviados ao GitHub Projects.

Uso como script:
  python scripts/jarvis/backlog_gate.py \
    --titulo "Migrar Terraform para infrastructure-state" \
    --responsavel "vOps-Dev" \
    --entregavel "infrastructure-state/iac/ com Terraform funcional" \
    --criterio-aceite "PR merged + pipeline CI verde + README atualizado" \
    --sessao "2026-03-24 | Auditoria infra"

Uso como pre-commit hook (chame via .git/hooks/pre-commit):
  python scripts/jarvis/backlog_gate.py --validate-file registry/backlog_governanca.yaml
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml  # type: ignore

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKLOG_PATH = REPO_ROOT / "registry" / "backlog_governanca.yaml"

REQUIRED_FIELDS = ["titulo", "entregavel", "responsavel", "criterio_de_aceite", "origem_sessao"]
TITULO_PATTERN = re.compile(r"^[A-Za-zÀ-ú][A-Za-zÀ-ú0-9 \-_/():]+$")


def _check_item(item: dict) -> list[str]:
    """Retorna lista de erros para um item do backlog."""
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if not item.get(field):
            errors.append(f"Campo obrigatório ausente ou vazio: `{field}`")
    titulo = item.get("titulo", "")
    if titulo and len(titulo) < 10:
        errors.append("titulo muito curto (mínimo 10 caracteres)")
    criterio = item.get("criterio_de_aceite", "")
    if criterio and len(criterio) < 15:
        errors.append("criterio_de_aceite muito vago (mínimo 15 caracteres)")
    return errors


def validate_file(path: Path) -> int:
    """Valida todos os itens do backlog_governanca.yaml. Retorna 0 se ok, 1 se há falhas."""
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    items = data.get("backlog", [])
    failed = False
    for item in items:
        if item.get("status") == "draft":
            continue  # drafts são permitidos explicitamente
        errors = _check_item(item)
        if errors:
            print(f"❌ [{item.get('id', '??')}] {item.get('titulo', '')}")
            for e in errors:
                print(f"   • {e}")
            failed = True
    if not failed:
        print("✅ Todos os itens do backlog passaram no quality gate.")
    return 1 if failed else 0


def build_item_interactively(args: argparse.Namespace) -> dict:
    """Monta o dict do item a partir dos argumentos CLI."""
    errors = []
    fields = {
        "titulo": args.titulo,
        "responsavel": args.responsavel,
        "entregavel": args.entregavel,
        "criterio_de_aceite": args.criterio_aceite,
        "origem_sessao": args.sessao,
    }
    for f, v in fields.items():
        if not v:
            errors.append(f)
    if errors:
        print("❌ Quality gate FALHOU. Campos obrigatórios ausentes:\n  • " + "\n  • ".join(errors))
        print("\nDica: use --help para ver todos os argumentos necessários.")
        print("Item salvo como DRAFT. NÃO será enviado ao GitHub Projects.")
        return {**fields, "status": "draft"}
    return {**fields, "status": "pending"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Quality Gate do Backlog Ruptur. Valida e registra itens no backlog_governanca.yaml."
    )
    subparsers = parser.add_subparsers(dest="cmd")

    # Modo: validar arquivo existente (pre-commit hook)
    val_parser = subparsers.add_parser("validate", help="Valida todos os itens do yaml.")
    val_parser.add_argument("--file", default=str(BACKLOG_PATH))

    # Modo: adicionar novo item
    add_parser = subparsers.add_parser("add", help="Adiciona um novo item ao backlog com validação.")
    add_parser.add_argument("--titulo", required=True)
    add_parser.add_argument("--responsavel", required=True)
    add_parser.add_argument("--entregavel", required=True)
    add_parser.add_argument("--criterio-aceite", dest="criterio_aceite", required=True)
    add_parser.add_argument("--sessao", required=True)
    add_parser.add_argument("--blocker", action="append", default=[], dest="blockers")

    args = parser.parse_args(argv)

    if args.cmd == "validate":
        return validate_file(Path(args.file))

    if args.cmd == "add":
        item = build_item_interactively(args)
        # Carrega o yaml, insere, salva
        data = yaml.safe_load(BACKLOG_PATH.read_text(encoding="utf-8"))
        items = data.get("backlog", [])
        ids = [int(i["id"].split("-")[1]) for i in items if i.get("id", "").startswith("BACK-")]
        new_id = f"BACK-{(max(ids) + 1) if ids else 1:03d}"
        item["id"] = new_id
        item["data"] = None
        item["blockers"] = args.blockers if hasattr(args, "blockers") else []
        items.append(item)
        data["backlog"] = items
        BACKLOG_PATH.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
        status_icon = "✅" if item["status"] == "pending" else "⚠️ DRAFT"
        print(f"{status_icon} [{new_id}] {item['titulo']} — status: {item['status']}")
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
