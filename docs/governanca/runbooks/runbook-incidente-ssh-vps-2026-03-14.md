# Runbook — Incidente SSH VPS `vps` — 2026-03-14

## Contexto

Durante a tentativa de colocar em producao os ajustes do backend do `ruptur` para restaurar a `IAzinha` nos numeros `553189131980` e `553181139540`, o acesso SSH ao host `vps` falhou.

O alias local analisado foi:

```sshconfig
Host vps
    HostName <host-redacted>
    User <user-redacted>
    IdentityFile <key-redacted>
```

## Sintomas observados

### 1. Mudanca de host key

Ao conectar usando o alias `vps`, o SSH local retornou erro de mudanca de identidade do host:

```text
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
Host key for <host-redacted> has changed and you have requested strict checking.
Host key verification failed.
```

### 2. Falha de autenticacao por chave

Ao isolar o teste com `UserKnownHostsFile` temporario para nao alterar o `known_hosts` principal, o host respondeu, mas recusou autenticacao:

```text
<user-redacted>@<host-redacted>: Permission denied (publickey).
```

O problema, portanto, deixou de ser apenas `known_hosts`: a credencial atual do cliente nao foi aceita pelo host para o usuario `ubuntu`.

## Impacto operacional

- sem SSH valido, nao foi possivel reiniciar a stack do `ruptur-backend` na VPS
- sem reinicio/deploy, as correcoes locais do backend nao chegaram ao runtime publico
- o ambiente publico continuou com um numero sem resposta da `IAzinha` e outro com contexto preso em `Jarvis`

## Correcoes ja prontas localmente

No runtime local do `ruptur`, ja existem correcoes minimas para destravar o teste:

1. `backend/app/services/agent_service.py`
   - corrigida a resolucao da persona para usar `persona` em vez de `active_persona`
2. `backend/app/api/uazapi_webhook.py`
   - corrigido o ramo UAZAPI do desafio de senha que usava `clean_number` sem definicao previa

Essas mudancas ainda dependem de deploy/restart na VPS.

## Confirmacoes feitas pela API publica

Os endpoints publicos estavam operacionais no momento da analise:

- `https://api.ruptur.cloud/health`
- `https://baileys.ruptur.cloud/health`

Os dois leads alvo tambem foram confirmados pela API CRM, sem divergencia de existencia ou historico basico.

No numero final `9540`, a ultima mensagem registrada no momento da analise ainda estava saindo como `Jarvis`, o que indica metadata de conversa provavelmente presa em `active_persona = "jarvis"`.

## Hipoteses mais provaveis

1. o host alvo foi reprovisionado
2. a chave publica do cliente nao esta mais em `~/.ssh/authorized_keys` do usuario `ubuntu`
3. o usuario correto do host nao e mais `ubuntu`
4. o alias `vps` continua apontando para o IP antigo ou para um host com credenciais trocadas

## Proximo passo recomendado

1. Confirmar com o time qual e o host correto da stack `host2`.
2. Confirmar qual usuario SSH deve ser usado.
3. Confirmar qual chave publica esta autorizada no host.
4. Atualizar o alias `vps` em `~/.ssh/config`, se necessario.
5. Somente depois disso:
   - aplicar deploy/restart do `ruptur-backend`
   - resetar a conversa presa em `Jarvis`
   - validar a `IAzinha` nos dois numeros

## Observacao de seguranca

Nao e recomendavel apagar ou sobrescrever `known_hosts` sem confirmar a troca de host key, porque a mensagem original e compativel com:

- reprovisionamento legitimo do host
- mudanca real de identidade do servidor
- risco de MITM

Por isso, a analise usou arquivo temporario de `known_hosts` apenas para diagnostico, sem alterar a configuracao principal do desenvolvedor.
