from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg


def main() -> int:
    database_url = os.environ.get("RUPTUR_DATABASE_URL", "").strip()
    if not database_url:
        print("Missing RUPTUR_DATABASE_URL", file=sys.stderr)
        return 2

    schema_path = Path(__file__).resolve().parents[1] / "db" / "schema.sql"
    if not schema_path.exists():
        print(f"Schema not found: {schema_path}", file=sys.stderr)
        return 3

    sql = schema_path.read_text(encoding="utf-8")
    if not sql.strip():
        print("Schema is empty", file=sys.stderr)
        return 4

    with psycopg.connect(database_url) as conn:
        conn.execute(sql)
        conn.commit()

    print(f"[OK] Applied schema: {schema_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

