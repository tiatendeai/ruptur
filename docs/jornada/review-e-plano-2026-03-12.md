# Review e Plano 2026-03-12

## Metodo

Esta review foi sintetizada a partir do papel do `orchestrator` e das perspectivas dos agentes em:

- `/Users/diego/Downloads/ruptur/.agent/agents/orchestrator.md`
- `/Users/diego/Downloads/ruptur/.agent/agents`

Nao houve execucao autonoma real de subagentes fora deste ambiente. O que foi feito aqui e uma mesa de alinhamento orientada pelos papeis e criterios desses agentes, aplicada ao estado atual do projeto.

## Pergunta central

Onde estamos, para onde estamos indo, e quais sao os proximos passos em:

- cultura
- organizacao
- escopo
- sinergia
- alinhamento

## Leitura executiva

O `Ruptur` nao esta sem direcao. Ele esta em uma fase classica de transicao entre:

- visao forte de produto
- base tecnica inicial ja materializada
- operacao ainda sem fechamento de rotina, governanca e execucao integrada

O projeto ja tem substancia suficiente para deixar de ser tratado como exploracao pura e passar a ser tratado como programa de produto.

## Mesa da equipe

### Orchestrator

Leitura:

- existe materia-prima suficiente para coordenacao multiagente
- falta um artefato vivo de execucao que una produto, engenharia e operacao
- ha contexto forte, mas disperso entre historico, docs, planos e conversa

Recomendacao:

- estabelecer uma fonte unica de verdade de curto prazo
- separar trabalho em trilhas
- reduzir improviso operacional

### Explorer Agent

Leitura:

- o repositorio recuperado e coerente
- ha backend, web, schema, deploy e docs
- existe um segundo projeto em standby que nao deve contaminar a retomada

Recomendacao:

- manter `happy-client-messager` isolado
- seguir apenas com `ruptur` na retomada principal

### Code Archaeologist

Leitura:

- o projeto nao e legado no sentido classico, mas ja tem sinais de brownfield
- ha muita intencao espalhada em docs, historicos e scaffolds
- o risco maior nao e codigo velho, e entendimento fragmentado

Recomendacao:

- preservar contexto antes de refatorar
- nao reescrever por ansiedade
- consolidar nomenclatura, fronteiras e responsabilidades antes de ampliar escopo

### Product Manager

Leitura:

- a visao de produto esta forte
- o problema real e transformar ambicao em sequencia verificavel
- o MVP esta mais largo do que deveria para validacao rapida

Recomendacao:

- definir MVP operacional de verdade
- separar o que e:
  - obrigatorio para operar
  - importante para diferenciar
  - inspiracao futura

### Product Owner

Leitura:

- o backlog implicito ja existe
- faltam priorizacao formal e criterios de aceite
- ha risco de scope creep por excesso de frentes simultaneas

Recomendacao:

- criar backlog por trilhas
- trabalhar por ondas de entrega
- explicitar o que fica fora agora

### Backend Specialist

Leitura:

- o backend tem esqueleto relevante
- as rotas principais ja apontam a direcao correta
- ainda faltam consolidacao de contratos, regras de negocio e execucao real ponta a ponta

Recomendacao:

- estabilizar o backend como nucleo operacional
- fechar primeiro os fluxos essenciais antes de expandir automacoes

### Database Architect

Leitura:

- o schema ja saiu do rascunho
- a base esta apta para multi-entidade operacional
- ainda precisa ser validada contra os fluxos reais de uso

Recomendacao:

- tratar schema como ativo central
- validar query patterns e integridade conforme os fluxos principais

### Frontend Specialist

Leitura:

- o console ja existe como cockpit inicial
- ainda ha bastante scaffold
- o maior risco e parecer pronto visualmente sem estar operacionalmente pronto

Recomendacao:

- tratar o frontend como painel de operacao real
- priorizar fluxos com dados reais antes de sofisticacao visual

### DevOps Engineer

Leitura:

- ha direcao de deploy e canais
- falta consolidacao de ambientes, segredos, health checks e rotina de operacao
- o projeto precisa sair de "experimentos de stack" para "topologia de operacao"

Recomendacao:

- definir ambiente local, preview e producao minima
- mapear servicos, segredos, DNS e ownership

### Security Auditor

Leitura:

- o risco atual mais claro e exposicao de segredos em historico e fluxo operacional
- a superficie de ataque vai crescer rapido por envolver canais, billing, webhooks e multi-instancia

Recomendacao:

- rotacionar segredos expostos
- tratar secrets management como prioridade
- revisar auth, RLS e webhooks antes de expandir uso externo

