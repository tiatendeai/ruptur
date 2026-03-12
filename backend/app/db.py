from __future__ import annotations

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


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    database_url = require_database_url()
    with psycopg.connect(database_url) as conn:
        yield conn

