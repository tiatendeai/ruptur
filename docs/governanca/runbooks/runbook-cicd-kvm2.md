# Runbook — CI/CD e Deploy no KVM2

## Objetivo

Explicar, de forma simples e operacional, como o `Ruptur` passa por:

- CI no GitHub Actions
- deploy manual no `kvm2`
- rollback manual no `kvm2`

Sem executar deploy automatico sem comando humano.

## Times envolvidos

### Jarvis-maestro

- coordena a ordem das entregas
- nao libera deploy sem gate verde

### devops-engineer

- cuida do `kvm2`
- Docker, Compose, Traefik, rede, rollback

### security-auditor

- valida segredos, acessos, ambientes e gates

### backend-specialist

- garante que backend e healthcheck subam corretamente

### frontend-specialist

- garante build e publicacao do web app

### qa-automation-engineer

- roda smoke e checks minimos apos deploy

## Workflows criados

### 1. CI

Arquivo:

- `.github/workflows/ci.yml`

Faz:

- testes do backend
- lint e build do web
- validacao dos scripts de deploy
- validacao do compose do `kvm2`
- build docker de backend e web

### 2. Deploy KVM2

Arquivo:

- `.github/workflows/deploy-kvm2.yml`

Faz:

- checkout do ref escolhido
- envio da release para o `kvm2`
- troca do link `current`
- `docker compose up -d --build`
- smoke publico opcional

### 3. Rollback KVM2

Arquivo:

- `.github/workflows/rollback-kvm2.yml`

Faz:

- rollback para uma release escolhida
- ou usa o link `previous`

## Variaveis e segredos do GitHub Actions

Criar no Environment `kvm2-production`:

### Variaveis

- `KVM2_SSH_HOST`
- `KVM2_SSH_PORT`
- `KVM2_SSH_USER`
- `KVM2_APP_ROOT`
- `KVM2_SHARED_ENV_FILE`
- `KVM2_API_HEALTHCHECK_URL`
- `KVM2_WEB_URL`
- `KVM2_WARMUP_URL` (opcional)

### Segredo

- `KVM2_SSH_PRIVATE_KEY`

## Estrutura esperada no KVM2

Exemplo:

```bash
/opt/ruptur/
  releases/
  shared/
  logs/
  current -> /opt/ruptur/releases/<release_id>
  previous -> /opt/ruptur/releases/<release_id_anterior>
```

## Arquivos que precisam existir no KVM2

### 1. Arquivo compartilhado do compose

Exemplo:

```bash
/opt/ruptur/shared/kvm2.env
```

Base:

- `deploy/kvm2/.env.example`

### 2. Arquivo real de ambiente do backend

Exemplo:

```bash
/opt/ruptur/shared/backend.env
```

Base:

- `deploy/kvm2/backend.env.example`

## Script de arrumacao inicial do servidor

Arquivo:

- `ops/kvm2/bootstrap_host.sh`

Uso tipico no `kvm2`:

```bash
sudo bash ops/kvm2/bootstrap_host.sh --app-root /opt/ruptur --app-user deploy --app-group deploy
```

## Script de validacao do env compartilhado

Arquivo:

- `ops/kvm2/validate_shared_env.sh`

Uso:

```bash
bash ops/kvm2/validate_shared_env.sh deploy/kvm2/.env.example
```

Ou no servidor:

```bash
bash /opt/ruptur/current/ops/kvm2/validate_shared_env.sh /opt/ruptur/shared/kvm2.env
```

## Como o deploy acontece

1. humano dispara o workflow manual
2. GitHub Actions gera uma release nova
3. release sobe para `releases/<id>`
4. script remoto troca `current`
5. Compose sobe os servicos
6. smoke verifica se a casa acordou

## Importante

O deploy **nao** e automatico por push.

Ele continua manual, para respeitar a regra:

- deploy so acontece quando Diego mandar

## Comandos uteis no servidor

Ver release atual:

```bash
readlink /opt/ruptur/current
```

Ver release anterior:

```bash
readlink /opt/ruptur/previous
```

Subir stack manualmente:

```bash
cd /opt/ruptur/current/deploy/kvm2
set -a
source /opt/ruptur/shared/kvm2.env
set +a
docker compose --project-name ruptur-kvm2 up -d --build
```

## Gates minimos antes de apertar deploy

- CI verde
- bootstrap do `kvm2` concluido
- segredos preenchidos
- arquivo `kvm2.env` presente
- arquivo `backend.env` presente
- DNS/dominios apontando corretamente
- rollback conhecido

## Observacao de seguranca

O repositório `vps-oracle` foi usado como referencia de camada de infra e especialistas.

Nao reutilizar:

- `terraform.tfstate`
- `terraform.tfvars`
- chaves privadas
- qualquer segredo versionado
