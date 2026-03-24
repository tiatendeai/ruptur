<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/omega_replay_protocol.md
Não edite manualmente aqui sem promover no STATE.
-->

# 🔄 Protocolo de Replay e Memória OMEGA

O processo OMEGA é responsável pela transição de estado efêmero (Sessão) para memória permanente (STATE). Sem o Replay, o Jarvis sofre amnésia entre execuções.

## 1. Entrada de Sessão (Initialization Replay)
Toda vez que uma nova sessão for iniciada (ou assumida por handover), o Jarvis deve:
1. Ler os últimos registros em `omega/sessions/` para entender o contexto recente.
2. Identificar quais pendências (débitos) foram deixadas pela sessão anterior em `task.md` e `implementation_plan.md`.
3. Carregar o `connectome/status.json` para saber o estado da mente colmeia.

## 2. Fase de Capitalização (Session Teardown)
Antes de encerrar a sessão (quando o usuário pedir ou o objetivo principal for concluído), o Jarvis deve executar OBRIGATORIAMENTE a Fase de Capitalização:

### A. Extração de Conhecimento (Extract Skills)
- Ferramentas, scripts ou prompts novos criados na sessão foram úteis?
- Se sim: Criar/atualizar uma Skill no `state/skills/` e indexar no `skills_index.md`.

### B. Catalogação (Update Catalog)
- Quais referências do Conselho de Guerra foram usadas?
- Garantir que as referências estejam listadas em `state/registry/catalog.yaml`.

### C. Auditoria de Desvio (Audit Drift)
- O plano original da sessão foi alterado radicalmente?
- Se sim: O `vAudit` ou o próprio Jarvis deve documentar a "Decisão Arquitetural" (ADR) no `state/decisions/` ou atualizar a topologia.

## 3. Consolidação e Desligamento
1. Consolidar o relatório final da sessão no arquivo `walkthrough.md`.
2. Fazer git commit/push do repositório `state` para garantir persistência canônica das mudanças.
3. Emitir a mensagem de shutdown confirmando que a sessão foi registrada no estado de memória permanente da máquina.
