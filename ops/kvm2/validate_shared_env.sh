#!/usr/bin/env bash
set -Eeuo pipefail

env_file="${1:-}"

if [[ -z "$env_file" ]]; then
  echo "Uso: validate_shared_env.sh <arquivo_env>" >&2
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Arquivo nao encontrado: $env_file" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

required_vars=(
  TRAEFIK_ACME_EMAIL
  NEXT_PUBLIC_RUPTUR_API_BASE_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  RUPTUR_POSTGRES_DB
  RUPTUR_POSTGRES_USER
  RUPTUR_DB_PASSWORD
  RUPTUR_BACKEND_ENV_FILE
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Variavel faltando no env compartilhado: $var_name" >&2
    exit 1
  fi
done

echo "Env compartilhado ok."
