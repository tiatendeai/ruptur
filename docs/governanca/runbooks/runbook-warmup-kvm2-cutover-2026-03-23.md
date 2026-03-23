# Runbook — cutover do Warmup Manager para a KVM2

## Objetivo

Colocar o Warmup Manager utilizavel via `https://app.ruptur.cloud/warmup` sem depender de fallback para `localhost`, absorvendo a stack publica atual da `KVM2` com o menor risco operacional possivel.

## Estado de entrada validado em 23/03/2026

- `host2` tem o runtime real do warmup ativo.
- `KVM2` esta servindo `app.ruptur.cloud`.
- `KVM2` nao tinha container `warmup` ativo.
- `app.ruptur.cloud/warmup` estava caindo no `Next.js`.
- a stack publica da `KVM2` foi herdada com nome de projeto `kvm2`, embora o fluxo canônico do deploy esteja em `/opt/ruptur/current`.

## Alteracoes minimas obrigatorias

1. `web/Dockerfile`
   - receber `NEXT_PUBLIC_WARMUP_MANAGER_URL`
   - manter fallback seguro em `"/warmup"`
2. `deploy/kvm2/docker-compose.yml`
   - repassar `NEXT_PUBLIC_WARMUP_MANAGER_URL`
   - padronizar `WARMUP_TICK_INTERVAL_MS`
3. env compartilhado
   - `NEXT_PUBLIC_WARMUP_MANAGER_URL=/warmup`
   - `RUPTUR_COMPOSE_PROJECT_NAME=kvm2`
   - compatibilidade com `NEXT_PUBLIC_SUPABASE_ANON_KEY` legado

## Execucao recomendada

### 1) Preparacao

- confirmar backup do env compartilhado em `/opt/ruptur/shared/kvm2.env.bak-*`
- confirmar que o compose sera executado com projeto `kvm2`
- confirmar que o Traefik externo segue conectado na network `kvm2_default`

### 2) Deploy

No host KVM2:

```bash
set -a
source /opt/ruptur/shared/kvm2.env
set +a

export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"
export NEXT_PUBLIC_WARMUP_MANAGER_URL="${NEXT_PUBLIC_WARMUP_MANAGER_URL:-/warmup}"
export WARMUP_TICK_INTERVAL_MS="${WARMUP_TICK_INTERVAL_MS:-${WARMUP_RUNTIME_TICK_INTERVAL_MS:-60000}}"

cd /opt/ruptur/current/deploy/kvm2
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" --profile warmup up -d --build ruptur-web warmup
```

### 3) Smoke local

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep 'kvm2-warmup-1'
curl -skI https://127.0.0.1/ -H 'Host: app.ruptur.cloud'
curl -skI https://127.0.0.1/warmup -H 'Host: app.ruptur.cloud'
docker exec kvm2-warmup-1 wget -qO- http://127.0.0.1:4173/api/local/health
```

### 4) Smoke publico

```bash
curl -skI https://app.ruptur.cloud/
curl -skI https://app.ruptur.cloud/warmup
curl -fsS https://api.ruptur.cloud/health
```

## Critérios de aceite

- `app.ruptur.cloud/` deixa de responder `404`
- `app.ruptur.cloud/warmup` responde `200`
- headers de `/warmup` deixam de indicar `Next.js`
- `kvm2-warmup-1` fica `Up`
- `/api/local/health` do runtime responde `ok: true`

## Rollback

Se o `warmup` ou o `web` quebrarem apos o rebuild:

```bash
set -a
source /opt/ruptur/shared/kvm2.env
set +a

cd /opt/ruptur/current/deploy/kvm2
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" stop warmup
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" rm -f warmup
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" up -d --build ruptur-web
```

Se precisar rollback completo de release:

```bash
bash /opt/ruptur/current/ops/kvm2/remote_rollback.sh \
  --app-root /opt/ruptur \
  --shared-env-file /opt/ruptur/shared/kvm2.env \
  --profiles core,channels,warmup
```

## Backlog residual apos o cutover

1. eliminar o drift operacional legado que ainda referencia `/tmp/ruptur-clone`
2. publicar deploy canônico sempre via release nova, sem hotfix in-place
3. decidir se o runtime real do warmup deve permanecer na KVM2 ou voltar a ser servido por host dedicado
4. subir `node-exporter` e `cadvisor` na propria KVM2 quando a stack estabilizar
