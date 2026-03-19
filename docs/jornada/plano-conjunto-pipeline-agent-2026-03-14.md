# Plano conjunto — Pipeline Hibrido e Motor Cognitivo do Ruptur Agent

Data: 2026-03-14

## Objetivo

Executar em paralelo duas frentes complementares sem colisao:

- `frente agent/gateways`: motor cognitivo, dispatch, audio e integracoes UAZAPI/Baileys
- `frente cockpit/crm`: contexto operacional, fila, labels, assignment, views e guard rails humanos

O principio central e simples:

- o outro time constroi o `cerebro + bracos`
- esta frente aqui constroi o `contexto + cockpit + regras operacionais`

Backlog operacional desta entrega:

- `docs/jornada/backlog-conjunto-pipeline-agent-2026-03-14.md`

## Estado atual do projeto

Ja existe um loop embrionario de IA:

- webhook em `backend/app/api/uazapi_webhook.py`
- ingestao em `backend/app/services/uazapi_ingest.py`
- servico de agente em `backend/app/services/agent_service.py`

Tambem ja existem elementos operacionais no cockpit:

- labels
- assignment
- views salvas
- leitura de fila
- contexto de lead no `MyChat`

Conclusao:

- a prova de conceito existe
- a arquitetura final ainda nao esta consolidada
- precisamos evitar duplicacao e acoplamento ruim

## Risco principal se os times correrem sem fronteira

Os maiores riscos sao:

- trigger de IA espalhado entre webhook, ingest e service
- resposta salva no banco antes de confirmacao de envio
- selecao de provedor baseada no payload bruto em vez da conversa persistida
- audio/TTS entrando antes do fluxo de texto estar duravel
- frontend de conexao nascendo antes do contrato do backend estar estabilizado

## Divisao oficial de responsabilidades

### Time Agent/Gateways

Responsavel por:

- regras de elegibilidade do agente
- fila duravel de execucao do agente
- abstracao de dispatch multi-provedor
- integracao Baileys e UAZAPI
- multimodalidade: audio, STT, TTS
- proxy/backend da conexao Baileys
- persistencia de tentativas de execucao e envio

Nao deve assumir:

- definicao de fila operacional do CRM
- regras de ownership do cockpit
- views salvas
- labels do operador
- ergonomia do `MyChat`

### Time Cockpit/CRM

Responsavel por:

- fila operacional no `MyChat`
- manual override
- labels
- assignment
- views salvas
- contexto de lead e stage
- sinais que o agente deve respeitar
- observabilidade operacional no frontend

Nao deve assumir:

- engine de IA
- audio e TTS
- dispatch em provider
- logica de transcricao

### Papel do Diego

Responsavel por destravar decisoes que os times nao podem assumir sozinhos:

- modelo principal de LLM
- personas e policy de resposta
- prioridade entre texto e audio
- criterio de liberacao automatica por canal
- fallback entre UAZAPI e Baileys

## Contrato conjunto minimo

Antes de abrir mais implementacao paralela, os dois times devem convergir neste contrato:

- `lead_id`
- `conversation_id`
- `provider`
- `instance_id`
- `channel`
- `external_chat_id`
- `last_inbound_message_id`
- `manual_override`
- `paused`
- `assignee_name`
- `assignee_team`
- `labels`
- `status`
- `queue_state`

Este contrato deve ser tratado como a fronteira entre `Agent Engine` e `Cockpit`.

## Sequencia recomendada

### Fase 1 — congelar arquitetura

Objetivo:

- parar de crescer ad hoc

Entregas:

- definir contrato conjunto minimo
- decidir se a fase 1 responde so texto
- extrair o loop de IA do webhook cru
- registrar tabelas e servicos novos antes de implementar tudo

Definicao de pronto:

- contrato aceito pelos dois times
- fronteiras de arquivo e modulo definidas

### Fase 2 — durabilidade do agent loop

Objetivo:

- transformar a POC em pipeline confiavel

Entregas do time Agent/Gateways:

- `agent_dispatch_service.py`
- `provider_dispatch_service.py`
- decisor de elegibilidade unico
- persistencia de `agent_runs`
- persistencia de `dispatch_jobs`
- persistencia de `dispatch_attempts`

Definicao de pronto:

- o webhook apenas ingere
- a resposta nao depende de background task efemera

### Fase 3 — guard rails operacionais

Objetivo:

- impedir resposta automatica errada

Entregas do time Cockpit/CRM:

- pausa manual
- modo humano/manual override
- surface de queue state
- labels e assignment como contexto para o agent
- views de operacao para acompanhar conversas automatizadas

Definicao de pronto:

- o agente so responde se o estado operacional permitir

### Fase 4 — multimodalidade

Objetivo:

- adicionar audio sem desorganizar o core

Entregas do time Agent/Gateways:

- `media_service.py`
- STT
- TTS
- fluxo PTT
- cache/download confiavel de midia no Baileys

Definicao de pronto:

- audio entra como extensao do pipeline duravel, nao como excecao improvisada

### Fase 5 — cockpit de conexao e observabilidade

Objetivo:

- deixar a operacao visivel

Entregas combinadas:

