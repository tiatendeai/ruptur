#!/usr/bin/env bash
set -Eeuo pipefail

api_url="${1:-}"
web_url="${2:-}"
warmup_url="${3:-}"

if [[ -z "$api_url" || -z "$web_url" ]]; then
  echo "Uso: smoke.sh <api_health_url> <web_url> [warmup_url]" >&2
  exit 1
fi

retry_curl() {
  local url="$1"
  local label="$2"
  local attempts="${3:-15}"
  local sleep_seconds="${4:-5}"

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS --max-time 10 "$url" >/dev/null; then
      echo "Smoke ok: $label"
      return 0
    fi
    echo "Aguardando $label (${i}/${attempts})..."
    sleep "$sleep_seconds"
  done

  echo "Smoke falhou: $label" >&2
  return 1
}

retry_curl "$api_url" "API"
retry_curl "$web_url" "WEB"

if [[ -n "$warmup_url" ]]; then
  retry_curl "$warmup_url" "WARMUP"
fi

echo "Smoke do kvm2 finalizado com sucesso."
