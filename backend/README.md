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

## Subir Postgres local (opcional)

```bash
cd backend
docker compose up -d
```

O schema inicial é aplicado automaticamente via `db/schema.sql`.

