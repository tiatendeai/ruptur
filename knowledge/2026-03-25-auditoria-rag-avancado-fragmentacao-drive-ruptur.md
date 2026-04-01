<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-25-auditoria-rag-avancado-fragmentacao-drive-ruptur.md
Não edite manualmente aqui sem promover no STATE.
-->

# Auditoria completa — RAG Avançado, fragmentação multi-repo e política Drive-only

**Data:** 2026-03-25  
**Hora:** 2026-03-25T00:19:01-03:00  
**Operador:** `diego`  
**Sessão:** `OMEGA-20260323-193628-a1b2c3d4-jarvis-001`  
**Status do parecer:** `auditoria concluída / saneamento ainda pendente`  
**Backlog relacionado:** `BACK-008` + `DEC-004`

---

## 1. Tese auditada

**Pseudo-campo detectado:** o “RAG Avançado (Google Drive + Voyage AI)” existe hoje mais como **intenção arquitetural e acervo disperso** do que como **capacidade ponta a ponta materializada no tronco central `codex/ruptur`**.

Conclusão direta:

- o **tronco central do `ruptur` não contém a entrega ponta a ponta**;
- os ativos estão **fragmentados** entre `../codex/adk` e `../automations_migrated`;
- parte relevante do que existe é **template**, **protótipo** ou **workflow fora do core**;
- a diretriz “**Google Drive é a fonte canônica para o RAG**” já foi decidida no `state`, mas **a higienização do conteúdo local ainda não foi executada com gate seguro**.

---

## 2. Evidências materiais auditadas

### 2.1 Tronco central `codex/ruptur`

**Evidência de intenção sem materialização completa**
- `../codex/ruptur/connectome/status.json`
  - tarefa pendente `TASK-RAG-001`
  - stack declarada: `Voyage AI + Cohere Command R+ + Supabase + Pinecone`

**Evidência de ausência no core**
- `../codex/ruptur/RAG/` contém só **2 arquivos**:
  - `conselho-de-guerra.md`
  - `jarvis_full_report_2026.md`
- **ausentes**:
  - `../codex/ruptur/RAG/CONTEXT7.md`
  - `../codex/ruptur/RAG/drive_sync_worker.py`
  - `../codex/ruptur/topology.md`
  - `../codex/ruptur/RAG/topology.md`
- busca focada em `backend/app/scripts` por `voyage|cohere|pinecone|embedding|vector|langchain|google drive` não encontrou implementação real do pipeline

**Leitura:** no `ruptur`, o RAG avançado está hoje em estado de **backlog arquitetural**, não de feature operacional integrada.

---

### 2.2 Repositório `../codex/adk`

**Há ativos fortes, mas fora do tronco**
- `../codex/adk/RAG/` tem **731 arquivos** e ~**0,33 GB**
- composição principal:
  - `443` PDFs
  - `116` arquivos `.ts`
  - `59` `.json`
  - `15` `.zip`
- existe `../codex/adk/RAG/drive_sync_worker.py`, porém está em **estado protótipo/TODO**:
  - autenticação: `TODO`
  - scan do Drive: `TODO`
  - sync para Supabase: `TODO`
- existe acervo de templates e SQLs de suporte, por exemplo:
  - `.../IA Delivery/Tabelas Supabase/documents.sql`
  - `.../🏦 Vetorizar Arquivos RAG.json`
  - múltiplos templates com `Google Drive`, `Supabase Vector Store` e `Pinecone`

**Leitura:** o `adk` concentra **pesquisa, protótipos, templates e acervo de apoio**, mas **não entrega sozinho a materialização institucional do pipeline no `ruptur`**.

---

### 2.3 Repositório `../automations_migrated`

**Concentra o workflow mais próximo do pipeline operacional, mas fora do core e fora de git**
- `../automations_migrated` **não é repositório git**
- `../automations_migrated/n8n/` tem **844 arquivos** e ~**19,2 GB**
- o workflow mais relevante é:
  - `../automations_migrated/n8n/Fluxo de atendimento AI com rag.json`
  - tamanho ~`75 KB`
  - `name = P9 | Atendimento V2`
  - `active = false`
  - `66` nós

**Esse workflow materializa um RAG? Sim, mas com outra stack:**
- `Google Drive Trigger`
- `Download File`
- `Default Data Loader`
- `Embeddings OpenAI`
- `Supabase Vector Store`
- `toolVectorStore`
- `lmChatOpenAi`
- `memoryPostgresChat`

**Parâmetros concretos identificados**
- pasta Drive observada: `13YXUVoh-WY6izgoRAM231ivwGqoIgtnj`
- tabela vetorial: `documents`
- função de busca: `match_documents`
- embedding ativo no fluxo: `text-embedding-3-small`

