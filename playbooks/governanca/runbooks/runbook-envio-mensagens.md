<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/runbooks/runbook-envio-mensagens.md
Não edite manualmente aqui sem promover no STATE.
-->

# Runbook — Envio de mensagens (texto/mídia/botão)

## Sintomas comuns

- mensagem “saiu” mas não chegou
- botão não aparece
- status 502/timeout

## Diagnóstico rápido

1) Identificar provedor usado (uazapi/baileys)
2) Verificar instância conectada
   - uazapi: `/instance/status` (token)
   - baileys: `/instance/status?instance=...`
3) Confirmar destinatário/JID (principalmente BR com 9 dígitos)
4) Repetir com envio simples (texto)

## Mitigação

- Botão não renderiza:
  - enviar também a URL no corpo do texto (fallback garantido)
- uazapi falha:
  - ativar fallback para Baileys
