# Bootstrap Session Report: 2026-03-20

## 🎯 Objetivo Alcançado
Hotfix crítico em produção (KVM2) e Auditoria de "Saneamento Total" (Relógio Suíço).

## 🚀 Entregáveis e Correções
1. **Autenticação (Supabase):**
   - Implementado login em 2 etapas (E-mail -> Senha).
   - Corrigido erro de redirecionamento para `localhost` (Dino Game). A causa raiz era o uso de `requestUrl.origin` no callback (nome interno do container) e a falta de injeção da `SITE_URL` no `Dockerfile` durante o build do Next.js.
   - O projeto `tiattendai.supabase.co` (Legacy Oracle) foi identificado nos logs e substituído totalmente pelo novo projeto `rgadznqdknsatasfoynl.supabase.co`.
2. **Infraestrutura (Docker/Traefik):**
   - **Saneamento:** Todos os containers legados (`kvm2-*`) foram removidos. Foram encerradas todas as portas desnecessárias expostas que não passavam pelo Traefik.
   - **Traefik:** Roteamento restabelecido para `app.ruptur.cloud`, `api.ruptur.cloud`, `baileys.ruptur.cloud` e `whisper.ruptur.cloud`.
3. **Auditoria "Relógio Suíço":**
   - Mapeamento completo de portas, serviços e fluxos de dados em [swiss_watch_map.md](file:///root/.gemini/antigravity/brain/9cc2a3fa-4c34-4592-832b-4076b5c49cc9/swiss_watch_map.md).
   - Auditoria completa de segurança e performance em [production_audit.md](file:///root/.gemini/antigravity/brain/9cc2a3fa-4c34-4592-832b-4076b5c49cc9/production_audit.md).

## 🛠️ Detalhes do Ambiente (KVM2)
- **Repo Root:** `/opt/ruptur/current`
- **Deploy Config:** `/opt/ruptur/current/deploy/kvm2`
- **Env Files:** `/opt/ruptur/shared/kvm2.env` (Web) e `/opt/ruptur/shared/backend.env` (API).
- **Frontend Build:** Utiliza `args` no Docker Compose para injetar `NEXT_PUBLIC_SITE_URL` em tempo de build, agora suportado pelo `web/Dockerfile`.

## ⚠️ Observações para Próximas Sessões
- O erro 404 reportado em `/login` foi verificado como estável (200 OK) após o rebuild final. Caso persista, checar cache do navegador ou latência de propagação do Traefik/Certificados.
- A "Hidden Gold" (Disparidade Supabase): O projeto antigo `tiattendai` ainda aparece em logs residuais, mas as variáveis de produção apontam corretamente para o novo projeto.

---
*Relatório gerado automaticamente para o usuário Antigravity às 2026-03-20T18:59:00Z.*
