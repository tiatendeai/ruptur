# Motions (Receita Previsível) — Ruptur

Objetivo: suportar, no mesmo produto, **inbound**, **outbound** e **híbrido** (SDR/BDR), sem engessar o time em um modelo só.

Princípio: motion é **configuração + métricas**, não “código hardcoded”.

## 1) Glossário rápido

- **Inbound (SDR):** lead chega (opt-in), resposta rápida, qualificação e agendamento.
- **Outbound (BDR):** prospecção, abordagem, follow-up e reativação.
- **Híbrido:** time/instância alterna entre inbound e outbound, com políticas de volume.
- **Levantada de mão:** sinal explícito de interesse (ex.: “quero comprar”, “quanto custa?”, “me liga”).
- **Leadscore:** prioridade do lead (0–100) baseada em sinais.
- **Healthscore do canal:** risco/qualidade da instância (conexão, erros, volumes, reputação).

## 2) Motions (catálogo v1)

### Motion A — Inbound SDR (Qualificação + próximo passo)

Gatilhos:
- `message_in` (primeiro contato)
- `hand_raise`

Ações:
- responder em até N minutos (SLA)
- coletar dados mínimos (nome, necessidade, prazo)
- classificar (novo/contato/qualificado/desqualificado)
- sugerir próximo passo (agendamento / link / humano)

KPIs:
- tempo de primeira resposta
- taxa de qualificação
- taxa de agendamento

### Motion B — Outbound BDR (Prospecção com opt-in)

Gatilhos:
- lead importado via Sendflow (ManyChat/landing/form) com consentimento

Ações:
- mensagem 1: abordagem curta + contexto
- follow-up com jitter e limites por chip
- registrar opt-out e encerrar

KPIs:
- taxa de resposta
- taxa de opt-out
- conversão para conversa ativa

### Motion C — Remarketing (Reativação)

Gatilhos:
- sem resposta em X horas/dias
- estágio parado por Y dias

Ações:
- mensagem curta de reativação
- oferecer escolha rápida (quick reply)
- se “mão levantada”: voltar para SDR (Motion A)

KPIs:
- taxa de reativação
- taxa de resposta pós-reativação

## 3) Regras essenciais (não-negociáveis)

- Opt-in e prova de consentimento (`opt_in_events`) para outbound.
- Opt-out sempre respeitado (tag/flag no lead + bloqueio em campaigns).
- Volume e delay por instância:
  - usar UAZAPI nativo quando existir
  - Baileys: fila + jitter + “pausa por risco”

## 4) Como o Ruptur implementa (MVP)

- **Sendflow** registra origem e consentimento.
- **Growth** guarda leadscore, hand raise e healthscore do canal.
- **Campaigns** controlam execuções 1:1 e para grupos.
- **Rules** roteiam leads para grupos/comunidades quando aplicável.
- **Billing (Asaas)**: checkout interno (console) + webhook atualiza status e libera recursos.
