#!/usr/bin/env bash
set -Eeuo pipefail

app_root="/opt/ruptur"
app_user="deploy"
app_group="deploy"
install_docker="true"

while (($#)); do
  case "$1" in
    --app-root)
      app_root="$2"
      shift 2
      ;;
    --app-user)
      app_user="$2"
      shift 2
      ;;
    --app-group)
      app_group="$2"
      shift 2
      ;;
    --skip-docker-install)
      install_docker="false"
      shift
      ;;
    *)
      echo "Parametro nao suportado: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Rode como root ou com sudo, amiguinho." >&2
  exit 1
fi

ensure_group() {
  local group_name="$1"
  if ! getent group "$group_name" >/dev/null 2>&1; then
    groupadd --system "$group_name"
  fi
}

ensure_user() {
  local user_name="$1"
  local group_name="$2"
  if ! id "$user_name" >/dev/null 2>&1; then
    useradd --system --create-home --gid "$group_name" --shell /bin/bash "$user_name"
  fi
}

install_docker_stack() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "Docker ja esta pronto."
    return 0
  fi

  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release rsync

  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

ensure_group "$app_group"
ensure_user "$app_user" "$app_group"

if [[ "$install_docker" == "true" ]]; then
  install_docker_stack
fi

usermod -aG docker "$app_user" || true

mkdir -p \
  "${app_root}/releases" \
  "${app_root}/shared" \
  "${app_root}/logs"

chown -R "${app_user}:${app_group}" "${app_root}"

cat <<EOF
Bootstrap do kvm2 pronto.

Pastinhas criadas:
- ${app_root}/releases
- ${app_root}/shared
- ${app_root}/logs

Proximo passinho:
1. criar ${app_root}/shared/kvm2.env
2. criar ${app_root}/shared/backend.env
3. dar acesso SSH para o GitHub Actions
4. preencher os secrets do environment kvm2-production
EOF