- proxy backend para o gateway Baileys
- card operacional de conexao no frontend
- QR code dinamico
- reset de sessao
- estado de envio e falha visivel no cockpit

## Recomendacoes claras para o outro time

### 1. Nao continuar expandindo `uazapi_webhook.py`

Use o arquivo atual apenas como ponte temporaria.

Direcao correta:

- webhook recebe
- ingestao persiste
- evento elegivel entra na fila
- agent processa
- dispatch envia
- resultado volta para persistencia

### 2. Nao decidir provider pelo payload do momento

Persistir na conversa:

- `provider`
- `instance_id`
- `external_chat_id`

O dispatch deve sair da conversa persistida, nao do webhook recebido.

### 3. Nao marcar mensagem como enviada antes do envio real

Separar estes estados:

- gerada pelo agente
- enfileirada
- aceita para envio
- enviada
- falhou

### 4. Adiar audio automatico se o texto ainda nao estiver confiavel

Prioridade recomendada:

1. texto duravel
2. dispatch robusto
3. observabilidade
4. audio

### 5. Criar uma funcao unica de elegibilidade

Exemplo de responsabilidade:

- `is_agent_eligible(conversation_id, lead_id, inbound_message_id)`

Ela deve respeitar:

- pausa
- manual override
- fila
- labels de bloqueio
- status do lead
- regras de grupo

## Recomendacoes claras para nossa frente aqui

Esta frente deve continuar entregando:

- `manual_override`
- flags de pausa
- estados de fila
- labels e assignment
- contexto de stage
- views operacionais

Esses sinais sao insumo do motor deles.

## Como os times devem se comunicar aqui dentro do projeto

### Canal oficial dentro do repositorio

Usar estes artefatos, sempre no repo:

- `docs/jornada/plano-conjunto-pipeline-agent-2026-03-14.md`
- `docs/jornada/registro-execucao-2026-03-13.md`
- `docs/governanca/processos/orquestracao-a2a.md`
- `docs/governanca/processos/mudancas.md`

Se surgir decisao arquitetural nova, criar ou atualizar um registro dedicado em `docs/jornada/`.

### Ritual minimo de sincronizacao

Cada time deve registrar 4 coisas por ciclo:

- `o que vai mexer`
- `quais arquivos/modulos sao afetados`
- `qual contrato depende do outro time`
- `qual bloqueio precisa do Diego`

Formato sugerido:

```md
## Atualizacao — Time Agent/Gateways

- Escopo deste ciclo:
- Arquivos/modulos alvo:
- Contrato consumido:
- Contrato produzido:
- Bloqueios:
- Definicao de pronto:
```

### Regra de ouro para evitar colisao

Se dois times precisarem editar o mesmo arquivo central no mesmo ciclo, parar e redividir antes.

Arquivos centrais sensiveis neste momento:

- `backend/app/api/uazapi_webhook.py`
- `backend/app/services/uazapi_ingest.py`
- `backend/app/services/agent_service.py`
- `deploy/host2/baileys/src/index.mjs`
- `web/src/app/inbox/InboxClient.tsx`

## Como eles podem falar conosco e manter sinergia

### Fluxo recomendado

1. O outro time abre no repo um bloco curto de atualizacao do ciclo.
2. Esta frente responde no mesmo documento com impacto no cockpit/CRM.
3. Quando houver decisao de produto, o Diego fecha a definicao.
4. So entao os dois lados implementam.

### Quando acionar esta frente aqui

O outro time deve nos acionar quando:

- precisar de um novo sinal operacional para elegibilidade
- precisar de labels ou assignment no prompt
- precisar expor estado do agent no `MyChat`
- precisar de surface para pause/manual override
- precisar de definicao de queue state

### Quando esta frente deve acionar o outro time

Esta frente deve aciona-los quando:

- um novo estado operacional exigir regra no agent
- o cockpit precisar mostrar status real de dispatch
- o frontend depender de endpoint novo do gateway ou backend
- houver risco de duplicidade na persistencia de mensagens

## Como o Diego pode ajudar sem virar gargalo

O Diego deve decidir apenas os pontos de produto e politica:

- qual modelo usar primeiro
- quando o agente pode responder sozinho
- quais labels bloqueiam ou liberam automacao
- se grupos entram agora ou depois
- se audio entra na fase 1 ou fase 2

O Diego nao deve precisar arbitrar detalhe de implementacao entre modulos se o contrato estiver bem definido.

## Backlog conjunto recomendado

### Agora

- congelar contrato conjunto minimo
- extrair loop de IA do webhook cru
- criar `agent_runs`
- criar `dispatch_jobs`
- adicionar `manual_override` e `paused`
- expor estado operacional consumivel pelo agent

### Depois

- proxy Baileys
- QR code e reset de sessao no cockpit
- STT/TTS
- fallback refinado entre providers

### Bloqueado por decisao do Diego

- modelo de LLM oficial
- policy de resposta automatica
- escopo de audio na fase 1

## Definicao de exito conjunto

Teremos exito quando:

- o webhook apenas ingerir
- o agent rodar fora do request
- o dispatch for confiavel e observavel
- o cockpit mostrar o contexto certo para humano e IA
- os dois times conseguirem evoluir sem editar o mesmo nucleo ao mesmo tempo
