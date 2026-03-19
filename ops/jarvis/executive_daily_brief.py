from __future__ import annotations

import json
import os
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from datetime import date


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


def send_telegram(markdown: str) -> None:
    bot_token = _env("TELEGRAM_BOT_TOKEN")
    user_ids = [item.strip() for item in _env("TELEGRAM_ALLOWED_USER_IDS").split(",") if item.strip()]
    if not bot_token or not user_ids:
        return
    endpoint = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    for chat_id in user_ids:
        payload = urllib.parse.urlencode(
            {
                "chat_id": chat_id,
                "text": markdown[:3900],
                "disable_web_page_preview": "true",
            }
        ).encode("utf-8")
        req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=30):
            pass


def main() -> int:
    try:
        payload = fetch_brief()
        markdown = render_markdown(payload)
        print(markdown)
        write_step_summary(markdown)
        send_telegram(markdown)
        return 0
    except urllib.error.HTTPError as exc:
        print(f"ERRO HTTP ao buscar daily executiva: {exc.code}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"ERRO ao gerar/enviar daily executiva: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
