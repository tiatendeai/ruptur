# Ruptur

Ecossistema de operacao comercial, aquecimento de instancias e console web.

## Estrutura principal

- `backend/`: API e nucleo operacional
- `web/`: console do produto
- `saas/`: pacote temporariamente desacoplado com front principal + Warmup Manager
- `deploy/`: artefatos de deploy para host2/KVM2
- `supabase/`: migrations e operacao de banco
- `docs/`: visao, jornada, blueprint, governanca e consolidacao
- `playbooks/`: runbooks e processos operacionais
- `knowledge/`: trilha institucional e governanca local
- `.agent/`: kit de agentes e workflows locais
- `experiments/`: scripts e prototipos

## Estado operacional atual

Em **25/03/2026**, a entrega publica mais recente do front/warmup esta concentrada em:

- `saas/`
- branch: `lindona-front-e-warmup-manager`

Esse pacote serve:

- front principal em `/`
- Warmup Manager em `/warmup/*`
- runtime local/producao em `saas/runtime/server.mjs`

## Leitura recomendada

- blueprint oficial: `docs/blueprint/ruptur-blueprint.md`
- setup do warmup: `docs/WARMUP_MANAGER_SETUP.md`
- runbook de cutover KVM2: `playbooks/governanca/runbooks/runbook-warmup-kvm2-cutover-2026-03-23.md`
- README operacional do pacote atual: `saas/README.md`

## Preview local

### Pacote `saas`

```bash
cd saas
npm run runtime
```

URLs:

- front: `http://127.0.0.1:8787/`
- Warmup Manager: `http://127.0.0.1:8787/warmup/`

## Observacao

Logs como:

- `jamToggleDumpStore`
- `Unchecked runtime.lastError: The page keeping the extension port...`

foram classificados como **ruido de extensao/navegador**, nao como erro nativo do app.
