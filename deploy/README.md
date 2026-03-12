# Deploy (VPS Oracle)

Target: Oracle Always Free micro nodes.

## Hostnames (Cloudflare)

Exemplo para `statuspersianas.com.br`:

- `api.statuspersianas.com.br` → VPS Host 1
- `webhook.statuspersianas.com.br` → VPS Host 1 (opcional; pode apontar para `api`)

## Serviços (Host 1)

- Traefik (TLS + reverse proxy)
- Ruptur backend (FastAPI)

## Secrets / env

Crie um arquivo `.env` no servidor (não versionado) com:

```bash
RUPTUR_DATABASE_URL=...
RUPTUR_UAZAPI_BASE_URL=https://tiatendeai.uazapi.com
RUPTUR_UAZAPI_TOKEN=...
TRAEFIK_ACME_EMAIL=contato@2dlcompany.com.br
```

