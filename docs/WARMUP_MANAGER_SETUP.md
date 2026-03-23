# Warmup Manager – visão unificada

## O que está rodando e onde
- **Runtime principal:** `deploy/host2/warmup/runtime/server.mjs` – serve o SPA (`dist/`) e a API interna (`/api/local/*`) que alimenta o dashboard de instâncias (calor, healthscore, monitor cardácico).
- **Portas:** local dev em `localhost:8787`; em produção o container define `WARMUP_RUNTIME_PORT=4173` e o Traefik em `deploy/host2/traefik_dynamic.yml` publica `app.ruptur.cloud/warmup` com o middleware `warmup-strip`.
- **Front principal que você vê no console:** `web/src/app/warmup/WarmupClient.tsx` agora tem um botão “Warmup Manager” que abre `NEXT_PUBLIC_WARMUP_MANAGER_URL` (fallback seguro `"/warmup"`).
- **Blessing de roteamento:** o runtime reescreve quaisquer requests com `/warmup` para servir o SPA (ver `serveStatic` em `runtime/server.mjs`). Os assets ficam em `dist/assets/`.

## Instruções imediatas (já executadas)
1. `npm run runtime` dentro de `deploy/host2/warmup` para subir o serviço em `0.0.0.0:8787`. O log mostra `[warmup-runtime] listening on http://0.0.0.0:8787`.
2. Confirmado via smoke test: `curl http://127.0.0.1:8787/api/local/health` retorna `{"ok":true,...}` e o HTML principal responde em `/`.
3. No front, o botão “Warmup Manager” abre o SPA real, conectando a camada de vendas com o monitor de instâncias.

## Recomendações adicionais
- **Variável de ambiente:** configure `NEXT_PUBLIC_WARMUP_MANAGER_URL=/warmup` no `.env` do Next para manter o botão em same-origin; use URL absoluta só se precisar de override entre domínios.
- **Smoke test automatizado:** mantenha um script rápido que verifique `/api/local/health` e `/warmup`. Anote em CI para verificar antes de deploy.
- **Equipe e agentes:** envolva a IAzinha para validar o front (rotas e link), Jarvis para confirmar health/telemetria e o time de skills que monitora `deploy/host2/warmup`. No planejamento, defina quem revisa o README e quem roda smoke tests antes de subir.
- **Próximo passo:** publicar `deploy/host2/warmup` no VPS (traefik + container) com `npm run build` e redeploy do Traefik/stack; depois, manter `NEXT_PUBLIC_WARMUP_MANAGER_URL` alinhado ao route same-origin em produção.
- **Script de smoke:** use `scripts/smoke-warmup.sh` para verificar Postgres, `/api/local/health` e `/warmup`. Execute após cada deploy/migração e inclua no Jarvis/CI como métrica de sucesso e tempo de resposta.

## Estado validado em 23/03/2026

- **host2 (`167.234.228.71`)** continua com o Warmup Manager real ativo no container `host2-warmup-1`.
- **KVM2** esta servindo o dominio publico `app.ruptur.cloud`, mas ate a validacao desta data o container `warmup` nao estava ativo nesse host.
- Com isso, o publico via `https://app.ruptur.cloud/warmup` caia no **Next.js**, e nao no runtime standalone do warmup.
- A KVM2 tambem estava com **drift de runtime**: a stack ativa vinha de `/tmp/ruptur-clone/deploy/kvm2/docker-compose.yml`, e nao da release canônica em `/opt/ruptur/current`.

## Fechamento tecnico minimo obrigatorio para producao

1. **Build do web**
   - `web/Dockerfile` precisa receber `NEXT_PUBLIC_WARMUP_MANAGER_URL`.
   - o fallback seguro do front deve ser `"/warmup"` para evitar apontamento para `localhost` em produção.
   - `deploy/kvm2/docker-compose.yml` e `deploy/host2/docker-compose.yml` precisam repassar esse build arg.

2. **Env compartilhado do KVM2**
   - `NEXT_PUBLIC_WARMUP_MANAGER_URL=/warmup`
   - `WARMUP_TICK_INTERVAL_MS=60000`
   - `RUPTUR_COMPOSE_PROJECT_NAME=kvm2` enquanto a migracao estiver absorvendo a stack legada ja publicada no host.

3. **Deploy canônico**
   - subir a stack a partir de `/opt/ruptur/current/deploy/kvm2`
   - ligar os profiles necessarios, incluindo `warmup`
   - evitar operar via clone lateral em `/tmp/ruptur-clone`

4. **Smoke obrigatório**
   - `https://api.ruptur.cloud/health`
   - `https://app.ruptur.cloud/`
   - `https://app.ruptur.cloud/warmup`
   - health interno do warmup (`/api/local/health`) via host/container

## Critério de aceite da migração

- `app.ruptur.cloud/` deixa de responder `404`
- `app.ruptur.cloud/warmup` deixa de responder com headers do Next.js
- o container `kvm2-warmup-1` fica ativo
- o botão `Warmup Manager` no console passa a abrir a URL pública correta sem fallback para `localhost`

## Testes realizados (smoke)
- `curl http://127.0.0.1:8787/api/local/health` → ok
- `curl http://127.0.0.1:8787/` → serve o HTML do SPA
- (o `/warmup` é servido quando o Traefik aplica o `PathPrefix` + strip; o botão no front direciona para ele)

## Próximos passos (para aniversários do time)
1. Atualizar a pipeline de deploy para garantir que `deploy/host2/warmup` rode `npm run build` antes do container.
2. Incluir no checklist (Jarvis) uma verificação de endpoint `/api/local/health` pós-deploy.
3. Validar com IAzinha se o botão precisa mostrar badge de ambiente (dev vs prod).
4. Reunir o time do warmup (Jarvis + IAzinha + skills) para homologar que o dashboard corresponde ao que a UAZAPI está registrando.
5. Registrar o plano de recuperação/rollback: manter backup do schema antigo, script `scripts/smoke-warmup.sh`, e instruções para `rm/touch` em caso de erro na montagem do volume.
