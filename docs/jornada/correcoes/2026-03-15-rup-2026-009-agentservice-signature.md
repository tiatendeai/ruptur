# Registro de Correcao

- `id`: RUP-2026-009
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Em sessao ativa, algumas mensagens nao recebiam resposta mesmo com trigger correto.

## 2) Causa raiz

`uazapi_webhook.py` chamava `agent_service.get_response(...)` com assinatura antiga (`lead_name`, `last_message`, `persona`), enquanto o `AgentService` atual exige `profile`, `principal_name`, `user_message`.

## 3) Correcao aplicada

- ajuste da chamada para assinatura vigente do `AgentService`.
- adicao de prefixo de persona no retorno (`*Jarvis:*`/`*IAzinha:*`) quando o modelo retorna texto sem prefixo.

## 4) Comentarios tecnicos relevantes

Comentario em codigo com `RUP-2026-009` em:
- `backend/app/api/uazapi_webhook.py`

## 5) Validacao

- teste de conversa em sessao ativa nos dois numeros.
- logs confirmando:
  - `should_respond=True`
  - `Stored assistant response ...`
  - `Baileys response instance=... ok=True`
- erro anterior removido:
  - `AgentService.get_response() got an unexpected keyword argument 'lead_name'`

## 6) Impacto lateralizado

- elimina falha silenciosa no atendimento e reduz falso-negativo de disponibilidade.

## 7) Risco residual

- prefixo de persona depende do texto retornado; se outros fluxos adicionarem prefixo proprio, manter validacao para evitar duplicidade.

## 8) Rollback

- restaurar arquivo anterior do webhook e rebuild do backend.

## 9) Links

- runbook/doc atualizada: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
