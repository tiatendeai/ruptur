# Governança de TI e Ativos — Ruptur

Este diretório consolida **governança operacional** (processos, padrões, controles) para que a solução seja:

- replicável (mesmo resultado em ambientes diferentes)
- auditável (quem fez o quê, quando e por quê)
- resiliente (fallback, contingência e recuperação)
- escalável (múltiplas instâncias/chips/tenants sem caos)

## Princípios (regras do projeto)

1. **Usar o que já existe**: se o provedor entrega nativamente (ex.: multi-instância na uazapi), **não duplicar** na nossa stack.
2. **Orquestrar, não competir**: uazapi é o provedor primário; Baileys é contingência/expansão.
3. **Tudo como portfólio de ativos**: serviços, instâncias, tokens, domínios e hosts são ativos com dono, finalidade e risco.
4. **Mudanças com registro**: decisões arquiteturais em ADR; mudanças operacionais em POP/SOP; incidentes com postmortem.
5. **Segredos fora do Git**: tokens/keys nunca entram no repositório; usar `.env`/secrets manager e referenciar por nome.

## Metodologias e padrões usados (referência prática)

- **ITIL 4**: gestão de incidentes, mudanças, ativos/configuração (CMDB-lite).
- **COBIT**: governança e controles (quem aprova, quem executa, rastreabilidade).
- **SRE**: SLO/SLI, alertas, runbooks e postmortems sem culpabilização.
- **GitOps/Infra-as-Code**: configuração versionada no Git, revisão via PR, deploy reproduzível.
- **ADR (Architecture Decision Records)**: decisões arquiteturais versionadas.
- **Runbook / SOP (POP)**: procedimentos repetíveis (operação e suporte).

## Conteúdo

- `portfolio/`:
  - `portfolio-ativos.md`: mapa de ativos (uazapi, baileys, ruptur, infra) e como se relacionam
  - `capabilities-matrix.md`: capacidade por provedor e regra de roteamento (uazapi → baileys)
  - `agent-kits.md`: kits de agentes/workflows (ex.: Antigravity Kit) e como usar sem conflitar com governança
- `processos/`:
  - `mudancas.md`: fluxo mínimo de mudança (PR, revisão, deploy, rollback)
  - `incidentes.md`: fluxo mínimo de incidentes (triagem, mitigação, postmortem)
  - `segredos.md`: regras para armazenar/rotacionar segredos
- `pops/` (procedimentos operacionais padrão):
  - `pop-uazapi-nova-instancia.md`: criar/conectar instância uazapi (fluxo nativo)
  - `pop-failover-uazapi-para-baileys.md`: contingência quando uazapi falhar
- `runbooks/`:
  - `runbook-envio-mensagens.md`: checklist para envio e diagnósticos (texto/mídia/botão)
- `templates/`:
  - `ADR-template.md`, `POP-template.md`, `RUNBOOK-template.md`, `POSTMORTEM-template.md`
- `ativos/`:
  - `registry.yaml`: inventário (CMDB-lite) de hosts, domínios, provedores e instâncias

## Como usar

1. Para decisões de arquitetura: abra um ADR em `docs/governanca/templates/ADR-template.md`.
2. Para rotinas operacionais: crie/atualize um POP em `docs/governanca/pops/`.
3. Para incidentes: use `POSTMORTEM-template.md`.
4. Mantenha o inventário em `docs/governanca/ativos/registry.yaml` atualizado.
