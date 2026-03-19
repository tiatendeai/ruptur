# Escopo congelado — Fase 1

## Objetivo

Evitar reabertura de frentes antes de fechar o primeiro fluxo operacional do `Ruptur`.

## Entra na Fase 1

- webhook de entrada de canal
- criacao e atualizacao de lead
- persistencia de conversa
- persistencia de mensagens
- inbox com leitura das conversas
- pipeline minimo com estagios simples
- mudanca de status do lead
- preview local funcional com banco real
- backlog unificado no GitHub Projects
- governanca minima para preview, segredos e operacao

## Entra somente se nao bloquear a Fase 1

- envio real de resposta via UAZAPI
- smoke tests minimos do backend e web
- pequenos ajustes no console para refletir melhor os dados reais

## Nao entra na Fase 1

- dispatcher herdado do `happy-client-messager`
- warmup de canal
- healthscore de canal
- campanhas ricas e roteamento de grupos
- billing real com Asaas
- Cloudflare por automacao
- workflows avancados e motor completo de automacao
- multiagentes A2A reais entre servicos
- migracao ampla dos satelites
- redesign de UI alem do necessario para operacao
- realtime sofisticado
- n8n como core

## Regra de desbloqueio

A Fase 2 so abre quando:

- o fluxo `receber lead -> inbox -> mover stage` estiver estavel
- o preview local estiver reproduzivel
- o backlog ativo estiver refletindo o estado real de execucao
- segredos mais expostos tiverem plano de rotacao

## Risco evitado por este congelamento

- scope creep
- paralelismo improdutivo
- confundir diferencial futuro com requisito imediato
- misturar consolidacao de legado com fechamento do MVP operacional
