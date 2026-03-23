<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/multi-agent-debate.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook: Multiagentes em Debate (Estilo Orchestrator/Maestro)

**Classificação:** Playbook de Arquitetura Cognitiva
**Origem de R&D:** `ruptur-prompts/MULTIAGENTES EM DEBATE/Multiagentes em debate.txt`
**Status:** Validado e Ativo

---

## 🎯 Objetivo

Resolver problemas de alta complexidade em desenvolvimento ou pesquisa forçando "N" agentes autônomos e independentes a iterarem em paralelo e compartilharem estados de memória em rodadas controladas, permitindo a evolução da qualidade da saída.

## 🔁 Mecânica Central (O Padrão)

Este playbook utiliza a estrutura de "Placeholders" e "Iteração Refletiva".

1. O **Agente Gerente** ou Orchestrador local (ex. `orchestrator` do `ruptur`) identifica o problema.
2. É definida a quantidade de **N agentes independentes** e **R rodadas de debate**.
3. O problema é instanciado e delegado simultaneamente.
4. **Alocação na Memória (O truque do Placeholder):**
   - Cria-se variáveis ou blocos limitados nominados (Ex. `{Agente1: "Solução X"}` até `{AgenteN}`).
5. **A Pausa Inter-Rodada:**
   - Antes do merge de código ou output para o usuário, obrigatoriamente os agentes paralisam.
   - Os agentes são instruídos a **LÊER** a resposta provisória depositada em `{Agente2}` a `{AgenteN}`.
6. **Contraditório e Atualização (Reflexão em Si):**
   - Agente 1 compara a sua visão com a visão do Agente 2 e Agente 3. Se uma abordagem paralela resolver gargalos ignorados por ele, o próprio Agente atualiza o seu Output final em `{Agente1}`.
7. O loop repete até o fim das rodadas R, submetendo a resposta consolidada ou dando o veredito por unanimidade.

## ⚠️ Condições Estritas

- Este Playbook **não** substitui o raciocínio simples se linear for mais barato e testável.
- Multiagentes em debate custam context window e chamadas lentas de IA. Utilize apenas para **Design Architecture**, **Auditorias de Segurança Red Team** ou **Refatorações Legado de Alta Complexidade**.
