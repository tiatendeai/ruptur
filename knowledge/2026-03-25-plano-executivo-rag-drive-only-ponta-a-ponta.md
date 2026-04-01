<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-25-plano-executivo-rag-drive-only-ponta-a-ponta.md
Não edite manualmente aqui sem promover no STATE.
-->

# Plano executivo — RAG Drive-only ponta a ponta

- sessão: `OMEGA-20260323-193628-a1b2c3d4-jarvis-001`
- data: `2026-03-25`
- escopo: sanar o pseudo-campo do RAG avançado e entregar a cadeia completa no `codex/ruptur`
- board líder: `Ruptur Delivery OS` (`PVT_kwHODOO6r84BRgVS`)

---

## 1. Veredito executivo

O pseudo-campo foi confirmado: o RAG avançado estava fragmentado entre `adk` e `automations_migrated`, sem runtime canônico ponta a ponta no `codex/ruptur`.

Para fechar o abismo, a decisão executiva desta rodada é:

1. **fonte canônica:** `Google Drive`
2. **embeddings canônicos:** `Voyage AI`
3. **storage vetorial e metadados canônicos:** `Supabase pgvector`
4. **runtime canônico de retrieval e resposta:** `codex/ruptur`
5. **`adk`:** laboratório e apoio de migração
6. **`automations_migrated`:** fonte de extração e reconciliação, não de operação
7. **conteúdo local bruto:** só sai após manifesto + quarentena reversível + cutover validado

### Fora do gate crítico da Fase 1

- `Pinecone`
- `Cohere`
- qualquer dependência que mantenha o RAG operacional fora do `ruptur`

---

## 2. Parecer do time + Conselho de Guerra

### `vOps`
- pipeline reproduzível
- owner técnico explícito
- healthcheck
- logs de ingestão, falha e reprocessamento
- rollback e replay mínimo

### `vCFO`
- custo por ingestão
- custo por reindexação
- custo por resposta recuperada
- eliminação de duplicidade local
- retenção explícita

### `vCVO`
- stack coerente com o produto
- hospedagem no tronco principal
- onboarding simples
- zero dependência escondida em satélites

### `Eggs`
- ordem executiva por fase
- dono por etapa
- bloqueio explícito
- DoD por etapa
- cutover controlado

### `IAzinha`
- caminho simples de uso
- upload/cadastro só no Drive
- erro legível quando um arquivo falhar

### `vAudit`
Só aprova com prova de:
1. ingestão real do Drive
2. vetorização canônica
3. retrieval real
4. resposta real no `ruptur`
5. telemetria
6. reversibilidade da limpeza local

---

## 3. Impedimentos e gaps que travam a entrega

1. `TASK-RAG-001` existe no `connectome/status.json`, mas sem pipeline real no core
2. drift entre stack declarada e stack encontrada
3. `drive_sync_worker.py` em `adk` ainda é protótipo com `TODO`
4. fluxo funcional mais concreto está em `automations_migrated/n8n/Fluxo de atendimento AI com rag.json`
5. contrato vetorial não está canonizado no `ruptur`
6. não há manifesto único ligando `Drive -> ingestão -> vetor -> retrieval -> resposta`
7. não há gate formal de limpeza local
8. o acervo local redundante segue enorme e fora de governança git

---

## 4. Entregas ponta a ponta

## E1 — Canonicalização da stack e contrato de dados

- backlog: `BACK-008`
- owner: `vOps + vAudit`
- saída:
  - manifesto arquitetural no `state` e no `ruptur`
  - contrato canônico de:
    - pasta(s) do Drive
    - schema de documento
    - convenção de metadados
    - tabela vetorial
    - função de busca
    - política de reindexação
- DoD:
  - uma única stack congelada
  - `adk` e `automations_migrated` reclassificados como apoio/migração

## E2 — Migração da ingestão para o tronco `ruptur`

- backlog: `BACK-014`
- owner: `vOps + vAudit`
- entrada factual:
  - folder do Drive identificado no fluxo atual
  - tabela `documents`
  - função `match_documents`
  - fluxo funcional existente no n8n
- saída:
  - worker/serviço canônico no `ruptur`
  - sincronização Drive-only
  - chunking + embeddings Voyage
  - upsert no Supabase pgvector
