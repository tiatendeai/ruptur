# Jarvis CFO Superpoder — Abstracao Inicial

Data: 2026-03-15

## Objetivo

Adicionar ao Jarvis um modo especializado de CFO sem quebrar o modo operacional atual.

## O que foi implementado

1. Abstracao de perfis do Jarvis:
- `ops`: foco comercial/operacional.
- `cfo`: foco financeiro pessoal/casal/empresa.

Arquivo:
- [backend/app/services/jarvis_profiles.py](/Users/diego/Downloads/ruptur/backend/app/services/jarvis_profiles.py)

2. Refatoracao do `AgentService`:
- metodo generico `get_response(...)` por perfil.
- wrappers de compatibilidade:
  - `get_jarvis_response(...)` (ops, fluxo atual)
  - `get_jarvis_cfo_response(...)` (novo)

Arquivo:
- [backend/app/services/agent_service.py](/Users/diego/Downloads/ruptur/backend/app/services/agent_service.py)

3. Runtime de skills do Jarvis (abstracao):
- registro e lookup de skills por chave
- skill `cfo` plugada no runtime

Arquivos:
- [backend/app/services/jarvis_skill_runtime.py](/Users/diego/Downloads/ruptur/backend/app/services/jarvis_skill_runtime.py)
- [backend/app/services/jarvis_cfo_skill.py](/Users/diego/Downloads/ruptur/backend/app/services/jarvis_cfo_skill.py)

4. API dedicada de Jarvis:
- `POST /jarvis/ask`
- `POST /jarvis/ask/cfo`
- `POST /jarvis/cfo/weekly-close`

Arquivo:
- [backend/app/api/jarvis.py](/Users/diego/Downloads/ruptur/backend/app/api/jarvis.py)

5. API de dados CFO para contexto real:
- `GET/POST /cfo/clients`
- `GET/POST /cfo/projects`
- `GET/POST /cfo/domains`
- `GET/POST /cfo/payables`
- `PATCH /cfo/payables/{id}/status`
- `GET/POST /cfo/receivables`
- `PATCH /cfo/receivables/{id}/status`
- `POST /cfo/weekly-close`
- `GET /cfo/overview`

Arquivo:
- [backend/app/api/cfo.py](/Users/diego/Downloads/ruptur/backend/app/api/cfo.py)

6. Registro das rotas no app principal:
- [backend/app/main.py](/Users/diego/Downloads/ruptur/backend/app/main.py:9)

## Como usar

### Modo generico (ops ou cfo)

```bash
curl -sS -X POST http://127.0.0.1:8000/jarvis/ask \
  -H "content-type: application/json" \
  -d '{
    "profile": "cfo",
    "principal_name": "Diego",
    "message": "Me mostre uma priorizacao financeira para os proximos 7 dias"
  }'
```

### Modo CFO dedicado (com contexto real via skill)

```bash
curl -sS -X POST http://127.0.0.1:8000/jarvis/ask/cfo \
  -H "content-type: application/json" \
  -d '{
    "principal_name": "Diego",
    "focus": "caixa e margem",
    "message": "Quais 3 acoes devo executar hoje para proteger caixa?"
  }'
```

### Fechamento semanal automatico (Jarvis CFO)

```bash
curl -sS -X POST http://127.0.0.1:8000/jarvis/cfo/weekly-close \
  -H "content-type: application/json" \
  -d '{
    "principal_name": "Diego",
    "include_ai_summary": true
  }'
```

## Por que isso ajuda

- Evita prompt unico gigante e misturado.
- Permite evoluir `jarvis-cfo` como modulo proprio sem quebrar `jarvis-ops`.
- Cria fronteira clara para plugar dados financeiros e regras de risco.
- Permite novas skills (ex.: fiscal, juridico, compras) sem mexer no core do Jarvis.

## Proximo passo recomendado

Criar um `finance_context_provider` dedicado para alimentar o modo CFO com:

- fluxo de caixa diario/semanal
- contas a pagar e a receber
- margem por projeto/unidade
- alertas e tarefas de fechamento
