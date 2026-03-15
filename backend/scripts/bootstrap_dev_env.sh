#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

python - <<'PY'
import fastapi
import openai
import psycopg
import pytest

print("Environment OK")
print("fastapi", fastapi.__version__)
print("openai", openai.__version__)
print("psycopg", psycopg.__version__)
print("pytest", pytest.__version__)
PY
