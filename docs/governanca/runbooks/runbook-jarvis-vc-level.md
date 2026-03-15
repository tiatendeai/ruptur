# Runbook — Jarvis vC-Level (vCFO, vCVO, vCEO/Eggs)

Data de referência: 2026-03-15

## Objetivo

Documentar as correções aplicadas no módulo Jarvis para operação com um único humano (Diego) e especialistas virtuais, com manutenção por múltiplos times.

## Escopo das correções

1. Abstração de perfis virtuais:
- `vCFO` (financeiro)
- `vCVO` (priorização estratégica)
- `Eggs` / `vCEO` (execução operacional)

2. Camada de execução de missão:
- criação de missão
- atualização de status
- registro de updates
- feed de entregas

3. Guardas de governança:
- proteção opcional por token (`x-jarvis-token`)
- validação anti-entrega-falsa (`done` exige `delivery` + critério de aceite)

4. Correção de comportamento de erro:
- manter `404` real em atualizações de CFO, sem mascarar para `503`

## Endpoints oficiais

### Estratégia e operação

- `POST /jarvis/ask` (`profile`: `ops|vcfo|vcvo|eggs`)
- `POST /jarvis/ask/vcfo`
- `POST /jarvis/ask/vcvo`
- `POST /jarvis/ask/eggs`
- `POST /jarvis/vcfo/weekly-close`
- `POST /jarvis/vcvo/weekly-brief`
- `POST /jarvis/eggs/weekly-close`
- `GET /jarvis/brief/daily`

### Missões e entregas

- `POST /jarvis/command`
- `GET /jarvis/missions`
- `PATCH /jarvis/missions/{mission_id}`
- `POST /jarvis/missions/{mission_id}/updates`
- `GET /jarvis/missions/{mission_id}/updates`
- `GET /jarvis/news/deliveries`

### Financeiro (vCFO data plane)

- `GET /cfo/overview`
- `GET/POST /cfo/clients`
- `GET/POST /cfo/projects`
- `GET/POST /cfo/domains`
- `GET/POST /cfo/payables`
- `PATCH /cfo/payables/{id}/status`
- `GET/POST /cfo/receivables`
- `PATCH /cfo/receivables/{id}/status`
- `POST /cfo/weekly-close`

## Segurança operacional

Variável opcional:

```bash
RUPTUR_JARVIS_ADMIN_TOKEN=token_forte
```

Se configurada, todas as rotas `/jarvis/*` e `/cfo/*` exigem:

```bash
-H 'x-jarvis-token: token_forte'
```

## Regra anti-entrega-falsa

Para concluir missão (`status=done`), o backend exige:

1. `note_kind=delivery`
2. `note` preenchido
3. `acceptance_criteria` existente (novo ou já persistido na missão)

Sem isso, a API retorna `400`.

## Troubleshooting (produção)

### 1) `502 Bad Gateway` durante deploy

Durante `docker compose up -d --build`, pode haver janela curta de `502` enquanto containers são recriados.

Validação:

```bash
curl -sS https://api.ruptur.cloud/health
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 200 host2-ruptur-backend-1
```

### 2) `401 unauthorized` em `/jarvis` ou `/cfo`

Verificar se `RUPTUR_JARVIS_ADMIN_TOKEN` está definido no backend e se o header foi enviado.

### 3) Missão não conclui (`400 done_requires_*`)

É comportamento esperado do guarda anti-entrega-falsa.
Enviar `acceptance_criteria` e `note_kind=delivery`.

## Checklist de manutenção lateral

1. `Produto/Operação`: revisar `brief/daily` e `weekly-brief`.
2. `FinOps`: conferir `cfo/overview` e fechamento semanal.
3. `SRE`: monitorar `health`, reinícios de container e latência de endpoint.
4. `Governança`: manter token e runbooks sincronizados com ambiente.
