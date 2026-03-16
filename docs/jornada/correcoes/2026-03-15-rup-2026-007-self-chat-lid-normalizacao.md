# Registro de Correcao

- `id`: RUP-2026-007
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | devops | sustentacao
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Self-chat e ativacao `Iazinha` variavam por dispositivo e instancia, com falhas mais frequentes no `1980`.

## 2) Causa raiz

- identificadores `@lid` eram tratados como telefone em partes do fluxo.
- canonicalizacao no gateway e ingestao nao priorizava sempre os campos brutos (`wa_chatid`/`wa_sender`).
- resposta podia mirar JID nao canonico.

## 3) Correcao aplicada

- bloqueio de parse numerico para domínios `lid/newsletter/broadcast`.
- prioridade para `wa_chatid` e `wa_sender`.
- resolucao de `target_jid` para JID canonico de telefone.
- gate de resposta reforcado para evitar loop e spam em grupo.

## 4) Comentarios tecnicos relevantes

Comentarios em codigo marcados com `RUP-2026-007` em:
- `backend/app/services/wa_identity.py`
- `backend/app/api/uazapi_webhook.py`
- `deploy/host2/baileys/src/index.mjs`

## 5) Validacao

- webhook sintético com `@lid` e `@s.whatsapp.net` para ambos numeros.
- logs com `self_chat=True`, `explicit=True`, `should_respond=True`.
- resposta enviada por instancia correta:
  - `default` -> `553181139540`
  - `inst-553189131980` -> `553189131980`

## 6) Impacto lateralizado

- backend/ingestao: maior previsibilidade de conversa por numero.
- devops: necessidade de monitorar reconexao da instancia `inst-553189131980`.

## 7) Risco residual

- reconexao de instancia secundaria pode voltar para `unknown` apos restart e exigir `connect`.

## 8) Rollback

- restaurar versoes anteriores dos 3 arquivos de normalizacao/roteamento.
- rebuild `baileys` e `ruptur-backend`.

## 9) Links

- runbook/doc atualizada: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
