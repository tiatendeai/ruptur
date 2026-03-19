# Backlog operacional — Fase 1

## Entrega alvo

Fechar o primeiro fluxo ponta a ponta do `Ruptur`:

- `conectar canal -> receber lead -> abrir inbox -> mover stage -> responder`

## Criterio de aceite da Fase 1

A Fase 1 e considerada aceita quando, em ambiente local de preview com banco real:

- uma entrada de webhook gera ou atualiza um lead
- a conversa e criada ou reaproveitada para o lead correto
- a mensagem recebida fica persistida e visivel na inbox
- os estagios do pipeline sao retornados pela API
- o lead pode mudar de status entre estagios pela API
- a leitura posterior confirma o novo status persistido

Observacao:

- o envio real de resposta via provider continua dependente de credenciais de canal
- portanto, nesta fase, o fluxo aceito fecha ate `mover stage`, e `responder` fica condicionado a UAZAPI configurada

## Escopo congelado

Referencia oficial:

- `docs/jornada/escopo-congelado-fase1-2026-03-12.md`

## Agora

### Produto

- Definir criterio de aceite do fluxo Fase 1.
- Congelar o que fica fora da Fase 1.
- Formalizar o cockpit alvo em quatro frentes:
  - `MyChat` estilo Chatwoot para inbox e intervencao
  - `Campanhas` estilo ManyChat/Mlabs para disparos
  - `Warmup` em kanban para aquecimento e maturacao
  - `Conexoes` para operar contas e canais ativos

### Aplicacao

- Subir preview local estavel de `backend` e `web`.
- Validar fluxo minimo de `health`, inbox e pipeline.
- Mapear quais partes do `happy-client-messager` entram agora:
  - dispatcher
  - warmup
  - healthscore
- Fortalecer `MyChat` como inbox operacional multi-conta.
- Fortalecer `Campanhas` para criacao, listagem e operacao assistida.
- Fortalecer `Warmup` com colunas e acoes de aquecimento.
- Conectar `Conexoes` ao lifecycle das instancias UAZAPI/Baileys.

### Dados

- Validar schema atual contra o fluxo Fase 1.
- Confirmar migrations e script de apply.

### Infra

- Consolidar subdominios de `ruptur.cloud` no inventario.
- Definir ambiente local e preview como baseline oficial.
- Consolidar `host2` como stack hibrida:
  - `traefik`
  - `baileys`
  - `ruptur-backend`
  - `postgres`
  - `whisper`
- Deixar `n8n`, `portainer`, `traefik`, `minio`, `typebot` e `redis` prontos em DNS para ativacao progressiva.

### Governanca

- Rotacionar segredos que apareceram em historico local.
- Manter backlog vivo por este arquivo ou por ferramenta externa quando ativada.
- Registrar tudo no GitHub Projects como fonte visivel de execucao.

## Depois

- Integrar dispatcher e warmup herdados do satelite.
- Conectar billing real com Asaas.
- Formalizar backlog externo em Notion ou GitHub Projects.
- Elevar `MyChat` para inbox estilo Chatwoot com intervencao operacional.
- Elevar `Campanhas` para operacao estilo ManyChat/Mlabs.
- Fechar deploy do backend na VPS Oracle com Traefik e dominio `ruptur.cloud`.
- Consolidar `host2` em uma unica raiz operacional.
- Sanear `.env` da VPS e rotacionar segredos reaproveitados.
- Atualizar a VPS do commit `02387cf` para o estado mais recente do projeto.
- Subir landing na raiz `ruptur.cloud` e aplicar o corte claro com `app.ruptur.cloud`.
- Preparar a camada de automacao para `n8n`, `Temporal` ou `BullMQ`.

## Bloqueado

- Ativacao real de MCPs externos sem credenciais.
- Operacao automatizada em Cloudflare sem token e zona confirmados.

## Concluido

- Recuperacao do repositorio principal
- Arquivamento dos satelites
- Consolidacao inicial de governanca
- Definicao objetiva do criterio de aceite da Fase 1
- Congelamento formal do escopo da Fase 1
- Preview local com banco real e smoke tests minimos
- Validacao de DNS e subdominios operacionais em `ruptur.cloud`