### Test Engineer / QA

Leitura:

- ha pouca evidência de safety net consolidada
- o projeto ainda esta muito baseado em verificacao manual
- isso vai travar a velocidade em breve

Recomendacao:

- definir smoke tests minimos
- validar backend e console nos caminhos criticos

### Documentation Writer

Leitura:

- o projeto tem boa massa documental
- o problema nao e ausencia de doc, e sim falta de curadoria e hierarquia

Recomendacao:

- manter uma trilha curta de docs operacionais vivos
- evitar multiplicar documentos sem dono claro

## Diagnostico geral

### Cultura

Ponto forte:

- ambicao alta
- abertura para critica tecnica
- visao de produto acima da media

Ponto fraco:

- contexto ainda muito dependente de conversa e memoria
- impulso de abrir muitas frentes ao mesmo tempo

Direcao cultural recomendada:

- pensar em programa, nao em improviso
- decisao antes de execucao
- uma trilha principal por vez
- documentar o essencial e revisar continuamente

### Organizacao

Ponto forte:

- ja existem docs, agents, skills, plano macro e estrutura de repositorio

Ponto fraco:

- faltam:
  - backlog vivo
  - dono por trilha
  - definicao objetiva de pronto
  - separacao formal entre principal e experimental

Direcao organizacional recomendada:

- organizar por 5 trilhas:
  - produto
  - aplicacao
  - dados
  - infra
  - governanca

### Escopo

Ponto forte:

- a visao de futuro e rica e coerente

Ponto fraco:

- o escopo atual mistura:
  - MVP
  - diferenciadores
  - desejos futuros
  - necessidades de operacao interna

Direcao de escopo recomendada:

- cortar por camadas:
  - Camada 1: operar
  - Camada 2: vender
  - Camada 3: diferenciar
  - Camada 4: expandir

### Sinergia

Ponto forte:

- a ideia de UAZAPI primaria + Baileys contingencia e coerente
- backend + console + schema + deploy ja conversam conceitualmente

Ponto fraco:

- ainda ha sinergia conceitual maior que sinergia validada em execucao

Direcao de sinergia recomendada:

- integrar pelo fluxo real, nao por modulo isolado
- escolher 1 fluxo de negocio e fechar ponta a ponta

### Alinhamento

Hoje, o alinhamento correto e este:

- projeto principal: `Ruptur`
- projeto em espera: `happy-client-messager`
- objetivo atual: retomar o `Ruptur` com solidez
- objetivo tecnico imediato: preview funcional e fluxo minimo operacional
- objetivo de negocio imediato: cockpit de operacao comercial com conexao de canal, inbox, pipeline e base de billing

## Para onde estamos indo

Estamos indo para um `Ruptur` com:

- core operacional de mensageria comercial
- CRM e pipeline orientados por evento
- operacao assistida por agentes e workflows
- onboarding com ativacao rapida
- billing integrado
- governanca suficiente para escalar sem perder controle

## Proximos passos recomendados

### Fase 1: Reestabilizacao

- consolidar contexto vivo
- validar preview local
- confirmar dependencias e ambiente
- isolar de vez o que nao faz parte da trilha principal

### Fase 2: MVP operacional real

- fechar fluxo:
  - conexao de canal
  - entrada de lead
  - inbox
  - mudanca de stage
  - envio de resposta
- validar persistencia real

### Fase 3: Estrutura de crescimento

- smoke tests
- secrets hygiene
- backlog por trilha
- docs operacionais curtos

### Fase 4: Expansao

- campanhas
- sendflow
- workflows
- agentes
- melhorias de onboarding e billing

## Decisao de foco

Se a equipe tivesse que votar agora, a recomendacao consolidada seria:

1. nao misturar projetos agora
2. nao abrir novas frentes antes de fechar o fluxo minimo
3. tratar preview funcional como checkpoint imediato
4. tratar rotacao de segredos como prioridade paralela
5. transformar o plano macro em backlog executavel

## Riscos prioritarios

- segredos expostos em historicos
- excesso de escopo simultaneo
- frontend parecer mais maduro do que o backend sustenta
- operacao ainda excessivamente manual
- falta de testes minimos de regressao

## Recomendacao final da mesa

O `Ruptur` deve entrar agora em modo de consolidacao orientada a entrega. O projeto ja passou da fase de ideacao crua. A melhor decisao neste momento nao e inventar mais arquitetura, e sim provar operacionalmente o fluxo principal com disciplina de produto, dados, infra e governanca.
