# POP — preview local do Ruptur

## Objetivo

Subir `backend` e `web` localmente para validar o fluxo basico do produto.

## Pre-condicoes

- `python3` instalado
- `node` e `npm` instalados
- dependencias instaladas em `backend/.venv` e `web/node_modules`

## Passos

1. Entrar em `backend/`
2. Ativar `.venv`
3. Garantir que `.env` esteja configurado, ou usar valores minimos locais
4. Subir API com `uvicorn`
5. Em outra sessao, entrar em `web/`
6. Rodar o servidor de desenvolvimento do Next.js

## Validacao minima

- `backend`: `/health`
- `web`: abrir o console e navegar entre as paginas principais
- confirmar que `NEXT_PUBLIC_RUPTUR_API_BASE_URL` aponta para a API local

## Resultado esperado

- API respondendo localmente
- console abrindo sem erro fatal de build
- fluxo de preview apto para smoke test manual

## Falha comum

- dependencias nao instaladas
- variavel de ambiente ausente
- porta em uso
- endpoint local configurado errado no frontend

## Escalada

Se preview falhar, seguir:

- `docs/governanca/runbooks/runbook-webhook-instancia-preview.md`
