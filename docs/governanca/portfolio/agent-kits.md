# Kits de agentes e workflows

## Objetivo

Padronizar como usamos “kits” (templates de agentes/skills/workflows) para acelerar execução, **sem** virar fonte de divergência com as diretrizes do projeto.

## Diretriz do Ruptur (sempre)

- **Native-first**: usar primeiro o que os provedores já entregam (uazapi primário).
- **Orquestrar o que falta**: Baileys como contingência/expansão.
- **Governança acima do kit**: POPs/runbooks/ADR definem o “jeito oficial” de operar.

## Antigravity Kit

O repositório `vudovn/antigravity-kit` foi incorporado via pasta `.agent/` no root do repo.

Para que serve:

- fornecer templates de agentes, skills e workflows (slash commands) para acelerar tarefas
- apoiar modelagem de novas soluções quando faltar um padrão interno

Como usar (boas práticas):

- use o kit para **rascunhar** e acelerar
- consolide decisões e operação em:
  - `docs/governanca/` (POPs/runbooks/ADR)
  - docs de produto (quando aplicável)

Notas:

- a pasta `.agent/` pode ser importante para indexação em IDEs com agentes (Cursor/Windsurf).
- nunca colocar segredos dentro de `.agent/`.