- DoD:
  - ingestão de arquivo real executando a partir do `ruptur`
  - log de sucesso/erro persistido

## E3 — Retrieval e resposta no runtime do produto

- backlog: `BACK-008`
- owner: `vOps + vCVO`
- saída:
  - endpoint, serviço ou trilha equivalente do `ruptur` consumindo a base vetorial canônica
  - resposta auditável usando contexto recuperado
- DoD:
  - pergunta real retorna contexto real do acervo no runtime do produto
  - sem dependência crítica de `automations_migrated`

## E4 — Observabilidade e evidência

- backlog: `BACK-008`
- owner: `vOps + vAudit`
- saída:
  - healthcheck
  - contadores mínimos de ingestão
  - rastreio de falha
  - evidência de replay/reprocessamento
- DoD:
  - gate de auditoria fechado com evidência publicada

## E5 — Cutover Drive-only e higiene local

- backlog: `BACK-017`
- owner: `vOps + vAudit`
- saída:
  - inventário final
  - manifesto de corte
  - quarentena reversível
  - remoção segura do conteúdo local redundante
- DoD:
  - remoção local só depois de prova material de que o Drive é a única fonte do acervo

---

## 5. Critérios de investigação e auditoria

### Cadeia obrigatória

`arquivo no Google Drive`  
→ `detecção/sync`  
→ `extração`  
→ `chunking`  
→ `embedding Voyage`  
→ `upsert Supabase pgvector`  
→ `retrieval no ruptur`  
→ `resposta no produto`  
→ `telemetria`  
→ `quarentena/remoção local`

### Perguntas que a auditoria precisa responder

1. qual pasta do Drive é aceita como origem canônica
2. como um arquivo entra, atualiza e sai de circulação
3. onde o documento é identificado por `file_id`, hash e versão
4. como deduplicação e reindexação funcionam
5. qual função de busca é oficial
6. como o `ruptur` prova que consultou a base certa
7. como o operador identifica falhas
8. como desfazer o cutover se algo quebrar

---

## 6. Gates obrigatórios

### Gate A — arquitetura congelada
- stack única publicada
- backlog alinhado
- board alinhado

### Gate B — runtime no tronco
- pipeline operacional existe no `ruptur`
- satélites não seguram operação crítica

### Gate C — prova ponta a ponta
- ingestão
- vetorização
- retrieval
- resposta
- telemetria

### Gate D — cutover drive-only
- inventário
- manifesto
- quarentena reversível
- remoção segura

---

## 7. Sequência executiva

1. congelar a stack canônica
2. publicar manifesto técnico
3. portar ingestão para o `ruptur`
4. conectar embeddings Voyage ao storage vetorial canônico
5. expor retrieval no runtime do produto
6. validar pergunta real com evidência
7. fechar telemetria mínima
8. inventariar o acervo local redundante
9. executar quarentena reversível
10. só então autorizar remoção local

---

## 8. GitHub Projects

Itens desta frente devem viver no board `Ruptur Delivery OS`.

Mapeamento inicial:

- `BACK-006` — governança e vínculo do board com o `state` — `PVTI_lAHODOO6r84BRgVSzgoQz_0`
- `BACK-008` — materialização do RAG canônico no `ruptur` — `PVTI_lAHODOO6r84BRgVSzgoQ0zg`
- `BACK-014` — extração/migração do fluxo crítico para o tronco — `PVTI_lAHODOO6r84BRgVSzgoQ00g`
- `BACK-017` — cutover Drive-only com higiene local — `PVTI_lAHODOO6r84BRgVSzgoQ01Q`

Os `project_item_id` reais devem ser registrados no trace desta sessão assim que criados.

---

## 9. Regra de não agressão ao acervo

**Nenhum conteúdo local do RAG será apagado nesta rodada sem:**

1. inventário fechado
2. presença confirmada no Drive
3. manifesto de corte
4. quarentena reversível
5. aceite explícito do gate final

---

## 10. Comando de guerra

O programa está liberado para execução, mas com uma trava inegociável:

**primeiro materializar o RAG canônico no `ruptur`; depois cortar o lastro local.**
