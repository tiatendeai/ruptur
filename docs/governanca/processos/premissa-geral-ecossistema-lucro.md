# Processo — Premissa Geral do Ecossistema (Capital Fertil)

Data: 2026-03-15

## Tese unica

Todo dinheiro que sai do ecossistema deve voltar maior, em prazo definido e com dono responsavel.

Frase operacional:
- se o dinheiro sair para passear, ele precisa voltar com filhote.

## Escopo

Esta premissa vale para todo o ecossistema:
- Farm Platform
- ADK
- Ruptur
- VPS/Oracle e infraestrutura associada
- Canais (WhatsApp e provedores)
- Fluxos operados por humanos e por IAs

## Regra mestra de decisao

Nenhuma mudanca entra em producao sem classificar explicitamente o impacto economico em um destes grupos:

1. `retorno_direto`
- aumenta receita, conversao, velocidade de fechamento ou LTV.

2. `protecao_de_caixa`
- reduz risco de perda financeira (incidente, fraude, indisponibilidade, retrabalho, banimento, vazamento).

3. `custo_estrutural_obrigatorio`
- sem esta mudanca o sistema para, degrada criticamente ou viola requisito legal/compliance.

Se o item nao se enquadrar em nenhum grupo acima, ele fica fora do ciclo atual.

## Contrato economico minimo por item

Todo card, task ou mudanca precisa ter:

- `hipotese_de_valor`: qual retorno esperado
- `saida_de_caixa`: quanto custa (dinheiro, tempo, token, infra)
- `retorno_esperado`: quanto volta e por qual mecanismo
- `janela_de_retorno`: em quantos dias/semana o retorno deve aparecer
- `indicador_lider`: metrica de validacao inicial
- `indicador_financeiro`: metrica de caixa (receita, margem, custo evitado)
- `owner_economico`: quem responde pelo resultado
- `kill_date`: data de cortar se nao performar

## Implantacao no GitHub Projects

No Project principal (`Ruptur Delivery OS`), adicionar campos customizados:

- `economic_class`: `retorno_direto`, `protecao_de_caixa`, `custo_estrutural_obrigatorio`
- `cash_out_estimate`: valor estimado de saida
- `cash_in_estimate`: valor estimado de retorno
- `payback_window`: janela de retorno
- `economic_owner`: responsavel economico
- `kill_date`: data limite de corte

Regra de board:
- card sem esses campos nao entra em `In Progress`.

## Gates obrigatorios (go/no-go)

1. Gate de Sobrevivencia
- seguranca, disponibilidade, compliance e rollback minimo.

2. Gate de Efetividade
- sessao, comandos e operacao deterministica (sem automacao cega).

3. Gate de Economia
- custo por sessao/provedor/modelo medido e visivel.

4. Gate de Escala
- so escalar apos estabilidade + retorno comprovado.

## Politica de alocacao de esforco

- `70%` em itens com retorno direto ou protecao de caixa imediata
- `20%` em infraestrutura de alavancagem (automacao, observabilidade, qualidade)
- `10%` em exploracao com teto de perda e `kill_date`

## Papel dos especialistas (.agent/agents)

- `product-owner` e `product-manager`: traduzir pedido em valor economico mensuravel.
- `project-planner`: quebrar roadmap em entregas com criterio de retorno e cutoff.
- `backend-specialist`: implementar medicao de custo por sessao/provedor/modelo e guardrails de comando.
- `database-architect`: garantir trilha auditavel para `agent_runs`, `dispatch_jobs`, custo e estados.
- `security-auditor` e `penetration-tester`: prevenir perdas financeiras por falha de seguranca.
- `devops-engineer`: reduzir indisponibilidade, tempo de incidente e custo de operacao.
- `test-engineer` e `qa-automation-engineer`: evitar regressao que queima caixa e confianca.
- `performance-optimizer`: reduzir latencia/custo computacional e melhorar conversao.
- `documentation-writer`: manter trilha de decisao e operacao rastreavel.
- `orchestrator` e `explorer-agent`: coordenar e manter alinhamento entre trilhas.
- `debugger` e `code-archaeologist`: remover gargalos e divida tecnica com impacto economico.

## Mapeamento para o estado atual (2026-03-15)

Leitura consolidada de README, docs, RAG e GitHub Projects:

- Project `Ruptur Delivery OS` (Project 1): 40 itens.
  - `17 Done`
  - `4 In Progress`
  - `19 Todo` (inclui 1 card template)
- Project `@tiatendeai's Ruptur Project` (Project 2): sem itens ativos.
- Backlog conjunto do pipeline hibrido: ainda com pendencias em decisor de elegibilidade, persistencia de `agent_runs` e `dispatch`.
- Backlog do assistente MVP: foco correto em sessao/comandos/auth/fallback/custo, mas majoritariamente em aberto.

Conformidade economica validada no board:
- `in_progress_missing_contract = 0`
- `todo_missing_contract_ex_template = 0`
- `todo_missing_order = 0`

Conclusao:
- direcao esta coerente com governanca operacional;
- gargalo atual esta em transformar arquitetura em economia observavel de sessao.

## Ordem de execucao orientada a lucro

1. Fechar sessao deterministica por comando + auth challenge + reset.
2. Medir custo por sessao/provedor/modelo em tempo real.
3. Fechar persistencia operacional (`agent_runs`, `dispatch_jobs`, `dispatch_attempts`) com auditoria.
4. Ativar fallback inteligente sem perder rastreabilidade.
5. Liberar expansao de midias somente com custo e risco sob controle.

## Regra de corte

Qualquer experimento sem sinal de retorno dentro da janela definida:
- e pausado
- vira aprendizado documentado
- nao recebe novo caixa ate nova hipotese aprovada

## Definicao de sucesso

A maquina esta "dando lucro" quando:
- custo por sessao e previsivel
- taxa de resposta util cresce
- conversao comercial melhora sem elevar risco operacional
- fallback e seguranca reduzem perdas
- cada ciclo devolve mais caixa do que consome
