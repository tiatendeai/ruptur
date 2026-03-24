<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/runbooks/runbook-jarvis-vc-level.md
Não edite manualmente aqui sem promover no STATE.
-->

# Runbook — Jarvis vC-Level e perfis adjacentes (vCFO, vCVO, vCEO, vController, vAdminOps, vFinOps)

Data de referência: 2026-03-15

## Objetivo

Documentar as correções aplicadas no módulo Jarvis para operação com um único humano (Diego) e especialistas virtuais, com manutenção por múltiplos times.

## Escopo das correções

1. Abstração de perfis virtuais:
- `vCFO` (financeiro)
- `vCVO` (priorização estratégica)
- `vCEO` *(alias operacional legado: `Eggs`)* (execução operacional)
- `vController` (controle financeiro e variância)
- `vAdminOps` (SOPs, filas e handoffs)
- `vFinOps` (custos de cloud/IA e eficiência)

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

- `POST /jarvis/ask` (`profile`: `ops|vcfo|vcvo|eggs|vceo|vcontroller|vadminops|vfinops`)
- `POST /jarvis/ask/vcfo`
- `POST /jarvis/ask/vcvo`
- `POST /jarvis/ask/vceo` (alias canônico; compatível com `/jarvis/ask/eggs`)
- `POST /jarvis/ask/eggs`
- `POST /jarvis/ask/vcontroller`
- `POST /jarvis/ask/vadminops`
- `POST /jarvis/ask/vfinops`
- `POST /jarvis/vcfo/weekly-close`
- `POST /jarvis/vcvo/weekly-brief`
- `POST /jarvis/vceo/weekly-close` (alias canônico; compatível com `/jarvis/eggs/weekly-close`)
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
