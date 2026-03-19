# Registro de Correcao

- `id`: RUP-2026-010
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: frontend | devops | operacao
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Na tela de Conexoes, havia fila operacional para reconectar o numero final `9540`.
O fluxo mostrava `default` sem numero claro, QR/codigo indisponivel e dificuldade para operacao manual.

## 2) Causa raiz

Foram observados dois pontos:

1. Fluxo UI:
- para Baileys, a tela priorizava `qrcode.png` e nao usava `status.qrcode` (data URI) quando o endpoint PNG expirava/retornava 404.
- em falha parcial de fetch, a selecao podia ser perdida, prejudicando operacao.

2. Sessao Baileys da `default`:
- loop de reconexao com erro `401 conflict/device_removed` no gateway, sem gerar QR util para reconexao.

## 3) Correcao aplicada

- reset operacional da sessao `default` no Baileys com backup.
- criacao/ativacao da instancia nomeada `inst-553181139540` para o numero `9540`.
- deploy de ajustes na tela Conexoes:
  - usar `baileysStatus.qrcode` antes de cair em `qrcode.png`.
  - manter instancia selecionada quando refresh falha parcialmente.
  - inferir numero por ID da instancia (ex: `inst-553...`).
  - adicionar atalhos explicitos: `Nova instancia` e `Gerar/Atualizar QR`.

## 4) Comentarios tecnicos relevantes

Comentarios em codigo marcados com `RUP-2026-010`:
- `web/src/lib/config.ts` (fallback seguro de API em producao)
- `web/src/app/connections/ConnectionsClient.tsx` (preservacao de selecao em falhas de refresh)

## 5) Validacao

- `GET /integrations/baileys/instances` retornando:
  - `inst-553181139540` com status operacional (open/connected).
- `GET /integrations/baileys/status?instance=inst-553181139540` retornando `connected`.
- container `host2-ruptur-web-1` rebuildado/recriado com sucesso.
- codigo em servidor confirmado com:
  - `extractPhoneFromInstanceId`
  - `baileysStatus?.qrcode`
  - botao `Gerar/Atualizar QR`
  - botao `Nova instancia`

## 6) Impacto lateralizado

- operacao ganha instancia nominal para `9540` (sem dependencia exclusiva de `default`).
- reconexao por QR fica mais resiliente na UI.
- suporte e operacao comercial conseguem diagnosticar mais rapido por nome/numero.

## 7) Risco residual

- `default` ainda pode aparecer no inventario (desconectada) ate saneamento completo do parque.
- endpoint PNG pode continuar expirando; fallback por `status.qrcode` cobre esse caso na UI.

## 8) Rollback

- restaurar backups:
  - `ConnectionsClient.tsx.bak-rup-2026-010b`
  - `config.ts.bak-rup-2026-010`
- rebuild do `ruptur-web`.
- opcionalmente reverter uso da instancia nomeada e voltar para `default`.

## 9) Links

- card GitHub Project: `Fortalecer Conexoes para lifecycle de instancias`
- runbook/doc atualizada: `docs/governanca/processos/mudancas.md`
