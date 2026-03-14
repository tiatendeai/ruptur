# Runbook — Host2 — App e API

## Raiz oficial

- repositório operacional na VPS: `~/apps/ruptur-backend`
- stack oficial de produção: `~/apps/ruptur-backend/deploy/host2`

## Regra operacional

- não assumir deploy por `git push`
- toda entrega produtiva exige:
  - `git pull` na VPS
  - `docker compose up -d --build`
  - healthcheck de `api` e `app`

## Atualizar produção

```bash
ssh ubuntu@167.234.228.71 "
  set -e
  cd ~/apps/ruptur-backend
  git pull origin work
  cd deploy/host2
  docker compose up -d --build
"
```

## Verificar saúde

```bash
ssh ubuntu@167.234.228.71 "curl -sS https://api.ruptur.cloud/health"
ssh ubuntu@167.234.228.71 "curl -sS -I https://app.ruptur.cloud | head -n 5"
```

## Verificar CRM operacional

```bash
ssh ubuntu@167.234.228.71 "curl -sS https://api.ruptur.cloud/crm/labels"
ssh ubuntu@167.234.228.71 "curl -sS 'https://api.ruptur.cloud/crm/views?scope=inbox'"
ssh ubuntu@167.234.228.71 "curl -sS 'https://api.ruptur.cloud/crm/leads?limit=5'"
```

## Diagnóstico rápido

Se `app.ruptur.cloud` mostrar erro de CORS no console:

- primeiro testar o endpoint direto
- se a API responder `500`, isso nao e problema de CORS; e falha real do backend
- olhar logs:

```bash
ssh ubuntu@167.234.228.71 "docker logs --tail 200 host2-ruptur-backend-1 2>&1"
```

## Banco e schema

Se endpoints do CRM quebrarem com `UndefinedTable`, aplicar o schema atual:

```bash
ssh ubuntu@167.234.228.71 "
  docker exec -i host2-ruptur-db-1 \
    psql -U ruptur -d ruptur < ~/apps/ruptur-backend/backend/db/schema.sql
"
```

## Observações atuais

- o frontend novo de inbox depende de `crm_labels`, `lead_label_links`, `saved_views` e `lead_assignments`
- banco antigo sem esse schema faz o navegador acusar falso `CORS`, mas a causa real e `500` no backend