**Leitura:** o ativo mais próximo de “RAG funcionando” está em `automations_migrated`, mas:
- está **fora do tronco `ruptur`**;
- está **inativo**;
- usa **OpenAI + Supabase**, não `Voyage + Cohere + Pinecone`;
- vive ao lado de um grande volume de conteúdo local bruto.

---

### 2.4 Conteúdo local bruto que viola a meta Drive-only

Em `../automations_migrated/n8n/` existem **10 zips gigantes** de “Repositório do Conselho de Guerra”, incluindo blocos de ~`2,0 GB` cada.

Exemplos:
- `Repositório do Conselho de Guerra-20240711T211120Z-001.zip` ~`2,0 GB`
- `...-006.zip` ~`2,0 GB`
- `...-008.zip` ~`2,0 GB`
- `...-010.zip` ~`642 MB`

Também existe:
- `repository_new_sp_2_16.csv` ~`206,9 MB`

**Leitura:** hoje há um **habismo claro entre a decisão “Drive é canônico” e a realidade física do acervo local**.

---

## 3. Drift arquitetural confirmado

### Drift A — stack declarada ≠ stack materializada

**Declarada em `ruptur/connectome/status.json`:**
- Voyage AI
- Cohere Command R+
- Supabase
- Pinecone

**Materializada no workflow encontrado em `automations_migrated`:**
- Google Drive
- OpenAI embeddings
- OpenAI chat model
- Supabase vector store
- n8n LangChain nodes

**Resultado:** existe um **pseudo-campo semântico**: fala-se em uma stack que **não é a mesma stack do fluxo concreto localizado**.

---

### Drift B — fonte canônica decidida ≠ higiene executada

No `state` já existe:
- `DEC-004`: **Google Drive é a fonte canônica para o RAG (Abandono do LFS)**

Mas a realidade ainda contém:
- enormes blobs locais em `automations_migrated`
- acervo paralelo em `adk/RAG`
- ausência de trilha canônica no `ruptur`

**Resultado:** a decisão de governança existe, mas a topologia ainda não foi convergida.

---

### Drift C — core do produto ≠ runtime real do conhecimento

O `ruptur` deveria ser o tronco de execução.
Hoje, porém:
- o `ruptur` **não hospeda** o pipeline de ingestão/vetorização
- o `adk` hospeda **protótipos e templates**
- o `automations_migrated` hospeda o **workflow operacional mais maduro**

**Resultado:** o conhecimento operacional está fora do tronco principal.

---

## 4. Auditoria ponto a ponto da entrega esperada

| Ponto | Estado atual | Evidência | Veredito |
|---|---|---|---|
| Fonte canônica definida | existe decisão no `state` | `DEC-004` em `registry/backlog_governanca.yaml` | `parcial` |
| Ingestão via Google Drive | existe em workflow externo | `Fluxo de atendimento AI com rag.json` | `fora do core` |
| Worker institucional de sync | protótipo incompleto | `adk/RAG/drive_sync_worker.py` com `TODO` | `não entregue` |
| Vetorização | existe em workflow externo | `Embeddings OpenAI` + `Supabase Vector Store` | `fora do core` |
| Provedor de embeddings alinhado | não | fluxo usa OpenAI; backlog fala Voyage | `drift crítico` |
| Retrieval ativo no atendimento | existe só no fluxo externo | `toolVectorStore` + `Atendente` em `automations_migrated` | `fora do core` |
| Materialização no `ruptur` | não | ausência de arquivos/código RAG no core | `não entregue` |
| Telemetria / health / replay | não encontrada ponta a ponta | sem worker materializado nem healthchecks específicos | `não entregue` |
| Política de conteúdo local = Drive-only | não cumprida | zips gigantes e acervo bruto local | `não entregue` |
| Governança e reversibilidade da limpeza | existe POP, mas não executado | `playbooks/pop_quarentena_artefatos.md` | `pronto para uso, não aplicado` |

---

## 5. Impedimentos e gaps

### P0 — críticos

1. **RAG avançado não existe no tronco central do `ruptur`.**
2. **Stack declarada e stack real divergem.**
3. **Não existe owner técnico único do pipeline.**
4. **Há grande volume de conteúdo local bruto contrariando a política Drive-only.**
5. **`automations_migrated` não tem governança git.**
6. **O worker institucional de sync está só em protótipo incompleto.**

### P1 — altos

7. **Contrato de schema vetorial não está canonizado no `ruptur`.**
8. **Não há manifesto único ligando `Drive folder -> ingestão -> vetor -> retrieval -> produto`.**
9. **Não há critérios de aceite auditáveis publicados para o RAG ponta a ponta.**
10. **Não há gate formal para remoção segura do conteúdo local.**

### P2 — estruturais

