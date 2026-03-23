<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/model-portfolio-strategy.md
Não edite manualmente aqui sem promover no STATE.
-->

# Estratégia de Portfolio de Modelos — Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23  
**Responsável:** State + Ruptur

---

## 1. Objetivo

Definir uma política de roteamento de modelos que preserve:

- qualidade para tarefas críticas
- custo compatível com a missão
- fallback previsível
- segurança para tool use e ações sensíveis

## 2. Regra-base

O ecossistema deve tratar nomes de modelo em duas camadas:

1. **classe operacional** — ex.: raciocínio alto, custo baixo, estruturado, background
2. **binding local concreto** — ex.: label configurada no ambiente (`openai-codex`, `openai-gpt-5.2`, etc.)

Assim, o portfolio continua válido mesmo quando o binding local mudar.

## 3. Classes recomendadas

### Classe A — Control plane / alta criticidade

Uso:

- decisões de coordenação
- tarefas com múltiplas dependências
- tool use sensível
- reconciliação cross-layer

### Classe B — Estruturado / avaliação

Uso:

- trace grading
- scorecards
- classificação estruturada
- geração de artefatos consistentes

### Classe C — Background / baixo custo

Uso:

- sumarizações locais
- triagem inicial
- rascunhos operacionais
- tarefas de apoio não sensíveis

## 4. Política de fallback

1. tentar o binding principal da classe adequada
2. se indisponível, usar fallback da mesma classe
3. se não houver fallback equivalente, rebaixar a tarefa ou pedir revisão humana
4. nunca rebaixar silenciosamente uma tarefa crítica para um binding inadequado

## 5. Guardrails de roteamento

- ações destrutivas ou sensíveis exigem modelo da classe A + confirmação humana quando aplicável
- trace grading e avaliação contínua devem usar configurações estáveis e comparáveis
- mudanças no binding padrão devem ser registradas em trilha documental
- custo não deve vencer governança em tarefas de alto risco

## 6. Revisão

Revisar o portfolio quando houver:

- mudança relevante no catálogo disponível
- regressão de qualidade
- aumento de custo sem ganho proporcional
- nova frente operacional exigindo outro perfil

## 7. Resultado esperado

O ecossistema deixa de escolher modelos por impulso e passa a escolher por classe, risco, custo e evidência.
