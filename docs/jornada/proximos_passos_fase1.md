# Próximos passos — Fase 1 (custo zero)

Este plano transforma a jornada do `ChatGPT - Ruptur` em execução prática.

## Objetivo da fase 1

Validar o núcleo do Ruptur com baixo risco e zero custo operacional fixo:

1. Capturar lead vindo de WhatsApp.
2. Salvar histórico e contexto de conversa.
3. Classificar lead com regras simples.
4. Executar follow-up automático básico.
5. Exibir pipeline mínimo para previsibilidade.

## Stack sugerida (fase 1)

- **Backend:** Python + FastAPI
- **Banco:** PostgreSQL local (Docker) durante desenvolvimento
- **Automação complementar:** n8n apenas para fluxos periféricos
- **Base de conhecimento:** Markdown + Git (este repositório)

> Regra: lógica crítica fica no backend; n8n não é o core.

## Definição de pronto do MVP

O MVP está pronto quando, de ponta a ponta:

- uma mensagem recebida gera/atualiza lead;
- a conversa fica persistida;
- o lead recebe um status de qualificação (`novo`, `contato`, `qualificado`, `desqualificado`);
- existe uma rotina de follow-up para contatos sem resposta;
- existe uma visão simples de pipeline por estágio.

<<<<<<< HEAD
## Princípios de priorização (aprendizados de vídeos)

- Priorizar “onde o dinheiro espera”: reduzir **tempo de resposta** e gargalos humanos no meio do funil (speed-to-lead).
- Automatizar apenas o que já é repetível e comprovado (processo que funciona “como receita”).
- Usar o framework **WAIT** para escolher o que entra primeiro no backlog (mapa → atrasos → impacto → repetição).

Detalhe e aplicação no Ruptur: `docs/jornada/aprendizados_videos.md`.
=======
## Critério de aceite validado até agora

Já está validado em preview local com PostgreSQL real:

- ingestão de webhook para criação/atualização de lead
- persistência de conversa e mensagem
- leitura de inbox pela API
- leitura de estágios do pipeline
- mudança de status do lead para outro estágio

Ainda depende de configuração externa para fechar totalmente:

- envio real de resposta via UAZAPI
- follow-up automático com provider real
>>>>>>> work

## Backlog priorizado

## Sprint 0 — Fundamentos

- [ ] Criar `backend/` com estrutura inicial.
- [ ] Definir schema inicial: `leads`, `conversations`, `messages`, `pipeline_events`.
- [ ] Configurar `.env.example` e settings.
- [ ] Criar endpoint healthcheck.

## Sprint 1 — Ingestão e memória

- [ ] Endpoint de webhook de entrada.
- [ ] Persistência idempotente de mensagens.
- [ ] Upsert de lead por telefone/identificador.
- [ ] Timeline de conversa por lead.

## Sprint 2 — Qualificação e follow-up

- [ ] Motor de qualificação v1 baseado em regras.
- [ ] Job de follow-up (contatos sem resposta em X horas).
- [ ] Registro de eventos de pipeline.
- [ ] Relatório básico: leads por estágio.

## Métricas mínimas da fase 1

- Tempo médio entre primeiro contato e qualificação.
- Taxa de resposta após follow-up.
- Volume semanal de leads por estágio.
- Percentual de leads sem próximo passo definido.

## Riscos e mitigação

- **Risco:** dependência excessiva de ferramentas de automação.
  - **Mitigação:** concentrar regras de negócio no backend.
- **Risco:** dados inconsistentes de conversa.
  - **Mitigação:** idempotência por `message_id` + auditoria de eventos.
- **Risco:** escopo grande demais para fase 1.
  - **Mitigação:** operar com apenas 4 estágios e regras simples.

## Próxima entrega sugerida

Implementar o **Sprint 0 completo** com código executável e migração inicial de banco.
