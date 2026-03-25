# saas

Pacote temporariamente desacoplado do Ruptur com:

- front principal em `/`
- Warmup Manager em `/warmup/*`
- runtime local em `runtime/server.mjs`

## Rodar localmente

```bash
cd saas
npm run runtime
```

## Rotas principais

- `/`
- `/warmup`
- `/warmup/instances`
- `/warmup/settings`

## Observação

O botão **Warmup Manager** é injetado no front principal e aponta para `/warmup/settings`.
