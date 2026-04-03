#!/usr/bin/env bash
set -Eeuo pipefail

app_root=""
release_id=""
shared_env_file=""
profiles=""
default_profiles="edge,core,channels,warmup"

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

if [[ -z "$app_root" || -z "$release_id" || -z "$shared_env_file" ]]; then
  echo "Uso: remote_deploy.sh --app-root <dir> --release-id <id> --shared-env-file <file> [--profiles <lista>]" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado no host remoto" >&2
  exit 1
fi

release_dir="${app_root}/releases/${release_id}"
current_link="${app_root}/current"
previous_link="${app_root}/previous"

if [[ ! -d "$release_dir" ]]; then
  echo "Release nao encontrada: $release_dir" >&2
  exit 1
fi

if [[ ! -f "$shared_env_file" ]]; then
  echo "Arquivo de ambiente compartilhado nao encontrado: $shared_env_file" >&2
  exit 1
fi

if [[ ! -x "${release_dir}/ops/kvm2/validate_shared_env.sh" ]]; then
  echo "Validador de env nao encontrado na release" >&2
  exit 1
fi

mkdir -p "${app_root}/shared" "${app_root}/logs"

previous_target=""
if [[ -L "$current_link" ]]; then
  previous_target="$(readlink "$current_link")"
fi

set -a
# shellcheck disable=SC1090
source "$shared_env_file"
set +a

if [[ -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
fi

export NEXT_PUBLIC_WARMUP_MANAGER_URL="${NEXT_PUBLIC_WARMUP_MANAGER_URL:-/warmup}"
export RUPTUR_COMPOSE_PROJECT_NAME="${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}"

if [[ -z "${WARMUP_TICK_INTERVAL_MS:-}" && -n "${WARMUP_RUNTIME_TICK_INTERVAL_MS:-}" ]]; then
  export WARMUP_TICK_INTERVAL_MS="${WARMUP_RUNTIME_TICK_INTERVAL_MS}"
fi

"${release_dir}/ops/kvm2/validate_shared_env.sh" "$shared_env_file"

if [[ ! -f "${RUPTUR_BACKEND_ENV_FILE}" ]]; then
  echo "Arquivo real do backend nao encontrado: ${RUPTUR_BACKEND_ENV_FILE}" >&2
  exit 1
fi

if [[ -z "$profiles" ]]; then
  profiles="${default_profiles}"
fi

export COMPOSE_PROFILES="${profiles}"

if [[ -n "$previous_target" ]]; then
  ln -sfn "$previous_target" "$previous_link"
fi

ln -sfn "$release_dir" "$current_link"

cd "${current_link}/deploy/kvm2"

docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME}" build --no-cache warmup
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME}" up -d --remove-orphans

echo "$release_id" > "${app_root}/shared/last_deployed_release"
date -u +"%Y-%m-%dT%H:%M:%SZ" > "${app_root}/shared/last_deployed_at"

echo "Deploy remoto concluido. Release atual: $release_id"
echo "Projeto Compose: ${RUPTUR_COMPOSE_PROJECT_NAME}"
echo "Profiles ativos: ${COMPOSE_PROFILES}"
