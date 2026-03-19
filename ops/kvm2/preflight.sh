#!/usr/bin/env bash
set -Eeuo pipefail

skip_public_checks="false"

while (($#)); do
  case "$1" in
    --skip-public-checks)
      skip_public_checks="true"
      shift
      ;;
    *)
      echo "Parametro nao suportado: $1" >&2
      exit 1
      ;;
  esac
done

required_cmds=(bash ssh rsync)

for cmd in "${required_cmds[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Comando obrigatorio ausente: $cmd" >&2
    exit 1
  fi
done

required_vars=(
  KVM2_SSH_HOST
  KVM2_SSH_USER
  KVM2_SSH_PRIVATE_KEY
  KVM2_APP_ROOT
  KVM2_SHARED_ENV_FILE
)

if [[ "$skip_public_checks" != "true" ]]; then
  required_vars+=(
    KVM2_API_HEALTHCHECK_URL
    KVM2_WEB_URL
  )
fi

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Variavel obrigatoria ausente: $var_name" >&2
    exit 1
  fi
done

if [[ ! -f "deploy/kvm2/docker-compose.yml" ]]; then
  echo "Arquivo deploy/kvm2/docker-compose.yml nao encontrado" >&2
  exit 1
fi

if [[ ! -f "ops/kvm2/remote_deploy.sh" ]]; then
  echo "Script ops/kvm2/remote_deploy.sh nao encontrado" >&2
  exit 1
fi

echo "Preflight do kvm2 ok."
