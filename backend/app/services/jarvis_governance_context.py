from __future__ import annotations

from typing import Iterable

from app.services.jarvis_profiles import JarvisProfile


_KEYWORD_GROUPS: dict[str, tuple[str, ...]] = {
    "no_go": (
        "falso positivo",
        "falso negativo",
        "retrabalho",
        "não fazer",
        "nao fazer",
        "abortar",
        "bloquear",
        "guardrail",
        "risco",
    ),
    "lean": (
        "hipótese",
        "hipotese",
        "experimento",
        "mvp",
        "lean",
        "startup enxuta",
        "aprendizado validado",
        "survey",
        "entrevista",
        "discovery",
    ),
    "financial_control": (
        "variância",
        "variancia",
        "desvio",
        "budget",
        "orcado",
        "realizado",
        "unit economics",
        "controle",
        "financeiro",
        "custo",
        "roi",
        "caixa",
    ),
    "admin_ops": (
        "fila",
        "handoff",
        "sop",
        "rotina",
        "administrativo",
        "processo",
        "cadência operacional",
        "cadencia operacional",
        "gargalo",
    ),
    "finops": (
        "finops",
        "cloud cost",
        "custo de nuvem",
        "aws billing",
        "token",
        "custo de ia",
        "latência x custo",
        "latencia x custo",
    ),
}


def _text_blob(message: str, context_blocks: Iterable[str] | None) -> str:
    parts = [message]
    parts.extend(block for block in (context_blocks or []) if isinstance(block, str))
    return " \n ".join(parts).lower()


def infer_trigger_groups(message: str, context_blocks: list[str] | None = None) -> list[str]:
    blob = _text_blob(message, context_blocks)
    matches: list[str] = []
    for key, keywords in _KEYWORD_GROUPS.items():
        if any(keyword in blob for keyword in keywords):
            matches.append(key)
    return matches


def build_governance_context(
    *,
    profile: JarvisProfile,
    message: str,
    context_blocks: list[str] | None = None,
) -> list[str]:
    existing = [block.strip() for block in (context_blocks or []) if isinstance(block, str) and block.strip()]
    triggers = set(infer_trigger_groups(message, existing))
    blocks = list(existing)

    def add(block: str) -> None:
        normalized = block.strip()
        if normalized and normalized not in blocks:
            blocks.append(normalized)

    if profile in {"cfo", "vcfo", "vcvo", "eggs", "vceo", "vcontroller", "vadminops", "vfinops"}:
        add(
            "Saída obrigatória: explicite caminho recomendado, caminho não seguir, estado recomendado "
            "(seguir/bloqueado/abortado/reenquadrar), evidência faltante e condição de retomada."
        )

    if profile in {"cfo", "vcfo", "vcontroller", "vfinops"} or "financial_control" in triggers:
        add(
            "Quadro financeiro obrigatório: baseline, valor atual, variância/desvio, impacto em caixa ou custo "
            "unitário, owner responsável e próxima ação com prazo."
        )

    if profile in {"eggs", "vceo", "vadminops"} or "admin_ops" in triggers:
        add(
            "Quadro operacional obrigatório: owner, SLA, fila/handoff, gargalo principal, checkpoint e trava de "
            "anti-retrabalho."
        )

    if profile in {"vcvo"} or "lean" in triggers:
        add(
            "Use disciplina lean: hipótese, anti-hipótese, teste, métrica, limiar de sucesso e decisão "
            "pivotar/perseverar/bloquear."
        )

    if profile in {"vfinops"} or "finops" in triggers:
        add(
            "Quadro FinOps obrigatório: driver de custo, custo unitário, SLO que não pode piorar, economia esperada, "
            "risco de regressão e rollback."
        )

    if "no_go" in triggers:
        add(
            "Gate no-go obrigatório: diga o que não fazer, qual erro é mais caro (falso positivo ou falso negativo), "
            "se o correto é seguir/bloquear/abortar/reenquadrar e qual evidência falta."
        )

    return blocks
