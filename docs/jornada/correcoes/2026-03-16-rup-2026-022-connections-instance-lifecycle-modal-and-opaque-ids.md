# RUP-2026-022 - Connections instance lifecycle modal and opaque ids

- `id`: RUP-2026-022
- `data`: 2026-03-16
- `sistema`: ruptur
- `times_impactados`: frontend | backend | produto
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

O painel `Conexoes` ja tinha o lifecycle basico de instancias, mas o fluxo de criacao ainda estava misturado ao painel operacional, com excesso de campos tecnicos expostos e com pouca separacao entre `UAZAPI` e `Baileys`. Isso tornava a area de `Instancias` visualmente pesada e pouco aderente ao papel real de cada provider no MVP.

## 2) Causa raiz

A tela tratava criacao, visualizacao e operacao no mesmo espaco, reaproveitando o provider ativo do painel para o fluxo de criacao e exigindo IDs manuais mesmo quando a melhor pratica operacional era usar identificadores internos opacos. O resultado era atrito na criacao e excesso de detalhe tecnico visivel cedo demais.

## 3) Correcao aplicada

- `web/src/app/connections/ConnectionsClient.tsx`
  - removida a aba dedicada de `criacao` do painel operacional
  - criada modal de `Nova instancia` para centralizar o momento de criacao
  - separado `provider` do painel de `createProvider` da modal, evitando side effects na instancia selecionada
  - IDs internos opacos passaram a ser gerados por padrao para `UAZAPI` e `Baileys`
  - atributos tecnicos de create foram movidos para bloco `avancado`
  - painel operacional passou a focar em numero, status, QR, reset e exclusao

## 4) Comentarios tecnicos relevantes

- `RUP-2026-022`: comentarios de intencao foram mantidos no componente para deixar claro que criacao deve terminar ja em modo de conexao e que o modal nao deve despejar complexidade tecnica no operador cedo demais.

## 5) Validacao

- `npm run build` em `web/`
- resultado: build concluido com sucesso, incluindo rota `/connections`

## 6) Impacto lateralizado

- produto: o fluxo de criacao fica mais coerente com a estrategia `UAZAPI primario / Baileys contingencia`
- operacao: o numero e o status ficam mais centrais; o ID interno permanece disponivel sem dominar a UX
- backend: sem mudanca de contrato nesta iteracao; o ajuste e de lifecycle e UX

## 7) Risco residual

- a tela ainda depende de melhoria posterior para adotar `connection_id` interno da Ruptur como identidade canonica acima do `provider_instance_id`
- ainda resta validar o fluxo final em producao com criacao real, QR e reconexao das instancias dos assistentes

## 8) Rollback

- restaurar a versao anterior de `web/src/app/connections/ConnectionsClient.tsx`
- rebuildar `ruptur-web`
- gatilho de rollback: regressao de criacao, modal quebrado, ou perda de acoes operacionais de QR/reset/delete

## 9) Links

- card GitHub Project:
- PR/commit:
- runbook/doc atualizada:
  - `RAG/CONTEXT7.md`
  - `docs/jornada/correcoes/README.md`
