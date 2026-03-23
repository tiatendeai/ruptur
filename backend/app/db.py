import base64
import json
from contextlib import contextmanager
from typing import Iterator

import psycopg

from app.settings import settings


class DatabaseNotConfiguredError(RuntimeError):
    pass


def require_database_url() -> str:
    if not settings.database_url:
        raise DatabaseNotConfiguredError("RUPTUR_DATABASE_URL não configurado.")
    return settings.database_url


def _decode_jwt_payload(token: str) -> dict:
    token = token.removeprefix("Bearer").strip()
    if not token or "." not in token:
        return {}
    try:
        payload_b64 = token.split(".")[1]
        padded = payload_b64 + "=" * (4 - len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(padded))
    except Exception:
        return {}


@contextmanager
def connect(token: str | None = None) -> Iterator[psycopg.Connection]:
    database_url = require_database_url()
    with psycopg.connect(database_url) as conn:
        if token:
            claims = _decode_jwt_payload(token)
            if claims:
                # Injeta os claims do JWT para o Supabase RLS validar auth.uid()
                conn.execute("SET LOCAL role = 'authenticated';")
                conn.execute("SELECT set_config('request.jwt.claims', %s, true);", (json.dumps(claims),))
        yield conn

