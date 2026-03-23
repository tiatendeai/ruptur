# Telemetria de sessão, skill e perfil

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Finalidade

Estruturar a observabilidade mínima para sessões do Jarvis, skills acionadas e perfis usados em missão.

---

## Campos desejados

- `session_id`
- manifestação
- perfil dominante
- skills acionadas
- duração
- bloqueios
- custo estimado quando disponível
- resultado
- decisão de handoff, suspensão ou encerramento

---

## Estado atual

A trilha ainda é parcial e distribuída entre `connectome/status.json`, artifacts de sessão e docs de capitalização.

---

## Próximo passo recomendado

Convergir a telemetria em formato estruturado ligado ao backlog `JARVIS-AUT-004` e `JARVIS-AUT-009`.
