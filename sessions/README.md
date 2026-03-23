# Sessões locais do Jarvis no Ruptur

Este diretório mantém o espelho operacional das sessões do Jarvis em execução no Ruptur.

## Regra mínima

- toda sessão ativa deve existir primeiro ou em paralelo em `../../omega/sessions/`
- o artefato local deve usar o mesmo `session_id` do Omega
- `connectome/status.json` deve apontar para o artefato local e para o artefato do Omega

## Papel do Ruptur

O Ruptur **não cria a entidade** Jarvis.  
Ele apenas materializa e opera a manifestação `jarvis.ruptur.control_plane`.

## Convenção local

- arquivo de sessão: `sessions/{session_id}.json`
- handoff da próxima sessão: `sessions/HANDOFF.proxima-sessao.md`

Se houver divergência entre este diretório e `../../omega/sessions/`, trate como reconciliação controlada e registre a divergência.
