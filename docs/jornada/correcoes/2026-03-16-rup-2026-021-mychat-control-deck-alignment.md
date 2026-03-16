# RUP-2026-021 — MyChat alinhado ao Control Deck e ao papel atual do ecossistema

## Contexto

O `MyChat` ainda operava com shell, copy e linguagem visual quase independentes do restante do ecossistema. Isso criava tres problemas:

- sugeria que `MyChat` era um produto paralelo, nao um modulo do `Control Deck`
- deixava `UAZAPI` e `Baileys` com aparencia de paridade operacional no MVP
- mantinha semantica visual herdada do ciclo anterior, mais proxima de um clone de WhatsApp do que de uma mesa operacional da Ruptur

## Decisao

- unificar o `MyChat` sob a mesma casca visual do `Control Deck`
- tornar a estrategia atual visivel na UI interna:
  - `UAZAPI` primaria no MVP
  - `Baileys` contingencia estrategica
- preservar o miolo funcional de conversa, contexto e ownership, sem despejar a micelania tecnica de transporte no operador

## Mudancas aplicadas

- `web/src/app/AppShell.tsx`
  - remocao do shell exclusivo de `Inbox/MyChat`
  - uso do mesmo shell do restante do ecossistema
  - copy do `Control Deck` atualizada para refletir `UAZAPI primaria + Baileys contingencia`
- `web/src/app/inbox/InboxClient.tsx`
  - cabecalho reescrito para o proposito atual
  - indicadores operacionais simplificados
  - CTA e estados principais alinhados ao tema atual da operacao
  - linguagem ajustada para `contexto operacional`, `fila consolidada` e `atendimento em linha`
- `RAG/CONTEXT7.md`
  - regra explicita de que `MyChat` nao deve divergir do `Control Deck` nem atuar como produto paralelo

## Resultado esperado

- o operador passa a perceber o `MyChat` como parte da mesa operacional
- a estrategia de primario/contingencia fica clara sem sobrecarregar o fluxo
- o ecossistema reduz dissonancia visual e semantica antes de aprofundar a etapa seguinte de layout

## Pendencias

- revisar o restante do ecossistema com a mesma lente para eliminar residuos de simetria artificial entre providers
- avaliar uma segunda etapa de UX para `MyChat`, caso seja necessario reorganizar submodos, atalhos e ownership com mais profundidade
