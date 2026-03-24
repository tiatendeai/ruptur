<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/segredos.md
Não edite manualmente aqui sem promover no STATE.
-->

# Segredos (tokens/keys) — política mínima

## Regra de ouro

Segredos **não** entram no Git, nem em documentação pública.

Isso inclui:

- tokens de instância (uazapi)
- `admintoken` (uazapi)
- Supabase `secret` keys / service role / tokens
- credenciais SMTP

## Onde guardar

- Preferência: **secrets manager** (ex.: 1Password/Vault, Doppler, AWS/GCP secrets)
- Alternativa: `.env` no servidor/CI com permissões restritas

## Como referenciar no repo

- Usar somente **nomes de variáveis** (ex.: `RUPTUR_UAZAPI_TOKEN`)
- No inventário (`docs/governanca/ativos/registry.yaml`), referenciar como `env:VAR_NAME`

## Rotação

Se um segredo for colado em chat/issue/log:

1) **rotacionar/revogar** imediatamente no provedor (uazapi/supabase)
2) atualizar `.env`/secrets manager
3) registrar a mudança (PR/nota interna) sem expor valores
