<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/pops/pop-rotacao-segredos.md
Não edite manualmente aqui sem promover no STATE.
-->

# POP — rotacao de segredos expostos

## Objetivo

Padronizar a resposta quando token, chave ou credencial for exposto em chat, log, issue, backup ou historico local.

## Quando aplicar

- token colado em conversa
- segredo salvo em arquivo versionado
- chave presente em historico local
- credencial compartilhada fora do canal correto

## Passos

1. Identificar o segredo afetado e o provedor dono.
2. Revogar ou rotacionar no provedor imediatamente.
3. Atualizar o segredo no ambiente correto:
   - servidor
   - CI
   - secrets manager
   - `.env` local, se aplicavel
4. Validar os fluxos que dependem dele.
5. Registrar o evento sem expor o valor.
6. Verificar se backups e historicos locais precisam de tratamento adicional.

## Registro minimo

- data
- ativo afetado
- impacto
- acao de mitigacao
- status da rotacao

## Referencias

- `docs/governanca/processos/segredos.md`
- `docs/governanca/ativos/registry.yaml`
