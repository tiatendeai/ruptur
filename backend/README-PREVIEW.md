# Ruptur Backend (preview local)

Este diretório (`backend/`) contém a API do Ruptur (FastAPI).

## Pré‑requisitos

- Python 3.11+

## Rodar a API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Abrir:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

## Banco (opcional, mas recomendado)

Para o Console mostrar dados reais, configure `RUPTUR_DATABASE_URL` no `.env` do `backend/`:

```bash
RUPTUR_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
```

O schema base está em `backend/db/schema.sql`.

## Integrações (opcional)

### Asaas (checkout)

```bash
RUPTUR_ASAAS_TOKEN=...
RUPTUR_ASAAS_BASE_URL=https://api.asaas.com
```

### WhatsApp (canal)

As integrações de canal são configuradas via variáveis existentes no projeto (e administradas internamente pelo Ruptur).

