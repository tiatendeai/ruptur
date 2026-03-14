# Backlog conjunto — Pipeline Hibrido e Motor Cognitivo do Ruptur Agent

Base:

- `docs/jornada/plano-conjunto-pipeline-agent-2026-03-14.md`
- `docs/governanca/processos/orquestracao-a2a.md`

## Entrega alvo

Fechar a primeira versao confiavel do fluxo:

- `receber webhook -> persistir conversa -> avaliar elegibilidade -> executar agente -> despachar resposta -> refletir estado no cockpit`

## Criterio de aceite da entrega

Esta entrega e considerada aceita quando:

- o webhook apenas ingere e persiste
- a decisao de responder nao fica acoplada ao request do webhook
- existe trilha persistida da execucao do agente
- existe trilha persistida do dispatch da resposta
- o cockpit consegue expor contexto operacional suficiente para bloquear ou liberar o agente
- os dois times conseguem evoluir em paralelo sem editar o mesmo nucleo no mesmo ciclo

## Regras de execucao

- todo item abaixo deve ser movido entre `Agora`, `Depois`, `Bloqueado` e `Concluido`
- cada item tem um `dono principal`
- quando um item depender do outro time, isso deve estar explicito
- bloqueio de produto/politica sobe para o Diego

## Agora

### Coordenacao

- Congelar o contrato conjunto minimo entre `Agent Engine` e `Cockpit`.
  - trilha: `governanca`
  - dono: `orchestrator`
  - dependencias: nenhuma
  - criterio de aceite: contrato documentado e aceito pelos dois times
  - risco principal: times seguirem com modelos mentais diferentes

- Abrir o registro curto de ciclo para os dois times neste proprio backlog ou em doc espelho em `docs/jornada/`.
  - trilha: `governanca`
  - dono: `orchestrator`
  - dependencias: nenhuma
  - criterio de aceite: existe um bloco de atualizacao por time por ciclo
  - risco principal: conversa solta fora do repo

### Time Agent/Gateways

- Extrair o loop de IA de `backend/app/api/uazapi_webhook.py` para um servico dedicado.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: contrato conjunto minimo
  - criterio de aceite: webhook nao concentra trigger, prompt e envio
  - risco principal: duplicidade entre webhook e service

- Criar um decisor unico de elegibilidade do agente.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: contrato conjunto minimo; sinais operacionais consumiveis
  - criterio de aceite: uma unica funcao define se o agente pode responder
  - risco principal: regra espalhada em varios modulos

- Modelar persistencia de execucao do agente.
  - trilha: `dados`
  - dono: `database-architect`
  - dependencias: decisor de elegibilidade; contrato conjunto minimo
  - criterio de aceite: desenho de `agent_runs` definido com estados e payload minimo
  - risco principal: execucao sem trilha auditavel

- Modelar persistencia de dispatch.
  - trilha: `dados`
  - dono: `database-architect`
  - dependencias: desenho do envio multi-provedor
  - criterio de aceite: desenho de `dispatch_jobs` e `dispatch_attempts` definido
  - risco principal: mensagem parecer enviada sem ter sido

- Persistir `provider`, `instance_id` e `external_chat_id` na conversa.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: schema ajustado
  - criterio de aceite: o dispatch nao depende do payload bruto do webhook
  - risco principal: roteamento errado de resposta

- Definir se a fase 1 do agent responde somente texto.
  - trilha: `produto`
  - dono: `Diego`
  - dependencias: recomendacao tecnica dos dois times
  - criterio de aceite: decisao explicita registrada
  - risco principal: audio atropelar a confiabilidade do core

### Time Cockpit/CRM

- Adicionar `manual_override` e `paused` ao modelo operacional do lead/conversa.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: contrato conjunto minimo
  - criterio de aceite: agente consegue ler esses sinais
  - risco principal: automacao responder quando humano assumiu

- Expor `queue_state` e sinais operacionais consumiveis pelo agent.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: modelo operacional do MyChat
  - criterio de aceite: API devolve estado operacional claro
  - risco principal: elegibilidade sem contexto real

- Integrar labels, assignment e stage como insumos oficiais do contexto do agente.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: endpoints e schema ja criados
  - criterio de aceite: contrato conjunto inclui esses sinais
  - risco principal: prompt pobre ou inconsistente

