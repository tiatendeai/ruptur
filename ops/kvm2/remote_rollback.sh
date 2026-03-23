#!/usr/bin/env bash
set -Eeuo pipefail

app_root=""
release_id=""
shared_env_file=""
profiles=""

while (($#)); do
  case "$1" in
    --app-root)
      app_root="$2"
      shift 2
      ;;
    --release-id)
      release_id="$2"
      shift 2
      ;;
    --shared-env-file)
      shared_env_file="$2"
      shift 2
      ;;
    --profiles)
      profiles="$2"
      shift 2
      ;;
    *)
      echo "Parametro nao suportado: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$app_root" || -z "$shared_env_file" ]]; then
  echo "Uso: remote_rollback.sh --app-root <dir> --shared-env-file <file> [--release-id <id>] [--profiles <lista>]" >&2
  exit 1
fi

current_link="${app_root}/current"
previous_link="${app_root}/previous"

if [[ ! -f "$shared_env_file" ]]; then
  echo "Arquivo de ambiente compartilhado nao encontrado: $shared_env_file" >&2
  exit 1
fi

if [[ -n "$release_id" ]]; then
  target_dir="${app_root}/releases/${release_id}"
else
  if [[ ! -L "$previous_link" ]]; then
    echo "Link previous nao encontrado e nenhuma release alvo foi informada" >&2
    exit 1
  fi
  target_dir="$(readlink "$previous_link")"
  release_id="$(basename "$target_dir")"
fi

if [[ ! -d "$target_dir" ]]; then
  echo "Release alvo nao encontrada: $target_dir" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$shared_env_file"
set +a

if [[ -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
fi

export NEXT_PUBLIC_WARMUP_MANAGER_URL="${NEXT_PUBLIC_WARMUP_MANAGER_URL:-/warmup}"

if [[ -z "${WARMUP_TICK_INTERVAL_MS:-}" && -n "${WARMUP_RUNTIME_TICK_INTERVAL_MS:-}" ]]; then
  export WARMUP_TICK_INTERVAL_MS="${WARMUP_RUNTIME_TICK_INTERVAL_MS}"
fi

if [[ ! -x "${target_dir}/ops/kvm2/validate_shared_env.sh" ]]; then
  echo "Validador de env nao encontrado na release alvo" >&2
  exit 1
fi

"${target_dir}/ops/kvm2/validate_shared_env.sh" "$shared_env_file"

if [[ ! -f "${RUPTUR_BACKEND_ENV_FILE}" ]]; then
  echo "Arquivo real do backend nao encontrado: ${RUPTUR_BACKEND_ENV_FILE}" >&2
  exit 1
fi

export COMPOSE_PROFILES="${profiles}"

ln -sfn "$target_dir" "$current_link"

cd "${current_link}/deploy/kvm2"

docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-ruptur-kvm2}" up -d --build --remove-orphans

echo "$release_id" > "${app_root}/shared/last_rollback_release"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "${app_root}/shared/last_rollback_at"

echo "Rollback remoto concluido. Release atual: $release_id"
