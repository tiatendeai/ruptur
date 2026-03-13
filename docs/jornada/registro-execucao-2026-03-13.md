# Registro de execucao — 2026-03-13

## Objetivo

Consolidar o que ja foi feito, o que esta em andamento e o que entrou como frente urgente de entrega dentro do `Ruptur`.

## Entregas concluidas

- recuperacao do repositorio principal e consolidacao do tronco `Ruptur`
- isolamento e arquivamento dos projetos satelite
- backup bruto do historico local do Codex
- reconnect documental e consolidacao de contexto
- governanca minima (`ativos`, `POPs`, `runbooks`, `A2A`, `MCP`)
- backlog operacional da Fase 1
- GitHub Projects conectado e usado como backlog visual
- preview local funcional de backend e web
- PostgreSQL local instalado e schema aplicado
- validacao ponta a ponta do fluxo:
  - webhook
  - lead
  - conversa
  - mensagem
  - pipeline
  - mudanca de status
- smoke tests minimos do backend
- validacao da zona Cloudflare `ruptur.cloud`
- criacao dos subdominios:
  - `app`
  - `n8n`
  - `portainer`
  - `traefik`
  - `minio`
  - `typebot`
  - `redis`
- primeira camada de cockpit no web:
  - `MyChat`
  - `Campanhas`
  - `Conexoes`
  - `Warmup`

## Em andamento

- rotacao de segredos expostos em historico local e sessao operacional
- consolidacao da topologia de deploy real
- alinhamento entre o dominio antigo `statuspersianas.com.br` e o dominio canonico `ruptur.cloud`

## Frentes urgentes abertas

### Interfaces

- elevar `MyChat` para um inbox estilo Chatwoot, com:
  - visao de contas conectadas
  - filtros por status
  - intervencao rapida
  - leitura operacional mais forte
- elevar `Campanhas` para um painel estilo Mlabs/ManyChat
- transformar `Warmup` em operacao real de aquecimento e maturacao
- aproximar `Pipeline` de uma visao de kanban operacional

### Automacao

- plugar fila e motor de automacao:
  - `n8n`
  - `Temporal`
  - `BullMQ`
- manter automacao como camada, nao como core

### Deploy

- publicar backend `Ruptur` na VPS
- alinhar Traefik com `ruptur.cloud`
- decidir o host definitivo do backend e do console

## Estado real da VPS encontrado

### Host2

- IP: `167.234.228.71`
- acesso SSH: ok com usuario `ubuntu`
- stack viva:
  - `traefik`
  - `baileys`
  - `whisper`
- caminho atual:
  - `~/apps/ruptur-host2/host2`

### Baileys

- em producao no container `host2-baileys-1`
- atualmente roteado em `baileys.statuspersianas.com.br`
- precisa ser alinhado para `baileys.ruptur.cloud`

### Host1

- IP inventariado: `129.148.17.85`
- acesso SSH nao disponivel nesta sessao
- portanto, nao ha como prometer deploy produtivo nele agora

## Divergencia tecnica identificada

O resumo operacional da VPS indicava que `backend/docker-compose.yml` ja subia app + banco.

O arquivo real do repositório ainda nao faz isso. Hoje ele sobe apenas o Postgres.

Conclusao:

- o deploy do backend precisa ser fechado de verdade antes de ser considerado pronto para producao

## Proxima acao recomendada

1. fechar o deploy do backend no `host2`
2. alinhar `baileys.statuspersianas.com.br` -> `baileys.ruptur.cloud`
3. publicar a camada de API do `Ruptur`
4. depois decidir o deploy do console em `app.ruptur.cloud`