- Preparar surface no `MyChat` para exibir automacao, bloqueio manual e owner.
  - trilha: `aplicacao`
  - dono: `frontend-specialist`
  - dependencias: endpoints minimos definidos
  - criterio de aceite: operador ve quando a conversa pode ou nao ser automatizada
  - risco principal: automacao invisivel para o time

## Depois

### Time Agent/Gateways

- Implementar `agent_dispatch_service.py`.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: loop extraido do webhook
  - criterio de aceite: execucao do agente ocorre fora do request
  - risco principal: dependencia de background task efemera

- Implementar `provider_dispatch_service.py`.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: metadados de conversa persistidos
  - criterio de aceite: UAZAPI e Baileys ficam atras de uma abstracao unica
  - risco principal: regra duplicada por provider

- Implementar `media_service.py` com STT/TTS.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: decisao de fase sobre audio
  - criterio de aceite: audio usa servico isolado, nao logica espalhada
  - risco principal: contaminar o core de texto

- Ajustar gateway Baileys para cache de mensagens e download confiavel de midia.
  - trilha: `aplicacao`
  - dono: `backend-specialist`
  - dependencias: contrato do backend para consumo de midia
  - criterio de aceite: endpoint de midia confiavel e testavel
  - risco principal: audio sem recuperacao consistente

- Criar proxy backend para Baileys e card operacional de conexao.
  - trilha: `aplicacao`
  - dono: `backend-specialist` + `frontend-specialist`
  - dependencias: contrato do gateway congelado
  - criterio de aceite: QR code e reset de sessao via Ruptur
  - risco principal: frontend falar direto com VPS sem controle

### Time Cockpit/CRM

- Exibir estado do `agent_run` e do `dispatch_job` no `MyChat`.
  - trilha: `aplicacao`
  - dono: `frontend-specialist`
  - dependencias: tabelas e endpoints do outro time
  - criterio de aceite: operador ve o ciclo da automacao
  - risco principal: falta de observabilidade

- Criar views salvas especificas para automacao.
  - trilha: `aplicacao`
  - dono: `frontend-specialist`
  - dependencias: queue state e flags operacionais
  - criterio de aceite: views como `Responder agora`, `Pausados`, `Automatizados`
  - risco principal: operacao sem recortes uteis

- Elevar o painel de contexto para mostrar guard rails completos.
  - trilha: `aplicacao`
  - dono: `frontend-specialist`
  - dependencias: contrato final de elegibilidade
  - criterio de aceite: operador entende porque a IA responde ou nao responde
  - risco principal: troubleshooting cego

## Bloqueado

- Escolha oficial do modelo de LLM.
  - trilha: `produto`
  - dono: `Diego`
  - dependencias: recomendacao tecnica
  - criterio de aceite: modelo definido com custo e risco aceitavel
  - risco principal: implementar em cima de premissa errada

- Politica de resposta automatica por canal, grupo e persona.
  - trilha: `produto`
  - dono: `Diego`
  - dependencias: proposta dos dois times
  - criterio de aceite: regra explicita documentada
  - risco principal: automacao fora de controle

- Definicao se audio entra na fase 1 ou fase 2.
  - trilha: `produto`
  - dono: `Diego`
  - dependencias: parecer tecnico do time Agent/Gateways
  - criterio de aceite: decisao registrada
  - risco principal: abrir escopo cedo demais

## Concluido

- Loop embrionario de IA validado no webhook.
- Ingestao universal de mensagens em `leads`, `conversations` e `messages`.
- Inbox `MyChat` com labels, assignment, views salvas e leitura de fila.
- Plano conjunto multi-time documentado em `docs/jornada/plano-conjunto-pipeline-agent-2026-03-14.md`.

## Como os times devem atualizar este backlog

Em cada ciclo, cada time deve acrescentar um bloco curto como este:

```md
## Atualizacao de ciclo — Time Agent/Gateways

Data:

- Itens puxados de `Agora`:
- Arquivos/modulos alvo:
- Contrato consumido:
- Contrato produzido:
- Bloqueios para o outro time:
- Bloqueios para o Diego:
- Resultado do ciclo:
```

E o mesmo para `Time Cockpit/CRM`.

## Regra de sinergia

- se houver disputa de arquivo central, parar e redividir
- se houver duvida de produto, subir para o Diego
- se houver duvida de fronteira tecnica, registrar aqui antes de implementar
