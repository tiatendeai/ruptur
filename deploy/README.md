# Deploy

Este diretório concentra os artefatos de deploy dos ambientes principais do ecossistema.

## Superfícies ativas

- `deploy/host2/` — Oracle/host2
- `deploy/kvm2/` — KVM2 / borda pública atual

## Leituras recomendadas

- `deploy/kvm2/README.md`
- `playbooks/governanca/runbooks/runbook-cicd-kvm2.md`
- `playbooks/governanca/runbooks/runbook-warmup-kvm2-cutover-2026-03-23.md`
- `docs/DOMINIOS_CANONICOS.md`

## Regra operacional

Para a KVM2, a fonte da verdade do deploy deve ser:

- `/opt/ruptur/current`

Evitar qualquer operação por clone lateral em:

- `/tmp/ruptur-clone`
