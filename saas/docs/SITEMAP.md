# Mapa do Site 2.0 - Ecossistema Ruptur SaaS

Este documento descreve a topologia de isolamento e a distribuição física dos componentes do SaaS Ruptur, estabilizada via Protocolo Maestro v9.

## 1. Topologia de Isolamento Determinístico

O ecossistema utiliza **Isolamento Terminal**. Se uma requisição entra em um prefixo reservado, ela é resolvida exclusivamente naquele contexto, sem fallback para a Landing Page institucional.

| Rota | Camada | Diretório Físico | Descrição Técnico-Funcional |
| :--- | :--- | :--- | :--- |
| `/` | **Landing** | `dist/` | Site institucional. Fallback global apenas para rotas não reservadas. |
| `/warmup/*` | **Manager** | `manager-dist/` | Cockpit de Aquecimento técnica. Isolamento de assets total. |
| `/state/ruptur/` | **Bridge** | (Virtual) | Iframe-Bridge com headers anti-cache para isolamento de roteamento. |
| `/state/ruptur/portal/*` | **Legacy** | `state-ruptur-dist/` | Dashboard real (Inbox/CRM) com Runtime JS Patch (v7). |

## 2. Estrutura de Assets e Segurança

- **No-Leakage Policy**: Assets requisitados sob `/state/ruptur/portal/assets/` são servidos com cabeçalhos de auditoria `X-Ruptur-Patch-Applied`.
- **Cache Control**: As pontes de entrada (`/state/ruptur/`) possuem `Cache-Control: no-cache` para garantir que o usuário sempre visualize a estrutura de isolamento mais recente.
- **Base Href Control**: Todos os SPAs possuem `<base href="...">` injetados dinamicamente para resolver caminhos relativos ao subdiretório.

## 3. Fluxo de Navegação Maestro

1. **Onboarding**: Usuário acessa `/` (Landing Page).
2. **Operação**: Botão superior redireciona para `/warmup/`.
3. **Gestão**: Acesso ao CRM/Inbox é feito via `/state/ruptur/`.

---
*Atualizado por Jarvis/Maestro em 01/04/2026*
