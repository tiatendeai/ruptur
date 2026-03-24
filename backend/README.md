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
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Healthcheck: `GET http://localhost:8000/health`

Webhook (uazapi): `POST http://localhost:8000/webhook/uazapi`
Enviar texto (via uazapi): `POST http://localhost:8000/send/text`
Próximo passo (heurístico): `POST http://localhost:8000/actions/next-step`
Jarvis (geral): `POST http://localhost:8000/jarvis/ask`
Jarvis vCFO: `POST http://localhost:8000/jarvis/ask/vcfo` (compatível com `/jarvis/ask/cfo`)
Jarvis vCFO Weekly Close: `POST http://localhost:8000/jarvis/vcfo/weekly-close` (compatível com `/jarvis/cfo/weekly-close`)
Jarvis vCVO: `POST http://localhost:8000/jarvis/ask/vcvo`
Jarvis vCVO Weekly Brief: `POST http://localhost:8000/jarvis/vcvo/weekly-brief`
Jarvis vCEO: `POST http://localhost:8000/jarvis/ask/vceo` (compatível com `/jarvis/ask/eggs`)
Jarvis vCEO Weekly Close: `POST http://localhost:8000/jarvis/vceo/weekly-close` (compatível com `/jarvis/eggs/weekly-close`)
Jarvis Command (missões): `POST http://localhost:8000/jarvis/command`
Jarvis Missões: `GET http://localhost:8000/jarvis/missions` e `PATCH http://localhost:8000/jarvis/missions/{id}`
Jarvis Updates de missão: `GET/POST http://localhost:8000/jarvis/missions/{id}/updates`
Jarvis Notícias de entrega: `GET http://localhost:8000/jarvis/news/deliveries`
Jarvis Brief diário (anti-sobrecarga): `GET http://localhost:8000/jarvis/brief/daily`

CFO API (dados financeiros):

- `GET/POST http://localhost:8000/cfo/clients`
- `GET/POST http://localhost:8000/cfo/projects`
- `GET/POST http://localhost:8000/cfo/domains`
- `GET/POST http://localhost:8000/cfo/payables`
- `PATCH http://localhost:8000/cfo/payables/{id}/status`
- `GET/POST http://localhost:8000/cfo/receivables`
- `PATCH http://localhost:8000/cfo/receivables/{id}/status`
- `POST http://localhost:8000/cfo/weekly-close`

## Bootstrap padronizado (dev)

Para evitar drift de ambiente local:

```bash
cd backend
./scripts/bootstrap_dev_env.sh
```

Esse script:

- cria `.venv` se necessario
- instala `requirements-dev.txt` (inclui `pytest`)
- valida imports de `fastapi`, `openai`, `psycopg` e `pytest`

## Testes

Com ambiente pronto:

```bash
cd backend
source .venv/bin/activate
python -m pytest -q tests/test_smoke_flow.py
```

Obs:

- os testes de fluxo com banco exigem `RUPTUR_DATABASE_URL`
- sem banco, o teste de health continua sendo executado
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

Opcional para proteger rotas Jarvis/CFO por header:

```bash
RUPTUR_JARVIS_ADMIN_TOKEN=seu_token_forte
```

Se definido, enviar `x-jarvis-token: seu_token_forte` nas chamadas de `/jarvis/*` e `/cfo/*`.
## Follow-up (Sprint 2)

Lista (dry-run):

```bash
cd backend
python -m app.jobs.followup --hours 24 --limit 50
```

Enviar follow-up (cuidado com volume):

```bash
cd backend
python -m app.jobs.followup --hours 24 --limit 50 --send
```
