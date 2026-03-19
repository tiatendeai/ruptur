# Runbook — webhook, instancia e preview local

## Objetivo

Diagnosticar rapido quando o fluxo local ou operacional nao responde como esperado.

## Sintomas

- webhook nao chega
- instancia aparece desconectada
- envio falha
- frontend sobe, mas sem dados
- backend sobe, mas rotas falham

## Checklist rapido

1. Validar se a API local esta de pe.
2. Validar se o frontend esta apontando para a API correta.
3. Validar variaveis de ambiente essenciais.
4. Validar se a instancia do canal esta conectada.
5. Validar se o webhook do provider esta configurado para o endpoint certo.

## Diagnostico por camada

### Backend

- checar `/health`
- revisar stack trace local
- confirmar dependencias instaladas

### Frontend

- checar se o build inicial concluiu
- revisar erros de fetch no browser
- confirmar `NEXT_PUBLIC_RUPTUR_API_BASE_URL`

### Provider de canal

- checar status da instancia
- checar URL de webhook configurada
- checar credenciais e tokens ativos

### Dados

- confirmar conexao com Supabase/Postgres
- validar migrations aplicadas

## Mitigacao

- corrigir `.env`
- reiniciar processo local
- reconfigurar webhook
- reconectar instancia
- reexecutar migration ou sync necessario

## Encerramento

Depois da mitigacao:

- atualizar o backlog ou incidente
- registrar causa raiz se o problema tiver recorrencia
