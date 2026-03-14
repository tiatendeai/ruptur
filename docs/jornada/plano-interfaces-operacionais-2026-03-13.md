# Plano de interfaces operacionais — 2026-03-13

## Objetivo

Consolidar o `Ruptur` como cockpit unico de operacao comercial e mensageria, sem depender da interface nativa dos providers.

## Interfaces prioritarias

### 1. MyChat

Objetivo:

- acompanhar mensageria de WhatsApp em tempo real
- intervir manualmente quando necessario
- operar multi-conta e multi-conversa

Base de referencia:

- `Chatwoot`
- `FreeScout`
- `Zammad`

Escopo minimo:

- lista de conversas
- mensagens da conversa ativa
- contexto do lead
- status do canal
- resposta manual
- troca de status do lead

Capacidades operacionais ja incorporadas no `MyChat`:

- consolidacao de contatos por telefone
- avatar e identidade visual do contato quando o provider expoe imagem
- notas internas por contato
- fixacao de contatos prioritarios
- labels editaveis dentro do inbox
- owner e time editaveis dentro do inbox
- controle de `paused` e `manual_override` no painel lateral

Proximo salto esperado:

- preview de audio, imagem e documento
- sinais de entrega/leitura quando o contrato do provider expor isso
- composer com mais atalhos e templates de operacao

### 2. Campanhas

Objetivo:

- operar disparos e campanhas sem depender de ferramentas externas

Base de referencia:

- `ManyChat`
- `Mlabs`

Escopo minimo:

- criar campanha
- listar campanhas
- acompanhar estado
- visualizar alvo, volume e provider

### 3. Warmup

Objetivo:

- acompanhar aquecimento e maturacao de contas/canais em formato visual

Base de referencia:

- kanban operacional

Escopo minimo:

- colunas por estado
- cards por instancia
- score de maturacao
- bloqueios e alertas

### 4. Conexoes

Objetivo:

- enxergar contas conectadas por UAZAPI ou Baileys
- permitir acao operacional sem depender da interface do provider

Escopo minimo:

- status da instancia
- provider
- saude do canal
- webhook configurado
- ultimo evento conhecido

## Camadas acopladas

- `HubSpot / SaaS / WhatsApp` na origem do lead
- `WhatsApp Gateway` como camada de canais
- `UAZAPI`, `Baileys`, `Meta Cloud API` como providers
- `Instagram` e `Messenger` como extensoes futuras
- inbox omnichannel e tickets como evolucao
- `CRM Service` como nucleo da operacao
- `n8n`, `Temporal` e `BullMQ` como camada de automacao futura

## Diretriz de implementacao

- tudo deve nascer dentro do `Ruptur`
- o provider deve ser detalhe interno
- o operador deve atuar por `MyChat`, `Campanhas`, `Warmup` e `Conexoes`
- a primeira entrega funcional continua sendo o fluxo ponta a ponta da Fase 1
