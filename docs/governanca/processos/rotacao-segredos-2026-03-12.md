# Rotacao de segredos — 2026-03-12

## Objetivo

Registrar os segredos que devem ser tratados como expostos ou potencialmente expostos durante a recuperacao e reorganizacao do `Ruptur`.

## Escopo desta rodada

Esta rodada cobre:

- credenciais usadas em `.env` local
- segredos digitados em sessoes locais do Codex
- backups de historico arquivados em `archive/recovery/`

## Segredos a rotacionar ou revisar

### Alta prioridade

- `GITHUB_TOKEN`
  - motivo: foi lido e usado operacionalmente nesta sessao
  - impacto: acesso ao GitHub Projects e possivelmente repo/issue conforme escopo do token
  - status: pendente de rotacao

### Revisar conforme uso real

- `RUPTUR_UAZAPI_ADMIN_TOKEN`
  - motivo: historico local anterior indica exposicao em conversa
  - status: revisar e rotacionar se ainda estiver ativo
- `RUPTUR_UAZAPI_TOKEN`
  - motivo: mesma superficie do canal
  - status: revisar e rotacionar se ainda estiver ativo
- `SUPABASE_ACCESS_TOKEN`
  - motivo: historico local e backups podem conter token de operacao
  - status: revisar e rotacionar se ainda estiver ativo
- `SUPABASE_SERVICE_ROLE_KEY`
  - motivo: alto impacto se exposto
  - status: revisar e rotacionar se estiver em uso
- `ASAAS_API_KEY`
  - motivo: billing
  - status: revisar e rotacionar se estiver em uso
- `CLOUDFLARE_API_TOKEN`
  - motivo: DNS e edge
  - status: revisar e rotacionar quando for provisionado

## Acoes operacionais

1. Rotacionar `GITHUB_TOKEN` depois de encerrar a configuracao inicial do backlog.
2. Auditar o `.env` local e manter apenas o minimo necessario.
3. Tratar `archive/recovery/` como material sensivel e temporario.
4. Quando possivel, migrar segredos relevantes para um secrets manager.

## Observacoes

- O repositório nao deve receber os valores rotacionados.
- O historico local do Codex deve ser tratado como sensivel.
- A existencia de referencia a nomes de variaveis no repo e aceitavel; o problema e o valor secreto.
