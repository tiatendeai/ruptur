# RUP-2026-017 — Lifecycle de instancias no painel (criar/excluir)

## Contexto

O painel de conexoes da Ruptur ja permitia criar e excluir instancias UAZAPI, mas no caminho Baileys ainda faltava lifecycle explicito de instancia.

Na pratica, isso criava assimetria operacional:

- UAZAPI podia ser criada/excluida pelo painel.
- Baileys so expunha `status`, `connect`, `reset` e QR.
- A exclusao completa de auth/cache/sessao Baileys dependia de intervencao manual fora da UI.

## Decisao

Padronizar lifecycle operacional no painel:

- `Criar instancia` para UAZAPI e Baileys.
- `Excluir instancia` para UAZAPI e Baileys.
- no Baileys, exclusao precisa limpar:
  - auth state
  - QR/sessao atual
  - cache persistido de retry (`getMessage`)
  - estado runtime em memoria da instancia

## Implementacao

### Gateway Baileys

- novo `POST /instance`
  - cria/inicializa a instancia e a deixa pronta para QR/status
- novo `DELETE /instance`
  - executa logout
  - remove auth local
  - remove store persistente de mensagens
  - limpa runtime da instancia
  - remove a instancia do mapa em memoria

### Backend

- novo `POST /integrations/baileys/instances`
- novo `DELETE /integrations/baileys/instances?instance=...`

Ambos preservam a regra operacional existente:

- UI trabalha com `instance_display`
- transporte usa `instance_effective`/alias real quando necessario

### Frontend

- aba `criacao` do painel passa a criar Baileys explicitamente
- painel Baileys passa a expor `Excluir instancia`
- mensagens de confirmacao deixam claro que a exclusao remove auth, cache e sessao anterior

## Resultado esperado

- operacao de instancias fica simetrica entre provedores
- reset e exclusao deixam de depender de shell/manual
- risco de sessao stale reaparecer por auth/cache remanescente diminui
- a complexidade continua interna; o usuario final nao recebe essa carga cognitiva
