# Verificacao de deploy — Host2 — 2026-03-13

## Relatorio externo recebido

Foi reportado por outra frente que:

- houve `git push` da branch `work`
- houve clone do repo em `~/apps/ruptur-backend`
- houve copia de `.env` para a VPS
- o backend `Ruptur` foi subido com Docker Compose
- o health local retornou `200 OK`

## Verificacao feita

No `host2` (`167.234.228.71`) foi confirmado:

- existe `~/apps/ruptur-backend`
- existe `~/apps/ruptur-host2`
- o backend responde em `http://127.0.0.1:8000/health`
- os containers `backend-api-1` e `backend-db-1` estao de pe

## Divergencia operacional encontrada

### 1. Duas trilhas de deploy no mesmo host

Hoje existem duas raizes operacionais diferentes:

- `~/apps/ruptur-backend`
- `~/apps/ruptur-host2`

Isso aumenta risco de:

- confusao de ownership
- drift de configuracao
- deploy parcial em lugares diferentes

### 2. Commit da VPS nao e o ultimo do projeto

O clone operacional em `~/apps/ruptur-backend` estava em:

- `02387cf`

Enquanto o estado atual do projeto local/remoto ja avancou para:

- `0cdc468`

Conclusao:

- o backend em producao parcial nao representa o estado mais atual do `Ruptur`

### 3. `.env` da VPS precisa saneamento

Foi verificado que o `.env` no servidor contem um conjunto amplo de segredos e referencias que nao deveriam estar todos nessa unidade de deploy.

Conclusao:

- o `.env` da VPS precisa ser reduzido ao minimo necessario
- segredos expostos ou reaproveitados fora de escopo devem ser rotacionados

### 4. Banco configurado de forma inconsistente

O arquivo da VPS indica uma URL de banco que nao conversa com a topologia docker ideal da stack consolidada.

Conclusao:

- o health responde
- mas isso nao prova consistencia operacional completa do backend em producao

## Estado real neste momento

- backend local na VPS: parcialmente publicado
- stack `host2` com Baileys/Traefik/Whisper: separada
- DNS `api.ruptur.cloud` e `webhook.ruptur.cloud`: ja movidos para `host2`
- producao atual: funcional em partes, porem ainda nao consolidada

## Tasks obrigatorias de consolidacao

- escolher uma unica raiz operacional no `host2`
- atualizar a VPS para o commit mais recente do `Ruptur`
- sanear `.env` da VPS
- unificar backend + baileys + traefik na mesma topologia controlada
- garantir encaminhamento de webhook Baileys -> backend
- validar health externo via `api.ruptur.cloud`

## Decisao recomendada

Consolidar tudo em torno da stack de `host2`, evitando manter:

- um backend isolado em `~/apps/ruptur-backend`
- e outra stack paralela em `~/apps/ruptur-host2`

O correto e ter uma unica topologia viva e documentada.
