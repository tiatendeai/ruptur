# Plano — IAzinha + Jarvis + Canais (2026-03-19)

## Objetivo

Tornar a **IAzinha funcional nos canais** e reposicionar o **Jarvis** como camada de escalacao e orquestracao, sem quebrar seguranca, tenancy e operacao multi-provider do Ruptur.

## Leitura consolidada do historico

### 2026-03-14
Ja havia sido identificado que o loop de IA estava acoplado demais ao `uazapi_webhook.py`.
A direcao correta registrada foi:

- webhook recebe
- ingestao persiste
- agente processa fora do request
- dispatch envia
- tentativas e resultados ficam auditados

Referencia:
- `docs/jornada/plano-conjunto-pipeline-agent-2026-03-14.md`

### 2026-03-15
Foram corrigidos problemas reais de ativacao, identidade WhatsApp e anti-loop.
Isso estabilizou a prova de conceito, mas **nao transformou o fluxo em runtime duravel**.

Referencia:
- `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`

### 2026-03-16
A estrategia oficial de provider foi consolidada:

- `UAZAPI` = primario do MVP
- `Baileys` = contingencia estrategica
- `Ruptur` = plano de controle acima dos dois

Referencia:
- `docs/governanca/processos/provider-strategy-uazapi-primary-baileys-contingency.md`

### 2026-03-19
A base de auth/sessao protegida e o deploy inicial na Hostinger entraram no projeto.
Isso muda a regua: o assistente nao pode mais nascer como automacao solta; ele precisa nascer compativel com identidade, tenancy, auditoria e permissao.

## Diagnostico atual

Hoje a IAzinha e o Jarvis **existem**, mas ainda nao operam como um runtime de assistente maduro.

### O que existe hoje

- persona `iazinha` e `jarvis` no `AgentService`
- ativacao/sessao em `conversations.metadata`
- webhook unificado entrando por `backend/app/api/uazapi_webhook.py`
- Baileys encaminhando eventos para o backend em formato compativel
- envio de resposta funcionando principalmente pelo caminho UAZAPI

### Onde esta o gargalo

1. **o loop cognitivo ainda mora dentro do webhook**
2. **o dispatch ainda nao e multi-provider de verdade**
3. **IAzinha ainda depende de heuristicas de sessao e self-chat**
4. **Jarvis ainda esta perto demais do canal operacional bruto**
5. **na Hostinger a API key de IA ainda nao esta provisionada**, entao o `AgentService` entra em `mirror mode`

## Decisao recomendada

### Regra principal

**IAzinha vira a porta de entrada dos canais.**

**Jarvis vira camada de escalacao, coordenacao e controle.**

Ou seja:

- cliente / lead fala primeiro com **IAzinha**
- **Jarvis** entra quando houver:
  - escalacao explicita
  - contexto institucional/estrategico
  - necessidade operacional mais sensivel
  - uso interno protegido

### O que NAO fazer

Nao continuar expandindo `uazapi_webhook.py` com mais regra de negocio.

Nao expor `Jarvis CFO`, `billing`, `ops` ou rotas privilegiadas diretamente em canal publico.

Nao acoplar o comportamento da assistente ao contrato bruto do provider.

## Arquitetura alvo

```text
UAZAPI / Baileys
        ↓
Webhook Router / Normalizer
        ↓
Conversation State + Eligibility
        ↓
Assistant Runtime
  - IAzinha (default)
  - Jarvis (escalacao)
        ↓
Dispatch Outbox
        ↓
Provider Dispatch Service
  - UAZAPI adapter
  - Baileys adapter
        ↓
Message Store + Audit + Inbox State
```

## Melhor escolha tecnica agora

### 1. Criar runtime proprio do assistente
Separar o motor do webhook em modulos novos, por exemplo:

- `assistant_runtime.py`
- `assistant_session_service.py`
- `assistant_eligibility_service.py`
- `provider_dispatch_service.py`
- `assistant_outbox_worker.py`

### 2. Usar outbox no Postgres, nao Redis agora
Para este momento do projeto, a melhor relacao risco/beneficio e:

