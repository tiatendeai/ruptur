# Registro de Publicacao — Hosts e Connectome

Data: 2026-03-14

## O que entrou

- `Studio` publicado em host dedicado:
  - `https://studio.ruptur.cloud`
- `Showcase` publicado como home e aliases:
  - `https://ruptur.cloud`
  - `https://showcase.ruptur.cloud`
  - `https://site.ruptur.cloud`
  - `https://lp.ruptur.cloud`
  - `https://web.ruptur.cloud`
- `app.ruptur.cloud` preservado como console operacional

## Arquivos principais

- `web/src/app/AppShell.tsx`
- `web/src/proxy.ts`
- `web/public/connectome/index.html`
- `web/public/connectome/three.html`
- `deploy/host2/traefik_dynamic.yml`

## Validacao

### Console

- `app.ruptur.cloud` -> `/inbox`

### Studio

- `studio.ruptur.cloud` -> `/studio`

### Showcase

- `showcase/site/lp/web/ruptur.cloud` -> home/showcase

### API

- `api.ruptur.cloud/health` saudavel

## TLS

Validado com sucesso:

- `https://studio.ruptur.cloud` -> `307 /studio`
- `https://showcase.ruptur.cloud` -> `200`
- `https://site.ruptur.cloud` -> `200`
- `https://lp.ruptur.cloud` -> `200`
- `https://web.ruptur.cloud` -> `200`
- `https://ruptur.cloud` -> `200`

O certificado servido pelo Traefik passou a cobrir a familia completa de hosts do front.

## Observacao operacional

Antes do deploy foi gerada uma stash na VPS para preservar drift local:

- `pre-deploy-2026-03-14-connectome`

Ela continua registrada no host e nao deve ser perdida sem revisao.
