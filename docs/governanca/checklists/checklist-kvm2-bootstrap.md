# Checklist — Arrumar o KVM2

## Ideia simples

Antes da casinha receber os brinquedos, ela precisa:

- ter porta
- ter luz
- ter chave
- ter armario

No nosso caso:

- Docker
- pastas
- segredos
- DNS
- acesso do GitHub Actions

## Time envolvido

- `Jarvis-maestro`
- `devops-engineer`
- `security-auditor`
- `documentation-writer`

## Passo 1 — Entrar na VPS

Validar:

- acesso SSH funcionando
- user certo
- chave certa

## Passo 2 — Rodar bootstrap

Script:

```bash
sudo bash ops/kvm2/bootstrap_host.sh --app-root /opt/ruptur --app-user deploy --app-group deploy
```

## Passo 3 — Conferir as pastas

Precisa existir:

```bash
/opt/ruptur/releases
/opt/ruptur/shared
/opt/ruptur/logs
```

## Passo 4 — Criar arquivo compartilhado do compose

Exemplo:

```bash
/opt/ruptur/shared/kvm2.env
```

Base:

- `deploy/kvm2/.env.example`

Campos importantes desse arquivo:

- `TRAEFIK_ACME_EMAIL`
- `NEXT_PUBLIC_RUPTUR_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `RUPTUR_POSTGRES_DB`
- `RUPTUR_POSTGRES_USER`
- `RUPTUR_DB_PASSWORD`
- `RUPTUR_BACKEND_ENV_FILE`

## Passo 5 — Criar arquivo real do backend

Exemplo:

```bash
/opt/ruptur/shared/backend.env
```

Base:

- `deploy/kvm2/backend.env.example`

## Passo 6 — Validar env compartilhado

```bash
bash /opt/ruptur/current/ops/kvm2/validate_shared_env.sh /opt/ruptur/shared/kvm2.env
```

Ou localmente antes de subir:

```bash
bash ops/kvm2/validate_shared_env.sh deploy/kvm2/.env.example
```

## Passo 7 — Conferir Docker

```bash
docker --version
docker compose version
```

## Passo 8 — Conferir rede e DNS

Validar se apontam para o `kvm2`:

- `app.ruptur.cloud`
- `api.ruptur.cloud`
- `webhook.ruptur.cloud`
- `baileys.ruptur.cloud`

## Passo 9 — Conferir firewall

Deixar aberto so o necessario:

- 80
- 443
- SSH na porta combinada

## Passo 10 — Conferir backup e rollback

Precisamos saber:

- onde ficam volumes
- onde ficam releases
- como voltar para a release anterior

## So fica pronto quando

- SSH ok
- Docker ok
- pastas ok
- envs ok
- DNS ok
- secrets do GitHub ok
- rollback entendido
