# Analise de Migracao: VPS Oracle -> Ruptur

## Objetivo

Avaliar o projeto `vps-oracle` para decidir:

- o que faz sentido absorver no `Ruptur`
- o que deve ser tratado apenas como referencia de infraestrutura
- o que pode virar caveira e sair da trilha principal

Projeto analisado:

- `/Users/diego/Downloads/codex/vps-oracle`

## Resumo executivo

O `vps-oracle` nao e um produto concorrente do `Ruptur`.

Ele e um repositiorio de infraestrutura e documentacao operacional, ainda embrionario como repositorio de codigo, mas util como fonte de:

- topologia de ambiente
- Terraform
- scripts de provisionamento
- referencia de warmup e isolamento de canais
- artefatos de apoio de infra

Ele nao deve virar base do `Ruptur`, mas pode alimentar a trilha `infra` e parte da trilha `governanca operacional`.

## Estado atual

Diagnostico:

- repositorio sem commits
- possui `.git`, mas branch `master` ainda sem historico
- contem `infra/` com Terraform
- contem `scripts/` e `ssh/`
- contem docs copiados do universo `happy-client-messager`
- contem estado local sensivel de Terraform e chave SSH

## Leitura multiespecialista

### Orchestrator

Diagnostico:

- projeto de suporte, nao projeto principal

Decisao:

- absorver apenas ativos de infraestrutura

### DevOps Engineer

Diagnostico:

- valor real em:
  - `infra/main.tf`
  - `infra/providers.tf`
  - `infra/variables.tf`
  - `infra/outputs.tf`
  - `scripts/create_vps.sh`
- risco real em:
  - `infra/terraform.tfstate`
  - `infra/terraform.tfstate.backup`
  - `infra/terraform.tfvars`
  - `ssh/ssh-key-2026-03-10.key`

Decisao:

- trazer topologia e scripts
- nao portar segredos nem estados

### Security Auditor

Diagnostico:

- projeto contem material extremamente sensivel:
  - estado Terraform
  - tfvars
  - chave privada SSH

Decisao:

- isso nao deve ser carregado para o `Ruptur`
- deve ser tratado como passivo de seguranca

### Code Archaeologist

Diagnostico:

- parte dos docs do `vps-oracle` sao reaproveitamentos do mesmo tronco de pensamento de warmup/canais
- isso reforca que o valor aqui e contextual, nao estrutural

Decisao:

- nao duplicar docs no `Ruptur`
- extrair apenas conhecimento novo de infra

## O que faz sentido trazer agora

### 1. Topologia de infra

Itens:

- Terraform base de VPS
- scripts de provisionamento
- noções de outputs e variaveis de infra

Decisao:

- **TRAZER AGORA**

Forma:

- reescrever como docs de infra do `Ruptur`
- nao copiar estados nem chaves

### 2. Estrategia de ambiente

Itens:

- mapeamento de VPS
- logica de provisionamento
- organizacao de deployment host

Decisao:

- **TRAZER AGORA**

Forma:

- transformar em documentacao e backlog de infra do `Ruptur`

### 3. Blueprint de warmup/canais

Itens:

- `docs/BLUEPRINT_WARMUP_CANAIS_v3.5.md`

Decisao:

- **NAO TRAZER COMO DOC DUPLICADO**
- apenas aproveitar como referencia conceitual ja coberta pela analise do `happy-client-messager`

## O que nao faz sentido trazer

- `terraform.tfstate`
- `terraform.tfstate.backup`
- `terraform.tfvars`
- chave privada SSH
- PDFs e referencias soltas sem valor direto de execucao
- docs de produto duplicados do `happy-client-messager`

## Classificacao final

`vps-oracle` deve ser tratado como:

- **fonte de infraestrutura**
- **nao fonte de produto**
- **nao fonte de backend principal**

## Recomendacao

Manter para extracao controlada de:

- Terraform
- scripts de provisionamento
- conhecimento de ambiente

e depois arquivar como projeto satelite encerrado.
