# Consolidacao Mestra 2026-03-12

## Objetivo

Consolidar a genealogia do `Ruptur` e definir de forma objetiva:

- qual projeto e o tronco principal
- quais projetos alimentam o tronco
- quais artefatos ficam arquivados como referencia
- como o diretorio deve permanecer organizado daqui para frente

## Projeto principal

O projeto principal e unico a partir de agora e:

- `Ruptur`

Raiz:

- `/Users/diego/Downloads/ruptur`

Dominio de referencia atual:

- `ruptur.cloud`

Observacao:

- a organizacao local e a documentacao devem passar a refletir essa centralidade

## Genealogia consolidada

### 1. Ruptur

Papel:

- tronco principal
- plataforma de operacao comercial
- cockpit de CRM, pipeline, sendflow, billing, growth e workflows

### 2. Happy Client Messager

Papel:

- origem operacional
- musculatura de canais, dispatcher, warmup, healthscore, campanhas e Baileys

Destino:

- projeto satelite arquivado para extracao seletiva

### 3. VPS Oracle

Papel:

- satelite de infraestrutura
- fonte de Terraform, provisionamento e topologia

Destino:

- fonte de apoio da trilha `infra`

### 4. SDR

Papel:

- satelite de playbook e motion comercial
- fonte de workflows de referencia, jornadas e ideias de agentes

Destino:

- fonte de apoio da trilha `produto/workflows/agentes`

### 5. 0WbsZjA4yKfY.br

Papel:

- referencia historica externa
- material de inspiracao e arqueologia de origem

Destino:

- referencia arquivada, fora do nucleo

## Estrutura recomendada do workspace

### Nucleo

- `backend/`
- `web/`
- `supabase/`
- `deploy/`
- `docs/`
- `.agent/`
- `skills/`
- `experiments/`

### Arquivo e satelites

- `archive/satellites/`
- `archive/references/`
- `archive/recovery/`

## Estrutura fisica aplicada

Foram movidos para arquivo:

- `happy-client-messager` -> `archive/satellites/happy-client-messager`
- `0WbsZjA4yKfY.br` -> `archive/references/0WbsZjA4yKfY.br`
- `recovery/` -> `archive/recovery/`

## Politica de consolidacao

### Traz para o Ruptur

- codigo e regras com aderencia direta ao produto principal
- dominio operacional de campanhas, warmup, healthscore, dispatcher e lifecycle de instancias
- topologia de infra util
- playbooks e motions comerciais

### Adapta depois

- dashboards inteiros de projetos satelite
- automacoes cruas de n8n
- componentes completos de UI de outras stacks

### Arquiva

- referencias historicas pesadas
- projetos satelite fora da trilha principal
- backups brutos
- artefatos de curso e apoio sem aderencia imediata

## Regras de organizacao daqui para frente

1. Todo desenvolvimento novo acontece no `Ruptur`.
2. Nenhum projeto satelite volta para a raiz.
3. Extracao de ativos deve gerar backlog ou implementacao no `Ruptur`, nunca merge cego.
4. Segredos, estados Terraform, chaves e backups ficam fora da trilha principal e devem ser tratados como sensiveis.
5. O dominio e a linguagem de produto passam a considerar `ruptur.cloud` como referencia principal.

## Proximo passo recomendado

Montar backlog unico de consolidacao com tres grupos:

- operacao de canais
- infraestrutura e ambiente
- motions, workflows e agentes

e executar isso apenas dentro do `Ruptur`.
