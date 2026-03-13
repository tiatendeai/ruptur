# Reconnect 2026-03-12

## Objetivo

Reconectar o contexto do projeto `Ruptur` apos perda parcial de contexto local e reorganizacao de pastas, preservando:

- estado tecnico recuperado
- decisoes de produto
- decisoes de arquitetura
- pendencias abertas
- referencia para retomada imediata

## Fontes usadas

- historico local do Codex em `~/.codex/history.jsonl`
- indice local de sessoes em `~/.codex/session_index.jsonl`
- sessoes locais em `~/.codex/sessions`
- repositorio recuperado em `/Users/diego/Downloads/ruptur`
- copia integra encontrada em `/Users/diego/Downloads/codex/ruptur`

## Backup bruto criado

Para seguranca e consulta pontual, foi criado um backup bruto local separado em:

- `/Users/diego/Downloads/ruptur/recovery/codex-history-raw-20260312-190810`

Conteudo copiado:

- `history.jsonl`
- `session_index.jsonl`
- `sessions/`

Observacao:

- esse backup contem historico bruto e pode incluir dados sensiveis digitados durante as sessoes

## Leitura consolidada do projeto

`Ruptur` nao e apenas um painel. O painel e o cockpit. O produto maior e uma operacao comercial automatizada, orientada por agentes e workflows, com foco em previsibilidade, qualificacao, follow-up e execucao via WhatsApp.

## Direcao de produto consolidada

- WhatsApp como canal central de operacao
- CRM e pipeline como camada de gestao
- inbox como camada de auditoria e excecao
- automacoes e workflows como motor principal
- SDR com IA como motion central
- suporte a inbound, outbound e hibrido
- grupos e comunidades como fonte de captacao e distribuicao
- leadscore, hand raise e channel health como sinais operacionais
- billing e onboarding como parte da jornada do produto

## Direcao de arquitetura consolidada

- `UAZAPI` como provider primario
- `Baileys` como redundancia e contingencia
- provider de canal deve ser detalhe interno, nao linguagem de produto
- console serve para configuracao, auditoria e excecoes
- backend serve como nucleo operacional
- schema e migrations precisam sustentar operacao multitenant e multi-instancia

## Estado tecnico recuperado

O repositiorio principal foi recuperado a partir da copia integra em:

- `/Users/diego/Downloads/codex/ruptur`

O projeto principal restaurado esta em:

- `/Users/diego/Downloads/ruptur`

Estado recuperado:

- branch: `work`
- commit: `d1abe8d`
- mensagem: `chore(supabase): add migrations, MCP config, and schema apply script`

## O que ja existia no projeto recuperado

### Backend

- API FastAPI
- rotas para `health`, `send`, `next_step`, `uazapi_instance`, `uazapi_webhook`, `crm`, `sendflow`, `growth` e `billing`
- integracao prevista com Postgres, UAZAPI e Asaas
- schema SQL e script de apply de schema

### Web

- console Next.js
- telas para `Inbox`, `Pipeline`, `Disparos`, `Conexoes`, `Sendflow`, `Metricas` e `Planos`
- estrutura de cockpit operacional ja iniciada

### Persistencia

- schema avancado em `backend/db/schema.sql`
- migration inicial em `supabase/migrations/20260312180000_ruptur_init.sql`

### Deploy

- estrutura `deploy/host2`
- Baileys
- Whisper local
- compose e arquivos de apoio

### Documentacao

- blueprint
- jornada
- governanca
- suporte
- material de referencia

## Modelo operacional que ficou claro nas conversas

- o cliente nao deve operar pensando em provider
- a operacao deve parecer una
- o sistema precisa suportar muitos chips/instancias
- o controle de instancias deve respeitar o modelo nativo da UAZAPI
- Baileys cobre lacunas e contingencia
- workflows devem assumir follow-up, reativacao, remarcacao e cadencia

## Temas centrais discutidos nas sessoes

### Canais e mensageria

- paridade funcional de Baileys com o que for essencial da UAZAPI
- envio de texto
- botao com link
- envio de midia
- publicacao de status
- conexao por QR
- suporte a audio e transcricao

### Infra

- Oracle VPS
- Docker Swarm
- Traefik
- Render
- n8n com queue/worker/orquestrador
- cron jobs
- uso pragmatico de free tier enquanto o produto amadurece

### Governanca

- POPs
- FAQs
- backlog
- debito tecnico
- regras de negocio
- documentacao continua
- possivel uso de skills/agentes para apoiar sustentacao

### Negocio

- onboarding agressivo e fluido
- cobranca recorrente
- Asaas como caminho inicial
- experiencia de checkout mais interna
- remocao de branding externo e de referencias de concorrentes no produto final

## Decisoes comportamentais de trabalho

- quando um pedido fugir da melhor direcao tecnica ou estrategica, a analise deve vir antes da implementacao
- priorizar clareza e opiniao tecnica, nao apenas obediencia mecanica
- evitar contaminar o projeto principal com experimentos paralelos sem antes separar contexto

## Estado da pasta paralela

A pasta abaixo foi mantida em espera e nao foi integrada ao projeto principal:

- `/Users/diego/Downloads/ruptur/happy-client-messager`

Ela deve ser tratada futuramente, em trilha separada.

## Recuperacao recente feita hoje

- projeto principal restaurado
- pasta paralela deixada em standby
- historico local identificado
- linha do tempo de commits revisada
- ultima implementacao identificada
- estado para preview local revisado

## Riscos abertos

- historico local contem segredos digitados em texto puro
- parte do console ainda e scaffold/MVP
- parte das integracoes depende de ambiente e credenciais reais
- preview local ainda depende de dependencias instaladas e validacao funcional

## Proximo ponto de retomada recomendado

1. consolidar este contexto como fonte unica de retomada
2. validar preview local de backend e web
3. decidir o que e scaffold e o que precisa virar implementacao operacional real
4. tratar a pasta `happy-client-messager` em trilha separada
5. rotacionar segredos expostos em historicos se isso ainda nao foi feito

## Resumo executivo

O `Ruptur` foi recuperado com sucesso no ultimo estado versionado local conhecido. A visao de produto esta clara: automacao comercial orientada por agentes, com WhatsApp, CRM, pipeline, campanhas, qualificacao e billing. A base tecnica existe e nao e apenas conceitual. O que falta agora e retomar a execucao com validacao local, fechamento operacional das integracoes e consolidacao dos workflows.
