# Mesa operacional — perfis virtuais, aliases e enforcement no Ruptur

**Data:** 2026-03-24  
**Status:** ativo  
**Fonte canônica:** `../../state/knowledge/2026-03-24-mesa-perfis-virtuais-governanca-e-enforcement.md`

---

## 1. Objetivo

Materializar, no tronco operacional do Ruptur, as decisões da mesa sobre:

- nomenclatura canônica dos perfis virtuais
- aliases aceitos
- backlog derivado
- impactos de API e documentação

---

## 2. Decisões refletidas no Ruptur

### Nomes canônicos

- `vCVO` é o nome canônico; `VisionCO` é alias aceito
- `vCEO` é o nome canônico; `Eggs` é alias aceito

### Compatibilidade operacional

Para não quebrar o runtime atual:

- o skill key legado continua sendo `eggs`
- o backend passa a aceitar o alias canônico `vceo`
- documentação e governança passam a preferir `vCEO`

---

## 3. Mudanças aplicadas nesta rodada

### Backend

- `POST /jarvis/ask/vceo`
- `POST /jarvis/vceo/weekly-close`
- `POST /jarvis/ask/vcontroller`
- `POST /jarvis/ask/vadminops`
- `POST /jarvis/ask/vfinops`
- `GET /jarvis/governance/telemetry`
- `GET /jarvis/governance/events`

Ambas mantêm compatibilidade com os endpoints legados:

- `POST /jarvis/ask/eggs`
- `POST /jarvis/eggs/weekly-close`

### Documentação

- `backend/README.md` normalizado para preferir `vCEO`
- aliases explícitos em docs de governança

---

## 4. Backlog derivado

- `JARVIS-AUT-011` — taxonomia canônica dos perfis virtuais
- `JARVIS-AUT-012` — gate de `não fazer`, falso positivo e aborto
- `JARVIS-AUT-013` — materialização pós-mesa
- `JARVIS-AUT-014` — gatilhos automáticos com uso ativo garantido
- `JARVIS-AUT-015` — formalização de `vController`, `vAdminOps` e `vFinOps`
- `JARVIS-AUT-016` — enforcement runtime da matriz de acionamento / no-go
- `JARVIS-AUT-017` — telemetria mínima de governança e no-go

---

## 5. Regra de operação

Nenhuma mesa estratégica deve fechar sem pelo menos um destes efeitos:

- atualização de backlog
- ajuste de regra/governança
- trace
- endpoint/alias/documentação
- item em GitHub Projects

Sem isso, a rodada fica incompleta.
