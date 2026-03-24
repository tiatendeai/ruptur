<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/ativos/ssh-vps-snapshot-2026-03-14.md
Não edite manualmente aqui sem promover no STATE.
-->

# Snapshot — SSH VPS `vps` — 2026-03-14

## Alias local relevante

```sshconfig
Host vps
    HostName <host-redacted>
    User <user-redacted>
    IdentityFile <key-redacted>
```

## Arquivos relevantes encontrados em `~/.ssh`

- `<key-redacted>`
- `<key-redacted>.pub`
- `<alternate-key-redacted>`
- `<alternate-key-redacted>.pub`
- `<deploy-key-redacted>`
- `<deploy-key-redacted>.pub`
- `<known-hosts>`
- `<known-hosts-backup>`

## Fingerprints verificadas

- `vps-ssh-key-2025-07-25.key.pub`
  - `SHA256:D0Grkd2bkH7YUdwTxGGUrdOmMHoLdkJmZcj1EXUqwdw`
- `ssh-key-2025-07-25.key.pub`
  - `SHA256:+hf2G9ILJ2rkqjPHGqiHCiXrdz1aQ1r2oXPoYWllQUE`
- `tiatendeai_deploy_key.pub`
  - `SHA256:PKFCtdw3VlFeIZ5TOz1lgzeZoxk5cXw2Mjfw7HfLGgY`

## Resultado dos testes de autenticacao

Testes feitos sem alterar o `known_hosts` principal, usando `UserKnownHostsFile` temporario:

- `vps-ssh-key-2025-07-25.key`
  - `Permission denied (publickey)`
- `ssh-key-2025-07-25.key`
  - `Permission denied (publickey)`
- `tiatendeai_deploy_key`
  - `Permission denied (publickey)`

## Leitura operacional

- o host respondeu com nova host key ED25519
- nenhuma das chaves testadas autenticou para `<user-redacted>@<host-redacted>`
- o acesso administrativo ao host ficou bloqueado ate validacao de:
  - IP correto
  - usuario correto
  - chave correta
