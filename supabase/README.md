# Supabase (CLI) — Ruptur

Objetivo: versionar e aplicar o schema do Ruptur no Supabase usando **migrations**.

## Pré‑requisitos

- Node.js 20+
- Supabase CLI (via `npx`, sem instalação global)

## 1) Login e link do projeto

```bash
npx supabase login
npx supabase link --project-ref <SEU_PROJECT_REF>
```

## 2) Aplicar migrations no banco remoto

As migrations ficam em `supabase/migrations/`.

```bash
npx supabase db push
```

## Alternativa (one-shot)

Se preferir aplicar o schema “na unha”, use:

```bash
cd backend
export RUPTUR_DATABASE_URL='postgres://...'
python3 scripts/apply_schema.py
```

## Notas de segurança

- Nunca commitar tokens/keys em git.
- Use variáveis de ambiente no seu terminal local.

