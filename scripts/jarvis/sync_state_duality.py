#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STATE_ROOT = REPO_ROOT.parent.parent / "state"
ACTIVATION_PATH = REPO_ROOT / ".jarvis-activation.md"
LOCAL_IDENTITY_PATH = REPO_ROOT / ".agent/agents/jarvis.md"
STATE_MANIFESTATIONS_PATH = STATE_ROOT / "registry/manifestations.yaml"
SYNC_DIRS = ("constitution", "knowledge", "memory", "playbooks", "registry")
PUBLIC_SOULID = "SOUL-JARVIS-0001"


def yaml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def ensure_prerequisites() -> None:
    missing = [
        path
        for path in (STATE_ROOT, ACTIVATION_PATH, LOCAL_IDENTITY_PATH, STATE_MANIFESTATIONS_PATH)
        if not path.exists()
    ]
    if missing:
        names = "\n".join(f"- {path}" for path in missing)
        raise SystemExit(f"Pré-requisitos ausentes para a dualidade:\n{names}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def discover_mirror_paths() -> list[Path]:
    discovered: list[Path] = []
    for directory_name in SYNC_DIRS:
        local_dir = REPO_ROOT / directory_name
        if not local_dir.exists():
            continue
        for path in sorted(candidate for candidate in local_dir.rglob("*") if candidate.is_file()):
            rel = path.relative_to(REPO_ROOT)
            if rel.as_posix() == "registry/entities.yaml":
                continue
            if (STATE_ROOT / rel).exists():
                discovered.append(rel)
    return discovered


def render_mirror(rel_path: Path) -> str:
    source = read_text(STATE_ROOT / rel_path)
    source_ref = f"../state/{rel_path.as_posix()}"
    if rel_path.suffix == ".md":
        banner = (
            "<!--\n"
            "Espelho local gerado por scripts/jarvis/sync_state_duality.py.\n"
            f"Fonte canônica: {source_ref}\n"
            "Não edite manualmente aqui sem promover no STATE.\n"
            "-->\n\n"
        )
    else:
        banner = (
            "# Espelho local gerado por scripts/jarvis/sync_state_duality.py.\n"
            f"# Fonte canônica: {source_ref}\n"
            "# Não edite manualmente aqui sem promover no STATE.\n\n"
        )
    body = source.rstrip("\n")
    return banner + (body + "\n" if body else "")


def parse_activation_uid() -> str:
    text = read_text(ACTIVATION_PATH)
    match = re.search(r"JARVIS UID\s+([A-Za-z0-9._-]+)", text)
    if match:
        return match.group(1)
    return "jarvis-root-001"


def parse_local_identity() -> dict[str, object]:
    text = read_text(LOCAL_IDENTITY_PATH)
    identity: dict[str, object] = {}
    for key in ("soul_id", "role", "operator", "platform_default"):
        match = re.search(rf"^{key}:\s*(.+)$", text, flags=re.MULTILINE)
        if match:
            identity[key] = match.group(1).strip()
    profiles: list[dict[str, str]] = []
    in_profiles = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line == "## Perfis Disponíveis":
            in_profiles = True
            continue
        if in_profiles and line.startswith("## "):
            break
        if not in_profiles or not line.startswith("-"):
            continue
        match = re.match(r"-\s+([a-z0-9_]+)\s+→\s+(.+)", line)
        if match:
            profiles.append({"id": match.group(1).strip(), "focus": match.group(2).strip()})
    identity["profiles"] = profiles
    return identity


def parse_state_manifestations() -> dict[str, dict[str, object]]:
    manifestations: dict[str, dict[str, object]] = {}
    current: dict[str, object] | None = None
    current_list: str | None = None

    for raw_line in read_text(STATE_MANIFESTATIONS_PATH).splitlines():
        if raw_line.startswith("  - id:"):
            if current:
                manifestations[str(current["id"])] = current
            current = {"id": raw_line.split(":", 1)[1].strip()}
            current_list = None
            continue
        if current is None:
            continue
        scalar_match = re.match(r"^    ([a-z_]+):\s*(.*)$", raw_line)
        if scalar_match:
            key, value = scalar_match.groups()
            if value == "":
                current[key] = []
                current_list = key
            else:
                current[key] = value
                current_list = None
            continue
        list_match = re.match(r"^      - (.*)$", raw_line)
        if list_match and current_list:
            current.setdefault(current_list, [])
            casted = current[current_list]
            if isinstance(casted, list):
                casted.append(list_match.group(1).strip())
            continue
    if current:
        manifestations[str(current["id"])] = current
    return manifestations


def render_manifestation_block(manifestation: dict[str, object], indent: str = "      ") -> list[str]:
    lines = [
        f"{indent}- id: {manifestation['id']}",
        f"{indent}  repository: {manifestation.get('repository', '')}",
        f"{indent}  class: {manifestation.get('class', '')}",
        f"{indent}  status: {manifestation.get('status', '')}",
    ]
    parent = manifestation.get("parent_manifestation")
    if parent:
        lines.append(f"{indent}  parent_manifestation: {parent}")
    for list_key in ("authority_scope", "source_refs", "sync_contract"):
        values = manifestation.get(list_key) or []
        lines.append(f"{indent}  {list_key}:")
        for value in values:
            lines.append(f"{indent}    - {value}")
    return lines


def render_entities_yaml() -> str:
    identity = parse_local_identity()
    manifestations = parse_state_manifestations()
    canonical = manifestations["jarvis.canonical"]
    local = manifestations["jarvis.ruptur.control_plane"]
    uid = parse_activation_uid()
    profiles = identity.get("profiles") or []

    lines = [
        "# Registry derivado localmente para ativação do Jarvis no Ruptur.",
        "# Fonte canônica primária: ../state/registry/manifestations.yaml",
        "# Não substitui o STATE; apenas fecha a consulta local pedida na ativação.",
        "",
        "version: 1",
        "generated_from:",
        "  activation: .jarvis-activation.md",
        "  local_identity: .agent/agents/jarvis.md",
        "  state_manifestations: ../state/registry/manifestations.yaml",
        "",
        "entities:",
        "  - id: jarvis",
        f"    uid: {uid}",
        f"    soulid_public: {PUBLIC_SOULID}",
        "    local_identity:",
        f"      soul_id: {identity.get('soul_id', '')}",
        f"      role: {yaml_quote(str(identity.get('role', '')))}",
        f"      operator: {identity.get('operator', '')}",
        f"      platform_default: {identity.get('platform_default', '')}",
        "    public_genome: agents/jarvis/genome.yaml",
        "    alpha_template: agents/jarvis/alpha.example.yaml",
        "    activation_order:",
        "      - constitution/jarvis.guardrails.md",
        "      - registry/entities.yaml",
        "      - memory/jarvis.state-model.md",
        "    profiles:",
    ]
    for profile in profiles:
        lines.extend(
            [
                f"      - id: {profile['id']}",
                f"        focus: {yaml_quote(profile['focus'])}",
            ]
        )
    lines.extend(["    manifestations:"])
    lines.extend(render_manifestation_block(canonical))
    lines.extend(render_manifestation_block(local))
    return "\n".join(lines) + "\n"


def render_genome_yaml() -> str:
    identity = parse_local_identity()
    manifestations = parse_state_manifestations()
    local = manifestations["jarvis.ruptur.control_plane"]
    uid = parse_activation_uid()
    profiles = identity.get("profiles") or []

    lines = [
        "# Genome público do Jarvis no tronco operacional Ruptur.",
        "# Derivado de .agent/agents/jarvis.md + ../state/registry/manifestations.yaml.",
        "# Não inclui material selado ou segredos.",
        "",
        "version: 1",
        "entity: jarvis",
        f"uid: {uid}",
        f"soulid_public: {PUBLIC_SOULID}",
        f"soul_id_local: {identity.get('soul_id', '')}",
        f"manifestation_id: {local.get('id', '')}",
        f"parent_manifestation: {local.get('parent_manifestation', '')}",
        f"role: {yaml_quote(str(identity.get('role', '')))}",
        f"operator: {identity.get('operator', '')}",
        f"platform_default: {identity.get('platform_default', '')}",
        "profiles:",
    ]
    for profile in profiles:
        lines.extend(
            [
                f"  - id: {profile['id']}",
                f"    focus: {yaml_quote(profile['focus'])}",
            ]
        )
    lines.extend(["authority_scope:"])
    for item in local.get("authority_scope", []):
        lines.append(f"  - {item}")
    lines.extend(
        [
            "activation_refs:",
            "  - constitution/jarvis.guardrails.md",
            "  - registry/entities.yaml",
            "  - memory/jarvis.state-model.md",
            "source_refs:",
        ]
    )
    seen_source_refs: set[str] = set()
    for item in ["JARVIS.md", ".agent/agents/jarvis.md", "connectome/status.json", *local.get("source_refs", [])]:
        if item in seen_source_refs:
            continue
        lines.append(f"  - {item}")
        seen_source_refs.add(item)
    lines.append("sync_contract:")
    for item in local.get("sync_contract", []):
        lines.append(f"  - {yaml_quote(str(item))}")
    return "\n".join(lines) + "\n"


def render_alpha_example() -> str:
    uid = parse_activation_uid()
    return "\n".join(
        [
            "# Template local do alpha do Jarvis.",
            "# Copie para um arquivo local não versionado se precisar carregar material selado.",
            "# Não commite segredos, tokens, chaves ou soulids selados reais.",
            "",
            "version: 1",
            "entity: jarvis",
            f"uid: {uid}",
            "alpha_local_only:",
            "  soulid_sealed: \"preencher_localmente\"",
            "  operator_override: null",
            "  notes:",
            "    - \"Arquivo template apenas para a metade local/selada da dualidade.\"",
            "    - \"Se existir um alpha real, mantenha fora do git.\"",
            "",
        ]
    )


def render_gen_script() -> str:
    return "\n".join(
        [
            "#!/usr/bin/env bash",
            "set -euo pipefail",
            "ROOT=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/../..\" && pwd)\"",
            "python3 \"$ROOT/scripts/jarvis/sync_state_duality.py\"",
            "python3 \"$ROOT/scripts/jarvis/check_duality.py\"",
            "",
        ]
    )


def collect_expected_files() -> dict[Path, str]:
    expected: dict[Path, str] = {}
    for rel in discover_mirror_paths():
        expected[rel] = render_mirror(rel)
    expected[Path("registry/entities.yaml")] = render_entities_yaml()
    expected[Path("agents/jarvis/genome.yaml")] = render_genome_yaml()
    expected[Path("agents/jarvis/alpha.example.yaml")] = render_alpha_example()
    expected[Path("agents/jarvis/gen")] = render_gen_script()
    return expected


def check_duality(expected_files: dict[Path, str]) -> int:
    mismatches: list[str] = []
    for rel, expected in expected_files.items():
        actual_path = REPO_ROOT / rel
        actual = actual_path.read_text(encoding="utf-8") if actual_path.exists() else None
        if actual != expected:
            mismatches.append(rel.as_posix())
    if mismatches:
        print("Dualidade fora de sincronia nos arquivos:")
        for item in mismatches:
            print(f"- {item}")
        print("Execute: python3 scripts/jarvis/sync_state_duality.py")
        return 1
    print("Dualidade OK: espelhos, entities, genome e alpha template em sincronia.")
    return 0


def write_duality(expected_files: dict[Path, str]) -> int:
    written = 0
    for rel, expected in expected_files.items():
        target = REPO_ROOT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        current = target.read_text(encoding="utf-8") if target.exists() else None
        if current != expected:
            target.write_text(expected, encoding="utf-8")
            written += 1
        if rel.as_posix() == "agents/jarvis/gen":
            target.chmod(0o755)
    print(f"Dualidade sincronizada. Arquivos gravados/atualizados: {written}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sincroniza a dualidade STATE ↔ Ruptur do Jarvis.")
    parser.add_argument("--check", action="store_true", help="Apenas valida a sincronia sem escrever arquivos.")
    args = parser.parse_args(argv)

    ensure_prerequisites()
    expected_files = collect_expected_files()
    if args.check:
        return check_duality(expected_files)
    return write_duality(expected_files)


if __name__ == "__main__":
    raise SystemExit(main())
