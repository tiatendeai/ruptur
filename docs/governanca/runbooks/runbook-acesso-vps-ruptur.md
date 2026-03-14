# Runbook — Acesso CLI às VPS do Ruptur

## Objetivo

Concentrar o mapa operacional minimo de acesso SSH das VPS do `Ruptur`, com:

- host
- user
- IP
- chave validada
- raiz operacional
- dominios associados

## Mapa atual

| host | user | ip | chave validada | raiz operacional | dominios |
|---|---|---|---|---|---|
| `host1` | nao validado | `129.148.17.85` | nao validada nesta maquina | nao validada | `ruptur.cloud`, `app.ruptur.cloud` |
| `host2` | `ubuntu` | `167.234.228.71` | `/Users/diego/.ssh/id_ed25519` | `/home/ubuntu/apps/ruptur-backend` | `api.ruptur.cloud`, `webhook.ruptur.cloud`, `baileys.ruptur.cloud`, `n8n.ruptur.cloud`, `portainer.ruptur.cloud`, `traefik.ruptur.cloud`, `minio.ruptur.cloud`, `typebot.ruptur.cloud`, `redis.ruptur.cloud` |

## Estado de validacao

### Host2

Validado em `2026-03-14`:

- acesso SSH funcional com `ubuntu@167.234.228.71`
- chave aceita pelo servidor: `/Users/diego/.ssh/id_ed25519`
- host remoto respondeu como:
  - user: `ubuntu`
  - hostname: `vnic-vps-x86-1`
- caminhos presentes:
  - raiz oficial: `/home/ubuntu/apps/ruptur-backend`
  - raiz legada ainda existente: `/home/ubuntu/apps/ruptur-host2/host2`

### Host1

Tentativas feitas nesta maquina com:

- users: `ubuntu`, `opc`, `root`, `debian`, `ec2-user`, `admin`
- chaves:
  - `/Users/diego/.ssh/id_ed25519`
  - `/Users/diego/.ssh/vps-ssh-key-2025-07-25.key`
  - `/Users/diego/.ssh/ssh-key-2025-07-25.key`
  - `/Users/diego/.ssh/tiatendeai_deploy_key`
  - `/Users/diego/.ssh/hostinger`
  - `~/Documents/br-sp-mautics.pem`
  - `~/Downloads/br-sp-christianitatis.pem`

Resultado:

- nenhum par `user + chave` autenticou no `129.148.17.85`
- portanto o acesso real do `host1` continua pendente de confirmacao

## Acesso por CLI

### Host2

```bash
ssh ruptur-host2
```

Sem alias:

```bash
ssh -i /Users/diego/.ssh/id_ed25519 ubuntu@167.234.228.71
```

### Host1

Alias preparado, mas ainda nao validado:

```bash
ssh ruptur-host1
```

Sem alias:

```bash
ssh ubuntu@129.148.17.85
```

## Checks uteis

```bash
ssh ruptur-host2 "pwd"
ssh ruptur-host2 "cd ~/apps/ruptur-backend && git status -sb"
ssh ruptur-host2 "curl -sS https://api.ruptur.cloud/health"
```

## Observacao importante

Existe drift documental sobre `app.ruptur.cloud`:

- inventario de ativos aponta `host1`
- parte da operacao recente tratou `app` junto do `host2`

Antes de consolidar o papel final do `host1`, validar DNS e stack real em producao.
