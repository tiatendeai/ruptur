# FAQ — Ruptur (WhatsApp + Operação)

## O que é o Ruptur?

Ruptur é uma solução que orquestra a operação comercial (leads, conversas, follow-up, qualificação e pipeline) usando WhatsApp e automações.

## O que é UAZAPI e Baileys? Por que existem os dois?

- **UAZAPI** é o provedor principal do MVP. Ele entrega uma estrutura mais completa de plataforma para acelerar validacao e operacao.
- **Baileys** é contingência estratégica e camada self-host. No MVP ele cobre falha, recuperacao e aprendizado; no futuro pode assumir papel maior quando estiver maduro.

## Entao a Ruptur vai depender da UAZAPI para sempre?

Nao. A estrategia e usar a UAZAPI como canal principal no MVP sem acoplar o dominio da Ruptur ao contrato dela.

Regra:

- a Ruptur continua dona de CRM, identidade, assistente, regras e failover
- a UAZAPI acelera o presente
- a Baileys prepara a autonomia futura

## Por que às vezes o “botão” não aparece?

Alguns formatos de mensagens interativas variam conforme a versão do WhatsApp e o tipo de conta/aparelho.

Regra prática: sempre enviamos **o link no texto** também, para garantir que o usuário consiga clicar mesmo sem botão.

## Mensagem “foi enviada” mas não chegou. O que fazer?

Siga o `docs/governanca/runbooks/runbook-envio-mensagens.md`.
