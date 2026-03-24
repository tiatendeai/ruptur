<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/mudancas.md
Não edite manualmente aqui sem promover no STATE.
-->

# Processo de mudanças (mínimo viável)

Base: ITIL 4 + GitOps.

## Objetivo

Entregar mudanças com previsibilidade, rollback e rastreabilidade.

## Tipos de mudança

- **Normal**: via PR, revisão, deploy planejado.
- **Urgente**: hotfix para incidente; PR pode ser pós-implementação (mas precisa registro).

## Fluxo (normal)

1. Criar branch e PR
2. Revisão (técnica + risco)
3. Checklist
   - segredos não versionados
   - plano de rollback
   - validação mínima (health + fluxo crítico)
4. Deploy
5. Monitorar (janela curta)

## Rollback

Sempre ter uma ação de rollback simples:

- voltar imagem/commit anterior
- voltar config/env anterior