- **Postgres + tabelas de outbox + worker simples**
- nao Redis/Celery/Kafka neste primeiro endurecimento

Motivo:

- menos moving parts na Hostinger
- converge melhor com a stack atual
- facilita auditoria, retries e rollback
- respeita a fase de consolidacao

### 3. IAzinha como assistente de canal
IAzinha deve ser o **assistente operacional de linha de frente**:

- triagem
- primeira resposta
- follow-up leve
- orientacao curta
- status
- encaminhamento para humano quando necessario

### 4. Jarvis como escalacao e control plane
Jarvis deve ficar em:

- self-chat/admin chat
- app protegida
- trilhas de missao e operacao
- escalacao contextual da IAzinha

### 5. Persistir contrato interno de transporte
A conversa precisa carregar de forma estavel:

- `provider`
- `instance_id`
- `external_chat_id`
- `transport_identity`
- `tenant_id` (na fase de tenancy)
- `manual_override`
- `paused`
- `assistant_mode`

## Modelo de responsabilidade

### IAzinha
- interface conversacional de canal
- segura, objetiva, curta
- nunca acessa CFO/billing por canal publico
- encaminha para humano ou Jarvis quando ultrapassar a policy

### Jarvis
- maestro
- cerebro de escalacao
- controle interno
- vC-level e operacao privilegiada
- nunca deve ser o bot publico solto por padrao

## Trilhas paralelas do time

### 1. orchestrator + product-owner
Definir policy:

- quando IAzinha responde
- quando escalona
- quando para e pede humano
- quando pode chamar Jarvis

### 2. backend-specialist + code-archaeologist
Extrair o loop do webhook para runtime proprio.

### 3. database-architect
Criar base duravel:

- `assistant_sessions`
- `agent_runs`
- `dispatch_jobs`
- `dispatch_attempts`
- `provider_bindings` ou colunas equivalentes na conversa

### 4. security-auditor
Garantir que:

- IAzinha e Jarvis sejam identidades de servico
- escopos sejam minimos
- CFO/billing nao vazem para canal publico
- tudo fique auditado

### 5. devops-engineer
Preparar worker de assistente na Hostinger:

- processo separado do request web
- restart policy
- logs
- healthcheck
- segredos corretos

### 6. qa-automation-engineer
Cobrir com testes:

- webhook UAZAPI → IAzinha → dispatch
- webhook Baileys → IAzinha → dispatch
- anti-loop
- manual override
- fallback UAZAPI → Baileys
- bloqueio de Jarvis/CFO em canal publico

## Prioridade real

### P0
1. provisionar `RUPTUR_OPENAI_API_KEY` na Hostinger
2. congelar crescimento de regra em `uazapi_webhook.py`
3. extrair runtime da IAzinha para servico proprio
4. criar outbox e dispatch multi-provider
5. fazer IAzinha responder texto em UAZAPI e Baileys com auditoria

### P1
1. escalacao formal IAzinha → Jarvis
2. inbox mostrar estado operacional do assistente
3. manual override duro
4. retries e failover confiaveis

### P2
1. audio/PTT duravel
2. interativos/menu
3. warmup + assistente sob a mesma policy operacional

## Definicao de pronto para “IAzinha funcional”

IAzinha so pode ser considerada funcional quando:

- recebe inbound de UAZAPI e Baileys
- responde com o provider correto da conversa
- nao depende de background task efemera do request
- registra `agent_run`
- registra `dispatch_job`
- registra sucesso/falha do envio
- respeita `manual_override` e `paused`
- nao entra em loop
- nao acessa habilidades privilegiadas fora da policy

## Veredito

A melhor solucao agora **nao** e “melhorar mais um pouco o webhook”.

A melhor solucao agora e:

> transformar a IAzinha em um runtime de assistente de canal de primeira classe,
> com Jarvis como camada de escalacao e orquestracao,
> usando outbox duravel em Postgres e dispatch multi-provider.

Esse desenho respeita o historico do projeto, o momento de seguranca/tenancy e a migracao modular para a Hostinger.
