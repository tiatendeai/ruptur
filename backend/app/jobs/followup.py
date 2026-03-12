from __future__ import annotations

import argparse
from datetime import timedelta

from app.clients.uazapi import UazapiClient
from app.db import DatabaseNotConfiguredError, connect
from app.settings import settings


DEFAULT_TEXT = "Oi! Só passando pra ver se você conseguiu avançar. Quer que eu te ajude com o próximo passo?"


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Ruptur: follow-up simples (Sprint 2)")
    p.add_argument("--hours", type=int, default=24, help="Horas sem resposta para disparar follow-up")
    p.add_argument("--limit", type=int, default=50, help="Limite de conversas")
    p.add_argument("--send", action="store_true", help="Enviar mensagem via uazapi (requer config)")
    p.add_argument("--text", type=str, default=DEFAULT_TEXT, help="Texto do follow-up")
    return p


def main() -> None:
    args = build_parser().parse_args()

    try:
        with connect() as conn:
            rows = conn.execute(
                """
                WITH last_in AS (
                  SELECT
                    m.conversation_id,
                    max(m.created_at) AS last_in_at
                  FROM messages m
                  WHERE m.direction = 'in'
                  GROUP BY m.conversation_id
                ),
                last_out AS (
                  SELECT
                    m.conversation_id,
                    max(m.created_at) AS last_out_at
                  FROM messages m
                  WHERE m.direction = 'out'
                  GROUP BY m.conversation_id
                )
                SELECT
                  c.external_id AS chatid,
                  l.id::text AS lead_id,
                  l.status,
                  li.last_in_at,
                  lo.last_out_at
                FROM conversations c
                JOIN leads l ON l.id = c.lead_id
                JOIN last_in li ON li.conversation_id = c.id
                LEFT JOIN last_out lo ON lo.conversation_id = c.id
                WHERE
                  li.last_in_at < (now() - (%s || ' hours')::interval)
                  AND (lo.last_out_at IS NULL OR lo.last_out_at < li.last_in_at)
                  AND l.status IN ('contato', 'qualificado')
                ORDER BY li.last_in_at ASC
                LIMIT %s
                """,
                (args.hours, args.limit),
            ).fetchall()

            if not rows:
                print("No follow-ups due.")
                return

            print(f"Follow-ups due: {len(rows)}")
            for chatid, lead_id, status, last_in_at, last_out_at in rows:
                print(f"- chatid={chatid} lead_id={lead_id} status={status} last_in={last_in_at} last_out={last_out_at}")

                if not args.send:
                    continue

                if not settings.uazapi_base_url or not settings.uazapi_token:
                    raise SystemExit("Missing RUPTUR_UAZAPI_BASE_URL / RUPTUR_UAZAPI_TOKEN for --send")

                client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
                client.send_text(number=chatid, text=args.text)

    except DatabaseNotConfiguredError:
        raise SystemExit("Missing RUPTUR_DATABASE_URL")


if __name__ == "__main__":
    main()

