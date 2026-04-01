<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/registry/github_projects_sync.md
Não edite manualmente aqui sem promover no STATE.
-->

# 📊 Protocolo: Master Backlog Visual (GitHub Projects)

Este documento define como a governança do `state/registry/backlog_governanca.yaml` deve ser materializada visualmente para o Diego (CVO).

## 🧭 Diretrizes de Sincronização

1. **Fonte da Verdade**: O arquivo `backlog_governanca.yaml` no repositório `state` permanece como a autoridade canônica.
2. **Espelhamento**: Toda mudança no YAML deve disparar (manualmente ou via script futuro) uma atualização no Board de Projetos do GitHub.
3. **Colunas do Kanban**:
   - `📥 Backlog`: Ideias e dívidas técnicas (`id: BACK-XXX`).
   - `🚦 Triagem`: Itens em debate/refinamento.
   - `🏃 Em Execução`: Tarefas ativamente sendo tratadas por agentes (Mode: EXECUTION).
   - `✅ Validado`: Tarefas que passaram pelos critérios de aceite e possuem `walkthrough.md`.

## 🛠️ Procedimento de Auditoria de Backlog

Sempre que um agente iniciar uma nova sessão, ele deve:
1. Ler o `backlog_governanca.yaml`.
2. Comparar com o estado atual do Board (se acessível).
3. Reportar ao Diego qualquer "Tarefa Fantasma" (em execução mas não registrada).

## 🧬 Selo de Validação
Nenhuma tarefa deve ser movida para `✅ Validado` sem o selo **🧬🧠🦾⌬∞** e o link para o artefato de encerramento.
