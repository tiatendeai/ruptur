# Checklist — Go Live do KVM2 (19/03/2026)

## Leitura executiva

O `Warmup` e a aplicação já estão maduros o suficiente para a migração.

O que falta agora está concentrado em:

- bootstrap real do `kvm2`
- arquivos de ambiente reais
- segredos e variáveis do GitHub Actions
- DNS / firewall / borda
- smoke e rollback

---

## O que já está pronto

### Aplicação

- warmup operacional no `Host2`
- dashboard, telemetria, device lab e relatórios
- auto-regeneração com fila protegida
- deploy manual do warmup estabilizado

### Base de infra no repositório

- `deploy/kvm2/docker-compose.yml`
- `deploy/kvm2/.env.example`
- `deploy/kvm2/backend.env.example`
- `ops/kvm2/bootstrap_host.sh`
- `ops/kvm2/preflight.sh`
- `ops/kvm2/remote_deploy.sh`
- `ops/kvm2/remote_rollback.sh`
- `ops/kvm2/smoke.sh`
- `.github/workflows/deploy-kvm2.yml`
- `.github/workflows/rollback-kvm2.yml`

---

## Bloqueadores reais para virar a chave

### 1. Bootstrap do KVM2

Precisa existir e ser validado:

- `/opt/ruptur/releases`
- `/opt/ruptur/shared`
- `/opt/ruptur/logs`
- user/grupo de deploy
- Docker + Docker Compose

Comando-base:

```bash
sudo bash ops/kvm2/bootstrap_host.sh --app-root /opt/ruptur --app-user deploy --app-group deploy
```

### 2. Arquivo compartilhado do compose

Precisa existir no servidor:

```bash
/opt/ruptur/shared/kvm2.env
```

Base:

- `deploy/kvm2/.env.example`

### 3. Arquivo real do backend

Precisa existir no servidor:

```bash
/opt/ruptur/shared/backend.env
```

Base:

- `deploy/kvm2/backend.env.example`

### 4. Variáveis e segredo do GitHub Actions

Environment:

- `kvm2-production`

Variáveis:

- `KVM2_SSH_HOST`
- `KVM2_SSH_PORT`
- `KVM2_SSH_USER`
- `KVM2_APP_ROOT`
- `KVM2_SHARED_ENV_FILE`
- `KVM2_API_HEALTHCHECK_URL`
- `KVM2_WEB_URL`
- `KVM2_WARMUP_URL`

Segredo:

- `KVM2_SSH_PRIVATE_KEY`

### 5. DNS / borda

Precisam apontar para o `kvm2` no momento da virada:

- `app.ruptur.cloud`
- `api.ruptur.cloud`
- `webhook.ruptur.cloud`
- `baileys.ruptur.cloud`

### 6. Firewall

Liberar só:

- `80`
- `443`
- `SSH` na porta acordada

### 7. Smoke e rollback

Antes do go live:

- `bash ops/kvm2/preflight.sh`
- `bash ops/kvm2/validate_shared_env.sh <arquivo>`
- `bash ops/kvm2/smoke.sh <api> <web> [warmup]`

E validar:

- link `current`
- link `previous`
- rollback manual funcional

---

## Gap real entre Host2 atual e KVM2 esperado

## Variáveis do compose do KVM2 que ainda não aparecem no Host2 atual

- `NEXT_PUBLIC_RUPTUR_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `RUPTUR_POSTGRES_DB`
- `RUPTUR_POSTGRES_USER`
- `RUPTUR_DB_PASSWORD`
- `RUPTUR_BACKEND_ENV_FILE`
- `BAILEYS_LOG_LEVEL`
- `BAILEYS_SENT_MESSAGE_TTL_MS`
- `BAILEYS_EAGER_START_DEFAULT`
- `BAILEYS_LAZY_START_DEFAULT`
- `BAILEYS_BOOT_NAMED_INSTANCES`
- `WARMUP_RUNTIME_TICK_INTERVAL_MS`
- `WHISPER_MODEL`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`
- `WHISPER_LANGUAGE`
- `WHISPER_BEAM_SIZE`
- `WHISPER_VAD_FILTER`

## Variáveis do backend esperadas no KVM2 e ainda ausentes no Host2 atual

- `RUPTUR_CORS_ORIGINS`
- `RUPTUR_SUPABASE_URL`
- `RUPTUR_SUPABASE_PUBLISHABLE_KEY`
- `RUPTUR_BAILEYS_BASE_URL`
- `RUPTUR_BAILEYS_INSTANCE_ID`
- `RUPTUR_ASAAS_BASE_URL`
- `RUPTUR_ASAAS_TOKEN`
- `RUPTUR_JARVIS_ADMIN_TOKEN`
- `RUPTUR_ALLOWED_GROUPS_JIDS`

## Chaves existentes hoje no Host2 e que pedem decisão de mapeamento

- `RUPTUR_DATABASE_URL` → no KVM2 vira composição por:
  - `RUPTUR_POSTGRES_DB`
  - `RUPTUR_POSTGRES_USER`
  - `RUPTUR_DB_PASSWORD`
- `RUPTUR_BAILEYS_ENDPOINT` → conferir se deve migrar para:
  - `RUPTUR_BAILEYS_BASE_URL`
- `BAILEYS_DOMAIN` → verificar se ainda faz sentido no desenho do `kvm2`
- segredos de Cloudflare / GitHub / Telegram → decidir o que realmente precisa ir para o `backend.env`

---

## Ordem recomendada de execução

1. bootstrap do `kvm2`
2. criar `kvm2.env`
3. criar `backend.env`
4. validar env
5. preencher GitHub Actions
6. preparar DNS / firewall
7. rodar preflight
8. disparar primeiro deploy manual
9. rodar smoke
10. só então virar tráfego

---

## Critério de go live

Só considerar pronto quando:

- bootstrap concluído
- envs reais preenchidos
- GitHub Actions configurado
- deploy manual executado no `kvm2`
- smoke verde
- rollback testado
- DNS pronto para corte

---

## Observação

O débito técnico de rotação do `RUPTUR_UAZAPI_ADMIN_TOKEN` continua recomendado antes da virada final, mesmo não sendo bloqueador para montar o `kvm2`.
