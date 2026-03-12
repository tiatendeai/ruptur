# Ruptur Console (preview local)

Este diretório (`web/`) contém o **Console** do Ruptur: gestão à vista (Inbox, Pipeline, Métricas, Conexões, Sendflow, Planos).

> Importante: no Ruptur, o Console é “cockpit”. A operação roda via automações/agentes; o Console serve para auditoria, exceções e configuração.

## Pré‑requisitos

- Node.js 20+ (recomendado)
- npm

Para ver dados reais no Console:

- Backend Ruptur rodando em `http://127.0.0.1:8000`
- (Opcional) Postgres configurado no backend (`RUPTUR_DATABASE_URL`)

## Rodar o Console

```bash
cd web
npm install
export NEXT_PUBLIC_RUPTUR_API_BASE_URL='http://127.0.0.1:8000'
npm run dev
```

Abrir:

- `http://localhost:3000/inbox`
- `http://localhost:3000/pipeline`
- `http://localhost:3000/broadcasts`
- `http://localhost:3000/connections`
- `http://localhost:3000/sendflow`
- `http://localhost:3000/metrics`
- `http://localhost:3000/billing`

## Variáveis de ambiente

- `NEXT_PUBLIC_RUPTUR_API_BASE_URL` (default: `http://127.0.0.1:8000`)

