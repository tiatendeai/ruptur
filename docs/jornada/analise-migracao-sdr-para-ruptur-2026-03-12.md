# Analise de Migracao: SDR -> Ruptur

## Objetivo

Avaliar o projeto `sdr` para decidir o que ele representa na genealogia do `Ruptur` e o que vale incorporar.

Projeto analisado:

- `/Users/diego/Downloads/codex/sdr`

## Resumo executivo

O `sdr` nao e uma aplicacao pronta.

Ele e um repositorio de:

- blueprint conceitual
- automacoes n8n
- SQLs de apoio
- referencias de fluxo comercial
- materiais de IA SDR

Ou seja:

- ele nao compete com o `Ruptur`
- ele e fonte de conhecimento de motion comercial, automacao e playbook

## Estado atual

Diagnostico:

- nao encontrei app implementado de produto
- o coracao do repositorio e documental e referencial
- o arquivo principal e `crm-ia-real-estate.md`
- ha muitos templates JSON de n8n e materiais de apoio

## Leitura multiespecialista

### Product Manager / Product Owner

Diagnostico:

- o `sdr` contem parte da origem do pensamento do `Ruptur` em relacao a:
  - qualificacao
  - enrichment
  - atendimento SDR
  - RAG
  - agendamento
  - follow-up

Decisao:

- alto valor como conhecimento de motion
- baixo valor como codigo transplantavel direto

### Backend Specialist

Diagnostico:

- os fluxos n8n mostram como o processo foi imaginado
- isso ajuda a especificar jobs, webhooks, agentes e workflows no `Ruptur`

Decisao:

- trazer os fluxos como referencia funcional
- nao portar n8n cru para o core sem revalidar arquitetura

### Database Architect

Diagnostico:

- o SQL encontrado e simples e pontual
- serve mais como rascunho historico do que como base de schema atual

Decisao:

- nao importar schema diretamente

### Code Archaeologist

Diagnostico:

- esse projeto e uma mina de intencao de negocio
- principalmente para entender o pensamento de:
  - SDR de IA
  - memoria conversacional
  - RAG
  - atendimento comercial por WhatsApp

Decisao:

- usar para reforcar backlog e regras de negocio do `Ruptur`

### DevOps / Security

Diagnostico:

- os JSONs de n8n podem conter credenciais, ids e referencias sensiveis

Decisao:

- tratar como material sensivel de automacao
- nao portar cegamente

## O que faz sentido trazer agora

### 1. Playbooks e motions de SDR

Origem:

- `crm-ia-real-estate.md`
- fluxos `IA SDR`
- templates de agendamento, follow-up, intervencao humana

Decisao:

- **TRAZER AGORA**

Forma:

- converter em backlog funcional e regras de negocio do `Ruptur`

### 2. Modelos de workflow

Origem:

- templates `n8n` de:
  - follow-up
  - agendamento
  - inbound agent
  - carrinho abandonado
  - compra aprovada
  - RAG
  - grupos WhatsApp

Decisao:

- **ADAPTAR DEPOIS**

Forma:

- usar como inspiracao para `workflows` do `Ruptur`
- nao portar automaticamente como runtime oficial

### 3. Memoria e RAG

Origem:

- fluxo com Pinecone
- Postgres chat memory
- qualificacao e contexto de atendimento

Decisao:

- **TRAZER AGORA**, em nivel conceitual

Forma:

- reforcar modelagem de memoria, contexto e playbook no `Ruptur`

## O que nao faz sentido trazer agora

- templates n8n crus como solucao final
- SQLs isolados e simplificados
- materiais de curso sem aderencia direta
- automacoes de outros dominios que desviam do escopo principal

## Classificacao final

`sdr` deve ser tratado como:

- **fonte de conhecimento de negocio**
- **fonte de playbooks e automacoes de referencia**
- **nao fonte de aplicacao principal**

## Recomendacao

Extrair do `sdr`:

- motions comerciais
- playbooks
- jornadas de follow-up
- ideias de agentes
- modelos de workflow

e consolidar isso no `Ruptur` como backlog e especificacao funcional.
