from __future__ import annotations

import json
import os
import re
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def fetch_brief() -> dict:
    base_url = _env("RUPTUR_API_BASE_URL", "https://api.ruptur.cloud").rstrip("/")
    token = _env("RUPTUR_JARVIS_ADMIN_TOKEN")
    principal = _env("RUPTUR_JARVIS_PRINCIPAL_NAME", "Diego")
    limit = _env("RUPTUR_JARVIS_DAILY_LIMIT", "5") or "5"
    query = urllib.parse.urlencode({"principal_name": principal, "limit": limit, "include_ai": "true"})
    url = f"{base_url}/jarvis/brief/executive-daily?{query}"
    req = urllib.request.Request(url, headers={"x-jarvis-token": token})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def render_markdown(payload: dict) -> str:
    snapshot = payload.get("snapshot") or {}
    status_summary = ((payload.get("duo") or {}).get("status") or {}).get("summary") or "Status indisponivel."
    jarvis_summary = ((payload.get("duo") or {}).get("jarvis") or {}).get("summary") or "Jarvis indisponivel."
    reference_date = payload.get("reference_date") or date.today().isoformat()
    blocked = payload.get("blocked") or []
    blocked_lines = "\n".join(f"- {item.get('title') or 'Missao sem titulo'}" for item in blocked[:5]) or "- nenhum bloqueio critico listado"
    return textwrap.dedent(
        f"""
        # Daily Executivo — {reference_date}

        ## Snapshot
        - planned: {snapshot.get('planned_count', 0)}
        - in_progress: {snapshot.get('in_progress_count', 0)}
        - blocked: {snapshot.get('blocked_count', 0)}
        - done: {snapshot.get('done_count', 0)}
        - overdue_open: {snapshot.get('overdue_open_count', 0)}
        - reason: {payload.get('reason', 'database_ok')}

        ## Status
        {status_summary}

        ## Jarvis
        {jarvis_summary}

        ## Bloqueios em foco
        {blocked_lines}
        """
    ).strip()


def write_step_summary(markdown: str) -> None:
    summary_path = _env("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    with open(summary_path, "a", encoding="utf-8") as handle:
        handle.write(markdown)
        handle.write("\n")


def persist_local_copy(markdown: str) -> str | None:
    output_dir = _env("JARVIS_DAILY_OUTPUT_DIR")
    if not output_dir:
        return None
    path = Path(output_dir).expanduser()
    path.mkdir(parents=True, exist_ok=True)
    target = path / f"daily-executive-{date.today().isoformat()}.md"
    target.write_text(markdown + "\n", encoding="utf-8")
    return str(target)


def _telegram_api_json(bot_token: str, method: str, payload: dict[str, str] | None = None) -> dict:
    endpoint = f"https://api.telegram.org/bot{bot_token}/{method}"
    data = None
    headers: dict[str, str] = {}
    if payload:
        data = urllib.parse.urlencode(payload).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(endpoint, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _telegram_bot_username(bot_token: str) -> str | None:
    try:
        payload = _telegram_api_json(bot_token, "getMe")
    except Exception:
        return None
    result = payload.get("result") or {}
    username = (result.get("username") or "").strip()
    return username or None


def _discover_private_chat_ids(bot_token: str) -> list[str]:
    try:
        payload = _telegram_api_json(bot_token, "getUpdates")
    except Exception:
        return []

    chat_ids: list[str] = []
    seen: set[str] = set()
    for item in reversed(payload.get("result") or []):
        message = item.get("message") or item.get("edited_message") or item.get("channel_post") or {}
        chat = message.get("chat") or {}
        chat_type = (chat.get("type") or "").strip()
        chat_id = str(chat.get("id") or "").strip()
        if chat_type != "private" or not chat_id or chat_id in seen:
            continue
        seen.add(chat_id)
        chat_ids.append(chat_id)
    return list(reversed(chat_ids))


def _resolve_telegram_chat_ids(bot_token: str) -> tuple[list[str], list[str]]:
    raw_targets = [item.strip() for item in _env("TELEGRAM_ALLOWED_USER_IDS").split(",") if item.strip()]
    numeric_targets = [item for item in raw_targets if re.fullmatch(r"-?\d+", item)]
    warnings: list[str] = []

    if numeric_targets:
        return numeric_targets, warnings

    if raw_targets:
        username = _telegram_bot_username(bot_token) or "bot"
        warnings.append(
            "telegram:destino_nao_numerico:"
            + ",".join(raw_targets)
            + f":env precisa de chat_id numerico; envie /start para @{username} para auto-descoberta"
        )

    discovered = _discover_private_chat_ids(bot_token)
    if discovered:
        return discovered, warnings

    if not raw_targets:
        username = _telegram_bot_username(bot_token) or "bot"
        warnings.append(f"telegram:sem_destino:env vazio; envie /start para @{username} para registrar o chat privado")

    return [], warnings


def send_telegram(markdown: str) -> list[str]:
    bot_token = _env("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return []

    user_ids, warnings = _resolve_telegram_chat_ids(bot_token)
    if not user_ids:
        return warnings

    for chat_id in user_ids:
        try:
            _telegram_api_json(
                bot_token,
                "sendMessage",
                {
                    "chat_id": chat_id,
                    "text": markdown[:3900],
                    "disable_web_page_preview": "true",
                },
            )
        except Exception as exc:  # pragma: no cover - depende de credencial/canal real
            warnings.append(f"telegram:{chat_id}:{exc}")
    return warnings


def main() -> int:
    try:
        payload = fetch_brief()
        markdown = render_markdown(payload)
        print(markdown)
        write_step_summary(markdown)
        local_copy = persist_local_copy(markdown)
        warnings = send_telegram(markdown)
        if local_copy:
            print(f"\n[info] copia_local={local_copy}", file=sys.stderr)
        for warning in warnings:
            print(f"[warn] {warning}", file=sys.stderr)
        return 0
    except urllib.error.HTTPError as exc:
        print(f"ERRO HTTP ao buscar daily executiva: {exc.code}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"ERRO ao gerar/enviar daily executiva: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
