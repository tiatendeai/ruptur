# MCP e integracoes externas

## Objetivo

Definir o que vale ligar ao `Ruptur` por MCP ou API e o papel de cada integracao.

## Regra de decisao

Usar MCP/API quando a integracao reduzir friccao operacional, evitar retrabalho manual e melhorar a gestao a vista.

Nao ligar servico externo so para "ter ferramenta".

## Ja configurado no repo

Em [`/.agent/mcp_config.json`](/Users/diego/Downloads/ruptur/.agent/mcp_config.json):

- `supabase`: dados, schema e operacao de banco
- `context7`: documentacao tecnica e referencia de bibliotecas
- `shadcn`: apoio de componentes para o console

Uso recomendado hoje:

- `context7` continua como fonte de referencia tecnica para biblioteca, framework e componentes
- estado real de produto e operacao deve ser registrado em `docs/jornada/` e `docs/governanca/`
- nao usar `context7` como substituto de historico de execucao ou backlog

## Integracoes recomendadas

### Prioridade alta

- `Notion API/MCP`
  - papel: backlog unificado, roadmap, owners, prioridades e status
  - motivo: melhor equilibrio entre contexto, documentacao e operacao por agente
- `GitHub API`
  - papel: issues, PRs, releases e rastreabilidade tecnica
  - motivo: fecha o ciclo entre backlog e execucao
- `Cloudflare API`
  - papel: DNS, registros, zonas e operacao do dominio `ruptur.cloud`
  - motivo: centraliza operacao de dominio e reduz erro manual

### Prioridade media

- `Asana API`
  - papel: backlog e tarefas
  - motivo: funcional, mas menos aderente ao contexto tecnico do `Ruptur`
- `Runrun.it API`
  - papel: operacao visual de tarefas
  - motivo: interessante, mas depende de validar API no plano real usado

### Ja parte do produto

- `UAZAPI`
  - papel: canal primario de WhatsApp
- `Baileys`
  - papel: contingencia e expansao de canal
- `Supabase`
  - papel: persistencia e backend de dados
- `Asaas`
  - papel: billing e checkout

## Ordem recomendada de ativacao

1. `Notion` ou `GitHub Projects` para backlog unico
2. `Cloudflare` para operacao de `ruptur.cloud`
3. `Supabase` para validar dados e schema
4. `Asaas` e outros providers de produto conforme o fluxo funcional

## Minimo para operar agora

Mesmo sem novas credenciais, o repo ja pode operar assim:

- backlog local em Markdown
- governanca em `docs/governanca`
- orquestracao em `docs/governanca/processos/orquestracao-a2a.md`
- validacao tecnica e preview a partir do proprio repositório

## Quando ativar de verdade

Ativar uma integracao externa apenas quando houver:

- credencial valida
- dono definido
- uso recorrente esperado
- risco e escopo conhecidos
