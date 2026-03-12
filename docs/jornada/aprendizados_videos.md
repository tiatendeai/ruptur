# Aprendizados de vídeos (aplicação no Ruptur)

Fonte primária (transcrições/notas): `docs/videos.md`.

Este arquivo traduz os pontos mais acionáveis para o **case Ruptur** (Fase 1 custo zero), com foco em: **captura de lead**, **memória de conversa**, **qualificação**, **follow-up** e **pipeline**.

## 1) O que automatizar primeiro (anti-erro comum)

**Regra:** automatizar apenas processos já comprovados.

Se não há um processo que já gera resultado nos últimos ~30 dias, automação/IA tende a amplificar o problema: você “industrializa o caos”.

No Ruptur, isso significa:

- começar por fluxos básicos de atendimento e operação comercial que já existem (mesmo que manuais);
- automatizar o que é repetível e mensurável antes de tentar “inventar demanda”.

## 2) Onde o dinheiro espera (speed-to-lead)

O maior vazamento de receita costuma estar no tempo entre:

1) o lead levantar a mão (mensagem no WhatsApp / DM), e
2) receber resposta + próximo passo (perguntas, proposta, link de agenda, follow-up).

No Ruptur, o “primeiro superpoder” é reduzir:

- **tempo da primeira resposta**;
- **tempo até o próximo passo** (ex.: agendar, mandar proposta, pedir dados, qualificar).

## 3) Framework WAIT (priorização prática)

Use o WAIT como método para decidir backlog e ordem de automação:

- **W — Walkthrough**: mapear a jornada real do cliente (como compra hoje).
- **A — Audit delays**: listar onde o lead fica esperando > 5 minutos (ou o SLA que fizer sentido).
- **I — Identify revenue impact**: priorizar atrasos pelo impacto em receita (o que mais esfria lead).
- **T — Test for repetition**: automatizar primeiro o que é “receita” (mesma sequência sempre).

Aplicação direta no Ruptur:

- primeiro automatizar triagem/qualificação e envio de “próximo passo”;
- depois automatizar follow-up e rotinas que dependem de tempo (X horas sem resposta).

## 4) Filtro de oportunidade (3 perguntas)

Antes de implementar qualquer módulo, responder:

1) **Já existe dinheiro fluindo** nesse processo (há transações/fechamentos acontecendo)?
2) **Um humano está deixando lento** (gargalo/atraso/inconsistência)?
3) **Velocidade aumenta o resultado** (responder mais rápido melhora conversão)?

Se “sim” para as 3, é candidato forte para entrar no Sprint.

## 5) Posicionamento (como vender/explicar o Ruptur)

Evitar vender “IA” como feature. Vender **resultado**:

- “reduz tempo de resposta e recupera leads que seriam perdidos”;
- “padroniza qualificação e garante follow-up”;
- “cria previsibilidade com pipeline mínimo”.

## 6) Como isso vira backlog do Ruptur (Fase 1)

Ligação com `docs/jornada/proximos_passos_fase1.md`:

- **Sprint 0 — Fundamentos**: preparar base para medir tempo e executar rotinas (schema + healthcheck + config).
- **Sprint 1 — Ingestão e memória**: capturar mensagem e persistir idempotente (pré-requisito para reduzir espera).
- **Sprint 2 — Qualificação e follow-up**: aplicar WAIT + regras para “próximo passo” e follow-up automático.

### Métricas mínimas (para provar valor)

- tempo até primeira resposta (p95);
- tempo até o próximo passo (p95);
- % leads sem próximo passo definido;
- taxa de resposta após follow-up.

## 7) Análise por vídeo (o que aproveitar no Ruptur)

### Vídeo: `https://www.youtube.com/watch?v=52BZ24-a9kQ`

Contribuições para o Ruptur:

- reforça que o “produto” inicial é **tirar o atraso humano** do funil (speed-to-lead);
- dá o **WAIT** como método objetivo para priorizar automações (evita “feature aleatória”);
- alerta para não automatizar antes de existir processo/demanda (IA não cria demanda do zero).

Como vira decisão de produto:

- o MVP do Ruptur precisa ser medido por tempo (SLA) + próximo passo, não por “IA sofisticada”.

### Vídeo: `https://www.youtube.com/watch?v=yRQBQLe4Y2Q`

Contribuições para o Ruptur:

- ferramentas são secundárias; o ganho vem do **sistema** (processo documentado + execução consistente);
- “voice → texto” e automação de mensagens reforçam a tese de UX do Ruptur (comandos simples/áudio);
- uso de “agent step” em workflow (conceito) combina com o desenho: backend (core) + automação periférica.

Como virar ação na Fase 1 (custo zero):

- padronizar entradas/saídas do core (API-first) e manter “cola” fora do core (o core precisa ser versionado e testável).

### Vídeo: `https://www.youtube.com/watch?v=ssiHUVbkRIo`

Contribuições para o Ruptur:

- documentar processos e transformar em **frameworks nomeados** (vira defensibilidade e onboarding);
- “nichar” (dobrar onde tem tração) e construir sistemas antes de escalar time;
- disciplina de foco (70/20/10): manter a maior parte do esforço no que já funciona.

Como vira decisão de execução:

- construir primeiro um fluxo completo (WhatsApp → persistência → qualificação → follow-up → pipeline) antes de expandir integrações.

### Vídeo: `https://www.youtube.com/watch?v=G9e-zMiPPRk`

Contribuições para o Ruptur:

- sinal forte de mercado: a tendência não é “assistente genérico”, e sim **agentes especialistas por função**;
- persona/role prompts abertos e modificáveis viram um ativo (você consegue versionar e adaptar por segmento);
- reforça que agentes só funcionam bem com **contexto** (processo, exemplos, regras, dados) — sem isso vira “palpite bem escrito”.

Como vira decisão de arquitetura no Ruptur:

- definir o elenco mínimo de agentes (qualificação, follow-up, agenda, relatório) e tratar prompts/specs como código (versionados).
