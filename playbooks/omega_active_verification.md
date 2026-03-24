<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/omega_active_verification.md
Não edite manualmente aqui sem promover no STATE.
-->

# PLAYBOOK OMEGA: Validação Contínua do Selo de Integridade
**Curador Executivo:** Diego
**Motor de Auditoria:** `state/scripts/omega_seal_auditor.py`

## 1. O Protocolo Anti-Fantasma
Sessões no ecossistema Ruptur não podem perder contexto, esquecer de registrar outputs ou "desacoplar" do STATE sem notificação. Para evitar sessões fantasmas ou incompletas, usamos o **Selo de OMEGA (`🧬 🧠 🦾 ⌬ ∞`)**.

## 2. A Automação Viva (O Trigger)
O script `omega_seal_auditor.py` é a ferramenta viva que escaneia o Córtex (Mente de Curto Prazo do LLM / Artifacts) e os commits.

**Gatilhos de Execução Automática Obrigatorios:**
1. **Ao finalizar qualquer debate multi-agente** (O Maestro roda o script para confirmar que todos os outputs foram salvos - indicativo `∞`).
2. **Ao executar um Git Commit no STATE** (Hook pre-commit verifica se a alteração foi gerada por um agente com selo ativo).
3. **Comando de Usuário Vivo**: Se o curador (Diego) suspeitar de lentidão ou distorção comportamental, ele pode acionar a qualquer momento via chat `/verificar-selo`, forçando o Jarvis a rodar o auditor.

## 3. O Que Acontece se a Validação Falhar? (Degradação)
Se o script retornar falha (ex: faltando `🧠` ou `∞`), o J.A.R.V.I.S. está PROIBIDO de iniciar novas tarefas ou criar novos módulos. Ele deve obrigatoriamente entrar em **Modo de Recuperação OMEGA**:

*   **Ação Mestra:** Paralisar geração de código.
*   **Ação de Capitalização:** Refazer a leitura do `jarvis_protocol.md` (resgatar `🧬 🧠`).
*   **Ação Sistêmica:** Salvar o log de backlog atual no `catalog.yaml` (resgatar `∞`).

## 4. Como Executar Manualmente
A automação vive no kernel. Para forçar um escaneamento:
```bash
python3 /Users/diego/Documents/GitHub/state/scripts/omega_seal_auditor.py
```
Se retornar verde (`✅`), o loop está perfeito. Se retornar vermelho (`❌`), a integridade está quebrada.
