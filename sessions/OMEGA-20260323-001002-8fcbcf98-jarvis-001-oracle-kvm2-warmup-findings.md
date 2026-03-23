# Achados — Oracle, KVM2 e Warmup Manager

- sessão: `OMEGA-20260323-001002-8fcbcf98-jarvis-001`
- modo: `full_performance_audit`
- data: `2026-03-23`

## Resumo executivo

1. O **Warmup Manager real está rodando no host2 (Oracle)**.
2. O **`app.ruptur.cloud` público hoje está caindo na KVM2**, não no host2.
3. Na **KVM2 o serviço `warmup` não está rodando**.
4. O **`/warmup` público na KVM2 responde pelo app Next.js**, não pelo runtime standalone do Warmup Manager.
5. O ambiente ativo da KVM2 mostra **drift da esteira declarada**, inclusive no nome/projeto do compose e no path da stack em execução.

## Evidências centrais

### Oracle / host2

- `host2-warmup-1` está ativo.
- `host2` local responde:
  - `/` com `307 -> /inbox`
  - `/warmup` com `200` do runtime standalone.
- `host2-warmup-1` responde internamente em `/api/local/health`.
- snapshot interno do runtime mostra scheduler ativo e estado persistido.

### KVM2

- containers ativos observados:
  - `kvm2-baileys-1`
  - `kvm2-whisper-1`
  - `kvm2-ruptur-web-1`
  - `kvm2-ruptur-backend-1`
- não há container `warmup`.
- `app.ruptur.cloud/` retorna `404`.
- `app.ruptur.cloud/warmup` retorna `200`, mas com headers `x-powered-by: Next.js`.
- `docker compose ls` aponta projeto `kvm2` em `/tmp/ruptur-clone/deploy/kvm2/docker-compose.yml`, e não a release canônica em `/opt/ruptur/current/deploy/kvm2`.

## Leitura operacional

- O **host2** é a base operacional confiável do Warmup hoje.
- O **host1** continua sem acesso validado nesta máquina.
- A **KVM2** está parcialmente migrada e não entrega o Warmup Manager real.

## O que falta para usar o Warmup Manager pela KVM2

1. Fazer a KVM2 subir pela **release canônica** em `/opt/ruptur/current`, não pela stack solta em `/tmp/ruptur-clone`.
2. Subir o profile/serviço **`warmup`** na KVM2.
3. Garantir que o router `Host(app.ruptur.cloud) && PathPrefix(/warmup)` aponte para o container `warmup`, e não para o app Next.
4. Corrigir a entrada principal do app (`/`) para não ficar em `404`.
5. Injetar `NEXT_PUBLIC_WARMUP_MANAGER_URL=https://app.ruptur.cloud/warmup` no build do web para o botão/ponte do console.

## Nota de governança

Este artefato capitaliza localmente o diagnóstico do ciclo em modo full para orientar a próxima rodada de correção.
