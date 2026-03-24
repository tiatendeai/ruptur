<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/continuous_telemetry.md
Não edite manualmente aqui sem promover no STATE.
-->

# PLAYBOOK: Telemetria e Auto-Revisão Contínua (OMEGA Daemon)
**Curador:** Diego
**Guardiões Executivos:** `vAudit`, `vOps-Dev`
**Ferramenta Mestra:** `state/scripts/omega_telemetry_daemon.py`

## 1. O Problema (O Risco da Passividade)
Se a revisão de progresso depender exclusivamente de o Curador (Diego) perguntar "o que falta fazer?", o sistema é reativo e perigoso. O ecossistema Ruptur deve ter capacidade de **Telemetria Ativa**. Ele mesmo deve varrer seus backlogs, logs de sessão e medir atrasos, acusando o que está pendente sem precisar ser ordenado a cada ciclo.

## 2. A Solução (Telemetria Contínua OMEGA)
O `omega_telemetry_daemon.py` atua como um inspetor autônomo.
Ele lê as matrizes lógicas (como o `backlog_governanca.yaml` e as sessões do RAG) e constrói imediatamente um Snapshot de Saúde (`telemetry_status.yaml`).

## 3. Quem Cuida Disso e Por Que Não Estavam Cuidando?
- **O Responsável**: O `vAudit` (Guardião da Qualidade) apoiado pelo `vOps-Dev` (Ferramental).
- **Por que falhou até agora?**: O `vAudit` é uma persona carregada, mas ele não tinha um *Cron Job* (um gatilho temporal). A Mente do LLM dorme quando o chat para. 
- **A Resolução**: O daemon de telemetria agora é obrigatório como parte do Hook de Fim de Sessão e de Inicialização Mestra. Toda vez que o Maestro disser "Jarvis Iniciar" ou finalizar um task_boundary pesado, a telemetria é forçada a rodar e injetar no contexto os alertas pendentes.

## 4. Integração com GitHub Projects
*Fase futura (Backlog-006):* O output de `telemetry_status.yaml` será acoplado diretamente à API do GitHub (via GitHub Actions run) para que o kanban board do Curador reflita a auto-revisão do Jarvis em tempo real (Board Sync).
