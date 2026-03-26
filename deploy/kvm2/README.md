# KVM2 — stack canonica de producao

## Fonte da verdade

O deploy canonico da KVM2 deve sair de:

- `/opt/ruptur/current`

Mais especificamente:

- `/opt/ruptur/current/deploy/kvm2/docker-compose.yml`

## O que compoe a stack canonica

Profiles operacionais padrao:

- `core`
- `channels`
- `warmup`

Projeto Compose esperado durante a absorcao da stack publica atual:

- `RUPTUR_COMPOSE_PROJECT_NAME=kvm2`

Isso existe para evitar drift e impedir a criacao de uma stack paralela com outro nome.

## O que NAO faz parte do deploy padrao

Os servicos abaixo sao laboratoriais/experimentais:

- `nats`
- `prometheus`
- `ras-worker`

Eles ficam atras do profile:

- `lab-omega`

Nao ligar esse profile no deploy padrao da KVM2.

## Borda / Traefik

O cenario operacional validado hoje e:

- Traefik principal do host
- Ruptur publicado por labels Docker
- profile `edge` desligado por padrao

Quando o arquivo dinamico local for usado, o resolver esperado e:

- `letsencrypt`

## Caminho recomendado de deploy

No host:

```bash
set -a
source /opt/ruptur/shared/kvm2.env
set +a

export COMPOSE_PROFILES="${COMPOSE_PROFILES:-core,channels,warmup}"

cd /opt/ruptur/current/deploy/kvm2
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" up -d --build --remove-orphans
```

## Sinais de drift

Os sinais abaixo bloqueiam deploy/go-live:

- runtime vindo de `/tmp/ruptur-clone/...`
- project name diferente do esperado sem intencao explicita
- `app.ruptur.cloud/` retornando `404`
- `/warmup` caindo no Next.js em vez do runtime
- certresolver diferente do usado pela borda real
