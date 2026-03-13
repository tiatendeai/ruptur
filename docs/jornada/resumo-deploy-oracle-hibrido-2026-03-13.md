# Resumo de deploy na Oracle — Baileys + Ruptur Backend

## Estado encontrado

- VPS Oracle ARM em `167.234.228.71`
- acesso por `ssh` com usuario `ubuntu`
- Baileys ja rodando como container Docker
- raiz existente em `~/apps/ruptur-host2/host2`
- outra raiz paralela encontrada em `~/apps/ruptur-backend`

## Separacao de conceitos

- `UAZAPI` continua como provider terceirizado e referencia de compatibilidade
- `Baileys` e o motor self-hosted no `host2`
- o backend do `Ruptur` recebe webhook de mensagens e concentra a camada de inteligencia e CRM

## Estado consolidado em 2026-03-13

- `baileys.ruptur.cloud` exposto no `host2`
- `api.ruptur.cloud` apontando para `host2`
- `webhook.ruptur.cloud` apontando para `host2`
- Traefik roteando `api`, `webhook` e `baileys`
- `ruptur-backend` e `ruptur-db` de pe dentro da stack hibrida
- health do backend validado externamente em `https://api.ruptur.cloud/health`

## Pendencias operacionais

- reduzir para uma unica raiz operacional viva no `host2`
- sanear `.env` da VPS
- rotacionar segredos reaproveitados
- subir a landing e a aplicacao publica na topologia final de dominio
