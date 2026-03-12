## Host 2 (Oracle VPS) — Baileys + Traefik

Stack mínima para subir um serviço Baileys (WhatsApp Web) atrás de Traefik com TLS (Let's Encrypt).

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
  - `baileys.statuspersianas.com.br` → IP do Host2

### Subir

1) Copie `deploy/host2/.env.example` → `deploy/host2/.env` e ajuste:

- `TRAEFIK_ACME_EMAIL`
- `BAILEYS_DOMAIN`
- `OPENAI_API_KEY` (opcional)
- `WHISPER_BASE_URL` (opcional; recomendado — usa Whisper local e não gasta OpenAI)

2) Rode:

```bash
cd deploy/host2
docker compose --env-file .env up -d --build
docker logs -f host2-baileys-1
```

3) Escaneie o QR code que aparece nos logs.

### Teste (HTTP)

Depois de conectado:

```bash
curl -sS https://baileys.statuspersianas.com.br/health
curl -sS -X POST https://baileys.statuspersianas.com.br/send/text \
  -H 'content-type: application/json' \
  -d '{"to":"5511999999999","text":"teste baileys"}'
```
