#!/usr/bin/env bash
set -euo pipefail

echo "[smoke-warmup] verificando Postgres..."
docker exec kvm2-ruptur-db-1 pg_isready

echo "[smoke-warmup] verificando /api/local/health..."
curl -fsS http://127.0.0.1:8787/api/local/health

echo "[smoke-warmup] verificando /warmup (via runtime)..."
curl -fsS http://127.0.0.1:8787/warmup > /dev/null

echo "[smoke-warmup] todos os checks passaram"
