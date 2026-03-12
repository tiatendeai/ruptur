# Ruptur Backend (Sprint 0)

Backend mínimo para iniciar o core do Ruptur.

## Requisitos

- Python 3.11+
- (Opcional) Docker para Postgres local

## Rodar a API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Healthcheck: `GET http://localhost:8000/health`

Webhook (uazapi): `POST http://localhost:8000/webhook/uazapi`
Enviar texto (via uazapi): `POST http://localhost:8000/send/text`

## Subir Postgres local (opcional)

```bash
cd backend
docker compose up -d
```

O schema inicial é aplicado automaticamente via `db/schema.sql`.

## Persistência (Sprint 1)

Para persistir webhooks no Postgres, preencha `RUPTUR_DATABASE_URL` no seu `.env`:

```bash
RUPTUR_DATABASE_URL=postgres://ruptur:ruptur@localhost:5432/ruptur
```

Para enviar mensagens via uazapi, configure:

```bash
RUPTUR_UAZAPI_BASE_URL=https://free.uazapi.com
RUPTUR_UAZAPI_TOKEN=...
```
