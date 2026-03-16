# Registro de Correcao

- `id`: RUP-2026-011
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | integracoes
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Padrao numerico legado sem o 9 (ex.: `553189131980`) estava sendo usado como referencia principal em alguns fluxos.

## 2) Causa raiz

Normalizacao historica priorizava formato antigo para compatibilidade com provedores.

## 3) Correcao aplicada

- definido canônico de negocio em formato atual BR (com 9):
  - `5531989131980`
  - `5531981139540`
- formato antigo mantido apenas como alias para normalizacao reversa.
- roteamento de instancia e alvo de envio passaram a preferir canonical atual.
- nota posterior:
  - este registro vale para identidade de negocio e exibicao.
  - para transporte WhatsApp, `wa_id`/JID explicito do provedor tem prioridade.
  - ver `RUP-2026-014`.

## 4) Comentarios tecnicos relevantes

`RUP-2026-011` comentado em:
- `backend/app/api/uazapi_webhook.py`

## 5) Validacao

- deploy backend e checagem de health.
- resolucao de instancia preservada para compatibilidade (`inst-553189131980`) com numero canonico novo.

## 6) Impacto lateralizado

- padroniza leitura operacional para todos os times (produto, suporte, devops).

## 7) Risco residual

- integracoes antigas que dependem exclusivamente do formato legado devem usar mapping de alias.
- leitura simplista de `RUP-2026-011` pode induzir erro se alguem tentar reescrever JID explicito do WhatsApp para inserir o `9`.

## 8) Rollback

- reverter mapping canônico e voltar a tratar formato legado como principal.

## 9) Links

- runbook/doc atualizada: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
