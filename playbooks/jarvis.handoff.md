<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.handoff.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.handoff.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — handoff do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Quando usar

Use este playbook quando uma sessão não puder ser encerrada no mesmo ciclo e precisar ser retomada por outra sessão ou outro operador.

---

## Pacote mínimo de handoff

1. `session_id`
2. `lifecycle_stage`
3. estado operacional atual
4. artefato oficial no Omega
5. espelho operacional no repositório ativo
6. perfil de performance ativo na sessão
7. revisão mais recente das capacidades ativas / pendentes
8. fontes canônicas lidas
9. conflitos, débitos e bloqueios abertos
10. próximo passo explícito

---

## Regra

Handoff sem `session_id` materializado é incompleto.

Se a sessão ainda não existir no Omega e no repositório operacional, o estado correto é `bloqueado` ou `handoff_pendente`, nunca encerramento silencioso.

Handoff sem revisão explícita do perfil de performance também é incompleto.

Se capacidades relevantes tiverem sido ativadas, removidas ou rebaixadas durante a execução:

- isso deve aparecer no handoff
- a próxima sessão deve saber o que entra como default e o que foi desativado por contexto
