## Host 2 (Oracle VPS) — Baileys + Ruptur Backend + Traefik

Stack mínima para subir um serviço Baileys (WhatsApp Web), o backend do Ruptur e Traefik com TLS (Let's Encrypt).

Esta stack expõe uma API **parecida** com a uazapi (subset), útil para trocar o provider sem reescrever tudo.

### Endpoints implementados (subset uazapi)

- `GET /health`
- `GET /instance/status`
- `POST /instance/connect` (retorna status/QR; Baileys não tem “connect” como a uazapi)
- `POST /chat/check` (verifica se número existe)
- `POST /send/text` (`{ number, text }`)
- `POST /send/menu` (apenas `type=button`, com `choices` `Label|https://...`)
- `POST /send/media` (`{ number, type, file, text, docName, mimetype }`) com `type` `image|video|document|audio|ptt`
- `POST /send/status` (parcial: `type=text|image`)
- `POST /ai/transcribe` (opcional; requer `OPENAI_API_KEY`)

### Pré-requisitos (na VPS Host2)

- Docker Engine + Docker Compose
- DNS A (DNS-only, por enquanto):
  - `baileys.ruptur.cloud` → IP do Host2
  - `api.ruptur.cloud` → IP do Host2
  - `webhook.ruptur.cloud` → IP do Host2
  - `app.ruptur.cloud` → IP do Host2

### Subir

1) Copie `deploy/host2/.env.example` → `deploy/host2/.env` e ajuste:

- `TRAEFIK_ACME_EMAIL`
- `BAILEYS_DOMAIN`
- `OPENAI_API_KEY` (opcional)
- `WHISPER_BASE_URL` (opcional; recomendado — usa Whisper local e não gasta OpenAI)

2) Garanta um arquivo `backend/.env` ao lado do diretório `host2/` na VPS com, no mínimo:

```bash
RUPTUR_ENV=prod
RUPTUR_LOG_LEVEL=INFO
RUPTUR_HOST=0.0.0.0
RUPTUR_PORT=8000
RUPTUR_DATABASE_URL=postgresql://ruptur:ruptur@ruptur-db:5432/ruptur
RUPTUR_UAZAPI_BASE_URL=http://baileys:3000
RUPTUR_UAZAPI_TOKEN=local-baileys
```

3) Rode:

```bash
cd host2
docker compose --env-file .env up -d --build
docker logs -f host2-baileys-1
```

4) Escaneie o QR code que aparece nos logs.

5) O Baileys encaminhará eventos recebidos para:

```bash
http://ruptur-backend:8000/webhook/uazapi
```

6) O console web ficará disponível em:

```bash
https://app.ruptur.cloud
```

### Teste (HTTP)

Depois de conectado:

```bash
curl -sS https://baileys.ruptur.cloud/health
curl -sS https://api.ruptur.cloud/health
curl -sS -X POST https://baileys.ruptur.cloud/send/text \
  -H 'content-type: application/json' \
  -d '{"to":"5511999999999","text":"teste baileys"}'
```
