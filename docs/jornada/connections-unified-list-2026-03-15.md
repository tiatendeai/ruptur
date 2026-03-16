# Connections: Lista Unificada de Instancias (2026-03-15)

## Contexto
Foi solicitado consolidar a tela de conexoes para operacao multi-time, removendo a visao separada por provedor e exibindo dados operacionais de instancias em um unico painel.

## Arquivo alterado
- `web/src/app/connections/ConnectionsClient.tsx`

## Correcoes implementadas
1. Lista unificada de instancias
- Unificacao de UAZAPI + Baileys em uma lista canonica por `instance id`.
- Instancias presentes nos dois provedores exibem duas tags (`UAZAPI` e `BAILEYS`).

2. Dados operacionais por instancia
- Exibicao de:
  - numero do WhatsApp (quando conhecido),
  - status consolidado (`conectado`, `conectando`, `desconectado`, `desconhecido`),
  - status por provedor (UAZAPI/Baileys),
  - conectado desde (quando inferivel por campos retornados),
  - ultima atualizacao conhecida.
- Tooltip por item com resumo detalhado para suporte/manutencao.

3. Navegacao e UX operacional
- Clique na instancia seleciona o item e leva para aba `visualizacao` no painel operacional.
- Alternancia de provedor operacional (UAZAPI/Baileys) com protecao:
  - se a instancia nao existir no provedor ativo, o sistema troca automaticamente para um provedor valido.

4. Filtros e pesquisa
- Campo de busca por `instance id`, numero e metadados conhecidos.
- Filtro por provedor: `todos`, `uazapi`, `baileys`, `nas duas`.
- Filtro por status consolidado.

5. Atualizacao manual
- Botao `Atualizar` preservado e funcional para recarregar instancias + health.

## Comentarios tecnicos adicionados no codigo
Foram incluidos comentarios curtos no `ConnectionsClient.tsx` para:
- regra de preservacao da instancia selecionada apos refresh,
- regra de merge da lista canonica multi-provedor,
- regra de fallback automatico do provedor ativo conforme instancia selecionada.

## Validacoes executadas
### Local
- `cd web && npm run lint`
  - resultado: sem erros; 2 warnings preexistentes em `InboxClient.tsx` (`no-img-element`).
- `cd web && npm run build`
  - resultado: sucesso (rota `/connections` gerada).

### VPS (CLI)
- Arquivo sincronizado para:
  - `~/apps/ruptur-backend/web/src/app/connections/ConnectionsClient.tsx`
- Documento sincronizado para:
  - `~/apps/ruptur-backend/docs/jornada/connections-unified-list-2026-03-15.md`
- Build do frontend no fluxo real da VPS:
  - `cd ~/apps/ruptur-backend/deploy/host2 && docker compose build ruptur-web`
  - resultado: sucesso (`Image host2-ruptur-web Built`).
- Aplicacao em execucao atualizada:
  - `cd ~/apps/ruptur-backend/deploy/host2 && docker compose up -d ruptur-web`
  - resultado: container `ruptur-web` iniciado e log de boot do `next start` sem erro inicial.
- Observacao operacional:
  - `npm` nao estava no PATH direto do usuario `ubuntu`; validacao foi feita via Docker Compose, que e o fluxo de deploy da VPS.

## Impacto para times lateralizados
- Operacao/suporte: leitura unica de estado de instancia, com dados e tooltip para diagnostico rapido.
- Produto/UI: filtros e pesquisa para triagem em bases com varias instancias.
- Integracoes: visibilidade explicita de coexistencia UAZAPI/Baileys por instancia.
