<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/constitution/ruptur.sources-and-queries.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/constitution/ruptur.sources-and-queries.md
Não edite manualmente aqui sem promover no STATE.
-->

# Hierarquia da Verdade, Fontes e Ordem de Consulta

**Classificação:** Constituição  
**Status:** Ativo  
**Última revisão:** 2026-03-22

---

## Regra central

Toda consulta começa pela identificação do **domínio da verdade**.  
Não existe uma hierarquia única e cega para todos os temas; existe uma ordem de consulta orientada por escopo.

---

## Domínios canônicos

### 1. Domínio canônico do STATE

O `state` é a fonte canônica para:

- governança
- identidade
- guardrails
- memória curada
- backlog de consolidação
- registries e reconciliação cross-repo

### 2. Domínio canônico do repositório dono

O repositório operacional dono do domínio é a fonte canônica para:

- código
- contratos ativos
- runtime
- deploy
- runbooks locais
- artefatos operacionais vivos

---

## Ordem de consulta

### Q1. Descobrir quem é o dono do domínio

Consultar `registry/repositories.yaml` para identificar qual repositório detém a verdade daquele escopo.

### Q2. Consultar a camada canônica correspondente

Para temas de governança, identidade ou reconciliação cross-repo, consultar primeiro:

- `README.md`
- `index.yaml`
- `constitution/`
- `registry/`
- `decisions/`

### Q3. Consultar a fonte viva do domínio operacional

Para temas de execução, consultar o repositório dono:

- código-fonte
- contratos
- documentação operacional local
- artefatos datados da operação

### Q4. Usar contextos e playbooks para orientação

`contexts/` e `playbooks/` orientam leitura e execução, mas não substituem a fonte dona do domínio.

### Q5. Usar memory e knowledge como suporte

`memory/` e `knowledge/` servem para apoio, histórico e aprendizado.  
Eles não podem sobrescrever a autoridade canônica do domínio em disputa.

### Q6. Usar fontes externas apenas com validação explícita

Fontes externas entram apenas quando a informação não puder ser confirmada internamente ou quando servirem de apoio verificável.

---

## Regras de reconciliação

- conflitos entre STATE, Ruptur e satélites devem virar decisão ou débito
- nenhuma reconciliação cross-repo deve ser feita apenas por prosa informal
- fatos voláteis devem carregar data, responsável ou referência de inspeção
- diretrizes consolidadas não devem permanecer apenas na conversa

---

## Resultado operacional

Ao terminar uma consulta, deve ficar claro:

- qual foi o domínio da verdade aplicado
- qual fonte venceu
- qual conflito permaneceu aberto
- onde esse conflito foi registrado