11. **Conhecimento de apoio está espalhado em templates e acervos heterogêneos.**
12. **A documentação do `ruptur` referencia RAG, mas sem entregar o runtime correspondente.**
13. **A cadeia “Conselho de Guerra → indexação → retrieval → resposta” não está institucionalizada como fluxo único.**

---

## 6. Critérios de auditoria e investigação — parecer do time + conselho

### `vOps`
Critérios obrigatórios:
- fonte única de verdade definida
- pipeline reproduzível
- owner técnico
- healthcheck
- rollback
- logs de ingestão e falha

### `vCFO`
Critérios obrigatórios:
- custo por documento ingerido
- custo por reindexação
- custo por resposta recuperada
- eliminação de duplicidade de armazenamento local
- regra explícita de retenção

### `vCVO`
Critérios obrigatórios:
- stack coerente com a visão do produto
- pipeline hospedado no tronco principal
- onboarding simples do operador
- sem dependência escondida em repositórios satélites

### `Eggs / vCEO`
Critérios obrigatórios:
- plano com ordem executiva
- dono por etapa
- bloqueio explícito
- DoD por etapa
- cutover controlado

### `IAzinha`
Critérios obrigatórios:
- explicação clara para o operador
- caminho simples para upload/cadastro no Drive
- erro legível quando um documento não entra no RAG

### `vAudit` / Conselho de Guerra
Gate de aprovação só passa quando existir:
1. prova de ingestão de um arquivo real do Drive
2. prova de vetorização no storage canônico
3. prova de retrieval em pergunta real
4. prova de resposta no runtime do `ruptur`
5. prova de telemetria
6. prova de reversibilidade da limpeza local

---

## 7. Critérios canônicos de aceite para sanar o abismo

### Gate A — Canonicalização
- o `ruptur` precisa conter o pipeline oficial
- `adk` vira apoio/laboratório
- `automations_migrated` vira fonte de migração, não de operação

### Gate B — Stack única
Escolher e congelar **uma** stack oficial:
- **Opção 1:** Drive + OpenAI Embeddings + Supabase Vector
- **Opção 2:** Drive + Voyage + Pinecone + Supabase metadados

**Sem isso, não existe auditoria válida.**

### Gate C — Contrato de dados
Definir de forma canônica:
- pasta(s) Drive aceitas
- schema de documento
- tabela vetorial oficial
- função de busca oficial
- convenção de metadados
- política de reindexação

### Gate D — Runtime
- busca e resposta precisam acontecer a partir do `ruptur`
- nenhum fluxo crítico deve depender exclusivamente de repositório satélite

### Gate E — Higiene local
Antes de apagar qualquer coisa:
1. inventário
2. manifesto
3. comprovação de presença no Drive
4. checksum / listagem / rastreio
5. quarentena reversível
6. só depois remoção definitiva

---

## 8. Plano de saneamento recomendado

### Fase 1 — Congelar a verdade técnica
1. escolher a stack oficial definitiva
2. nomear owner do pipeline
3. publicar manifesto arquitetural no `ruptur`
4. declarar o schema canônico

### Fase 2 — Trazer o pipeline para o tronco
5. portar o fluxo funcional de `automations_migrated` para `codex/ruptur`
6. transformar o que hoje é template/protótipo em serviço real
7. criar healthcheck + telemetria + logs

### Fase 3 — Validar ponta a ponta
8. teste com um arquivo real do Drive
9. teste de indexação
10. teste de retrieval
11. teste de resposta no runtime do `ruptur`
12. registrar evidência auditável

### Fase 4 — Higienizar conteúdo local
13. inventariar blobs locais relevantes
14. validar que o Drive contém a cópia canônica
15. mover para quarentena reversível conforme `playbooks/pop_quarentena_artefatos.md`
16. só após o aceite final, remover do local de origem

---

## 9. Decisão operacional desta auditoria

**Decisão:** `não executar deleção destrutiva agora`.

Motivo:
- ainda não existe prova suficiente de que o pipeline canônico no `ruptur` está materializado;
- a limpeza sem quarentena/manifesto violaria o POP e aumentaria risco de perda irreversível;
- primeiro precisamos converter o pseudo-campo em capacidade real auditável.

---

## 10. Síntese final

O diagnóstico está fechado:

- o RAG avançado **não está entregue ponta a ponta no `ruptur`**;
- o que existe está **espalhado** entre `adk` e `automations_migrated`;
- o workflow mais concreto usa **Google Drive + OpenAI + Supabase**, enquanto o backlog fala em **Voyage + Cohere + Pinecone + Supabase**;
- a política **Drive-only** foi decidida, mas **a topologia local ainda a contradiz**.

**O abismo real não é só técnico. É de governança, canonização e corte de drift.**
