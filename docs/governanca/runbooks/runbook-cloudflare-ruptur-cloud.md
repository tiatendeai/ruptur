# Runbook — Cloudflare de ruptur.cloud

## Estado validado em 2026-03-13

Zona:

- `ruptur.cloud`
- status: `active`
- nameservers:
  - `arturo.ns.cloudflare.com`
  - `ximena.ns.cloudflare.com`

## Registros DNS encontrados

- `ruptur.cloud` -> `129.148.17.85`
- `app.ruptur.cloud` -> `129.148.17.85`
- `api.ruptur.cloud` -> `129.148.17.85`
- `webhook.ruptur.cloud` -> `129.148.17.85`
- `baileys.ruptur.cloud` -> `167.234.228.71`
- `n8n.ruptur.cloud` -> `167.234.228.71`
- `portainer.ruptur.cloud` -> `167.234.228.71`
- `traefik.ruptur.cloud` -> `167.234.228.71`
- `minio.ruptur.cloud` -> `167.234.228.71`
- `typebot.ruptur.cloud` -> `167.234.228.71`
- `redis.ruptur.cloud` -> `167.234.228.71`
- `www.ruptur.cloud` -> `CNAME ruptur.cloud`

## Leitura operacional

- `apex`, `api` e `webhook` apontam para `host1`
- `baileys`, `n8n`, `portainer`, `traefik`, `minio`, `typebot` e `redis` apontam para `host2`
- `www` redireciona via CNAME para o dominio raiz
- `app` foi reservado como entrada da aplicacao

## Observacao de seguranca

- `redis.ruptur.cloud` foi criado apenas no DNS
- isso nao significa que Redis deva ficar publicamente acessivel
- o correto e manter restricao por firewall, rede privada ou bind local quando o servico for ativado

## Proximo ajuste recomendado

Decidir se `app.ruptur.cloud` sera:

- o host principal do console web
- ou se o console ficara no dominio raiz e `www` apenas redireciona

## Credenciais e operacao

Operacao atual validada com:

- `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_EMAIL`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_ACCOUNT_ID`

## Risco

- a `Global API Key` foi usada em sessao operacional e deve ser rotacionada depois da estabilizacao inicial
