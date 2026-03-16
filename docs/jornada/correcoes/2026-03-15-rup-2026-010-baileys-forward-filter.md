# Registro de Correcao

- `id`: RUP-2026-010
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | devops
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Instancias de atendimento ficaram com latencia/instabilidade por volume alto de eventos de grupo/status chegando ao backend.

## 2) Causa raiz

Gateway Baileys encaminhava `messages.upsert` de grupos e status para o webhook principal sem filtro por padrao.

## 3) Correcao aplicada

- adicionado filtro de encaminhamento no gateway:
  - `BAILEYS_FORWARD_GROUP_MESSAGES=false` (padrao)
  - `BAILEYS_FORWARD_STATUS_MESSAGES=false` (padrao)
- grupos/status deixaram de ser forwardados por default.

## 4) Comentarios tecnicos relevantes

`RUP-2026-010` comentado em:
- `deploy/host2/baileys/src/index.mjs`

## 5) Validacao

- rebuild do `baileys` em producao.
- logs passaram a reduzir ruido de `@g.us` e `status@broadcast`.

## 6) Impacto lateralizado

- melhora responsividade do webhook principal para conversas 1:1.

## 7) Risco residual

- se houver caso de negocio para grupo/status, precisa ativar flags explicitamente.

## 8) Rollback

- restaurar comportamento anterior removendo filtro no `messages.upsert`.

## 9) Links

- runbook/doc atualizada: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
