## 🏗️ Camada de Orquestração (Swiss Watch)
**Status**: 🔵 Docker Compose (Single Host)
- **Swarm Status**: `Inactive` (Operação simplificada via Compose).
- **Gerenciamento**: Orquestração via Perfis (`core`, `edge`, `channels`, `warmup`).
- **Segurança**: Traefik unificado no projeto `ruptur-kvm2`.

---

## 🌐 Mapeamento de Ambientes & Rotas
O ecossistema utiliza múltiplos subdomínios sob o mesmo container de produção para agilidade:
- **Produção**: `app.ruptur.cloud`, `api.ruptur.cloud`.
- **Labs / Dev**: `studio.ruptur.cloud`, `lp.ruptur.cloud`.
- **QA / Homolog**: `showcase.ruptur.cloud`, `web.ruptur.cloud`.

> [!NOTE]
> Todos os ambientes herdam o certificado SSL do Traefik e o roteamento HTTPS forçado.


---

## 💻 Aplicação (Frontend & Backend)
| Componente | Container Docker | Porta Interna | URL Pública |
| :--- | :--- | :--- | :--- |
| **Frontend** | `ruptur-kvm2-ruptur-web-1` | `3000` | `app.ruptur.cloud` |
| **Backend** | `ruptur-kvm2-ruptur-backend-1` | `8000` | `api.ruptur.cloud` |
| **WhatsApp** | `ruptur-kvm2-baileys-1` | `3000` | `baileys.ruptur.cloud` |
| **Warmup** | `ruptur-kvm2-warmup-1` | `4173` | `app.ruptur.cloud/warmup` |

---

## 🗄️ Dados e Inteligência
- **Banco de Dados**: `ruptur-kvm2-ruptur-db-1` (Postgres 16) | Porta: `5432` (Isolada na rede interna).
- **Processamento**: `ruptur-kvm2-whisper-1` (Model: Base/CPU) | Utilizado pelo Baileys para transcrição.

---

## 📊 Observabilidade (Local-Only)
- **Node Exporter**: Porta `9100` (Bound to `127.0.0.1`).
- **cAdvisor**: Porta `8080` (Bound to `127.0.0.1`).

---

## 🔄 Fluxo de Dados Crítico
1. **Request**: Usuário -> HTTPS -> Traefik.
2. **Auth/UI**: Traefik -> `ruptur-web` (Login/Supabase).
3. **API**: `ruptur-web` -> `ruptur-backend` (via docker network).
4. **Webhooks**: WhatsApp (Baileys) -> `ruptur-backend:8000/webhook/uazapi`.
5. **Persistência**: `ruptur-backend` -> `ruptur-db:5432`.

---
**Status**: 🟢 Sincronizado e Blindado.
