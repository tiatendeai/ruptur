# Portfólio de ativos — Ruptur

## Objetivo

Organizar a stack como um **portfólio de ativos** para facilitar:

- operação (quem cuida de quê)
- replicação (subir novo ambiente)
- governança (controle, rastreabilidade, risco)
- contingência (fallback rápido)

## Ativos principais

### 1) Provedor primário: UAZAPI (pago)

Papel: **WhatsApp API principal**.

Por quê: já entrega (nativo) multi-instância, conectividade, recursos e fluxo operacional.

### 2) Provedor secundário/contingência: Baileys (self-host)

Papel: **redundância** + **expansão de escopo** quando:

- uazapi indisponível/limitada
- funcionalidade específica não entregue no primário
- cenário controlado de testes (sem interromper produção)

Nota: recursos “UI-level” (ex.: botões) podem variar de renderização dependendo do WhatsApp cliente.

### 3) Ruptur API (orquestrador)

Papel:

- expor uma interface única para o produto
- decidir provedor por regra (auto)
- aplicar políticas (fallback, limites, auditoria)
- consolidar logs/observabilidade

### 4) Infra (VPS, DNS, proxy, TLS, storage)

Papel:

- roteamento (Traefik)
- TLS/ACME
- execução dos serviços

## Donos (ownership)

Defina um dono para cada ativo:

- negócio (responsável por risco/uso)
- engenharia (responsável técnico)
- operação (responsável por incidentes)

## Políticas de uso (alto nível)

- Default: `provider=auto` → tenta uazapi, faz fallback para Baileys em falha/timeout.
- Preferir “nativo” do provedor: não duplicar multi-instância, delays e controles já existentes.
- Auditoria mínima: registrar `tenant`, `instance`, `provider`, `message_id`, `timestamp`, `status`.

