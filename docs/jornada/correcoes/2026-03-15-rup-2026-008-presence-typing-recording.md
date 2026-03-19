# Registro de Correcao

- `id`: RUP-2026-008
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | devops
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Nao havia feedback visual consistente de presenca durante resposta do assistente (`digitando` para texto e `gravando` para audio).

## 2) Causa raiz

As rotas de envio do gateway enviavam mensagem diretamente sem fase padrao de presenca.

## 3) Correcao aplicada

- criado wrapper `withPresence(...)` no Baileys.
- `send/text` usa `composing` antes do envio.
- `send/media` usa:
  - `recording` para `audio/ptt`
  - `composing` para demais midias.
- finalizacao com `paused` apos envio.

## 4) Comentarios tecnicos relevantes

Comentario em codigo com `RUP-2026-008` em:
- `deploy/host2/baileys/src/index.mjs`

## 5) Validacao

- disparos reais via `/send/text` em `default` e `inst-553189131980`.
- fluxo de audio validado via webhook (PTT enviado com sucesso nos dois numeros).

## 6) Impacto lateralizado

- melhora UX e previsibilidade operacional do atendimento.
- pequeno aumento de latencia intencional antes de envio (janela curta configuravel).

## 7) Risco residual

- presenca pode nao aparecer em 100% dos clientes/dispositivos por comportamento do WhatsApp cliente.

## 8) Rollback

- remover uso de `withPresence(...)` nas rotas de envio do Baileys e rebuild do servico.

## 9) Links

- runbook/doc atualizada: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
