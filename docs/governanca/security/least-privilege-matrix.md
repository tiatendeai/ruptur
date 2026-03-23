# Matriz de menor privilégio — Jarvis / Ruptur

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Finalidade

Explicitar o princípio de menor privilégio para perfis, ferramentas e ações sensíveis no Ruptur.

---

## Regras centrais

1. Nenhum perfil assume acesso irrestrito por padrão.
2. SSH, segredos, deploy, ações destrutivas e mutações sensíveis exigem operador humano + contexto válido.
3. Perfis operacionais descrevem foco de atuação, não autorização automática.

---

## Matriz resumida

| Escopo | ops | vcfo | vcvo | eggs | maestro local | operador humano |
| --- | --- | --- | --- | --- | --- | --- |
| Ler docs e contexto | sim | sim | sim | sim | sim | sim |
| Atualizar backlog / notas | sim | sim | sim | sim | sim | sim |
| Editar código local | não por padrão | não | não | sim com escopo | sim | sim |
| Rodar testes / validações locais | não por padrão | não | não | sim com escopo | sim | sim |
| SSH / produção | não | não | não | não | somente com confirmação | sim |
| Segredos / credenciais | não | não | não | não | somente leitura quando autorizado | sim |
| Ação destrutiva | não | não | não | não | somente com confirmação explícita | sim |

---

## Referências

- `../../state/registry/supervision.yaml`
- `../../state/constitution/ruptur.principles.md`
- `.agent/agents/jarvis.md`
