<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/auto_intelligence_hook.md
Não edite manualmente aqui sem promover no STATE.
-->

# 🤖 Hook de Inteligência Automática (Jarvis)

Para garantir que a sabedoria do ecossistema seja usada **sem intervenção humana**, o Jarvis (Maestro) segue este protocolo de execução obrigatório:

---

## ⚡ 1. O Gatilho de Injeção (Auto-Load)

Antes de qualquer `tool_call` ou resposta ao usuário:
1.  **Análise de Intenção**: O Jarvis identifica o domínio da tarefa (Tech, Legal, Finance, Business).
2.  **Consulta ao Catálogo**: O Jarvis invoca silenciosamente o `read_file` do `state/registry/catalog.yaml`.
3.  **Injeção de Contexto**: Se a tarefa for "Disparos", o Jarvis **automaticamente** anexa as "Cartas de Princípios" da LGPD e do vOps antes de começar a pensar.

---

## 🛰️ 2. Integração via MCP (Context7)

A automação acontece no nível da infraestrutura:
- **Auto-Skill Detection**: Quando o Jarvis detecta a palavra "SaaS", ele carrega a skill `product-strategy`.
- **Pre-flight Audit**: O agente `vAudit` roda um script em background para checar se o plano de ação condiz com a literatura base. Se não condizer, ele interrompe o fluxo com um `WARNING`.

---

## 🛑 2.5. Gate obrigatório de "não fazer"

Antes de executar, o Jarvis deve responder silenciosamente a 4 perguntas:

1. **O que não deve ser feito aqui?**
2. **O erro mais caro é falso positivo ou falso negativo?**
3. **A decisão correta é seguir, bloquear, abortar ou pedir novo enquadramento?**
4. **O custo de agir é menor do que o custo de esperar mais evidência?**

Se qualquer uma dessas respostas estiver indefinida, o fluxo correto é:

- `bloqueado`, ou
- `abortado`

e nunca avanço automático para `executando`.

---

## 📜 3. Manifesto de Gatilhos (`intelligence_triggers.yaml`)

| Palavra-Chave / Contexto | Inteligência Obrigatória | Perfil Ativado |
| :--- | :--- | :--- |
| `disparo`, `broadcast`, `massa` | LGPD + Warmup Playbook | vLegal + vOps |
| `roi`, `viabilidade`, `preço` | *Principles* + *Intelligent Investor* | vCFO |
| `funcionalidade`, `saas`, `design` | *Startup Enxuta* + *Steve Jobs* | vCVO + vCEO *(alias operacional: Eggs)* |
| `bug`, `erro`, `lento` | *Clean Code* + *Pragmatic Programmer* | vOps |
| `falso positivo`, `retrabalho`, `risco`, `não fazer` | trace grading + state model + cost review | vAudit + vCFO + vOps |
| `hipótese`, `experimento`, `lean`, `discovery` | *A Startup Enxuta* + test-card logic | vCVO + vAudit + vCEO |
| `nomenclatura`, `perfil`, `backlog`, `governança` | taxonomia virtual + materialização obrigatória | vAudit + vCVO + vOps |
| `variância`, `budget`, `orçado x realizado` | matriz de controle + thresholds | vController + vCFO |
| `fila`, `handoff`, `sop`, `administrativo` | matriz operacional + anti-retrabalho | vAdminOps + vCEO + vAudit |
| `finops`, `token`, `cloud cost`, `custo de ia` | custo unitário + rollback + SLO | vFinOps + vCFO + vOps |

---

## 🧱 4. Materialização obrigatória

Toda rodada que produzir decisão durável precisa gerar pelo menos um destes artefatos:

- item novo ou atualização de **backlog**
- ajuste de **registry**
- nova **regra**, **playbook**, **runbook** ou **ADR**
- **trace** com vínculo claro
- **GitHub Project item** quando a decisão entrar em execução

Se a saída da mesa não mudar nenhum artefato, a rodada ainda não terminou.

---

## ✅ 5. Garantia de uso ativo

Um conhecimento só pode ser considerado "ativo" quando houver:

1. gatilho automático
2. dono responsável
3. métrica associada
4. trilha de uso
5. condição de desligamento

Sem isso, o conteúdo é apenas biblioteca; não é automação viva.

Referências operacionais obrigatórias desta camada:

- `playbooks/governanca/matriz-acionamento-perfis-virtuais.md`
- `playbooks/governanca/matriz-no-go-bloqueio-aborto-e-uso-ativo.md`

---

## 🚫 6. Proibição de Esquecimento

Não é opcional. Um agente que ignora o **Ritual de Ativação** é considerado em estado de "Alucinação Operacional" e deve ser reiniciado com o contexto limpo a partir do `STATE`. 

> [!IMPORTANT]
> **A regra é clara**: O conhecimento não é solicitado, ele é **condição sine qua non** para o raciocínio.
