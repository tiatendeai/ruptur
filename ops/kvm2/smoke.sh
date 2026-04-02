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
    if curl -fk -sSL --max-time 10 "$url" >/dev/null; then
      echo "Smoke ok: $label"
      return 0
    fi
    echo "Aguardando $label (${i}/${attempts})..."
    sleep "$sleep_seconds"
  done

  echo "Smoke falhou: $label" >&2
  return 1
}

retry_json_ok() {
  local url="$1"
  local label="$2"
  local attempts="${3:-15}"
  local sleep_seconds="${4:-5}"

  for ((i = 1; i <= attempts; i++)); do
    local body=""
    if body="$(curl -fk -sSL --max-time 10 "$url")" && [[ "$body" == *'"ok":true'* ]]; then
      echo "Smoke ok: $label"
      return 0
    fi
    echo "Aguardando $label (${i}/${attempts})..."
    sleep "$sleep_seconds"
  done

  echo "Smoke falhou: $label" >&2
  return 1
}

retry_html_contains() {
  local url="$1"
  local label="$2"
  local needle="$3"
  local attempts="${4:-15}"
  local sleep_seconds="${5:-5}"

  for ((i = 1; i <= attempts; i++)); do
    local body=""
    if body="$(curl -fk -sSL --max-time 10 "$url")" && [[ "$body" == *"$needle"* ]]; then
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
retry_html_contains "$web_url" "WEB_LANDING" "SafeFlow"

if [[ -n "$warmup_url" ]]; then
  warmup_base="${warmup_url%/}"
  retry_html_contains "$warmup_base" "WARMUP_HTML" "Business Boost"
  retry_json_ok "${warmup_base}/api/local/health" "WARMUP_HEALTH"
fi

echo "Smoke do kvm2 finalizado com sucesso."
