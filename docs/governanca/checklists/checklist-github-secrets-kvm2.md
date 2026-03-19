# Checklist — Segredinhos do GitHub para o KVM2

## Ideia simples

O robozinho do GitHub precisa de um papelzinho com:

- onde fica a casa
- qual chave ele usa
- onde esta o armario
- quais portas ele vai testar

## Onde configurar

No GitHub:

- `Settings`
- `Environments`
- `kvm2-production`

## Variaveis obrigatorias

### `KVM2_SSH_HOST`

IP ou host do `kvm2`

Exemplo:

```text
212.85.1.109
```

### `KVM2_SSH_PORT`

Porta SSH

Exemplo:

```text
22
```

### `KVM2_SSH_USER`

Usuario que vai receber a release

Exemplo:

```text
deploy
```

### `KVM2_APP_ROOT`

Raiz da aplicacao no servidor

Exemplo:

```text
/opt/ruptur
```

### `KVM2_SHARED_ENV_FILE`

Caminho do arquivo compartilhado do compose

Exemplo:

```text
/opt/ruptur/shared/kvm2.env
```

### `KVM2_API_HEALTHCHECK_URL`

URL para smoke da API

Exemplo:

```text
https://api.ruptur.cloud/health
```

### `KVM2_WEB_URL`

URL principal do web

Exemplo:

```text
https://app.ruptur.cloud
```

## Variavel opcional

### `KVM2_WARMUP_URL`

Exemplo:

```text
https://app.ruptur.cloud/warmup
```

## Segredo obrigatorio

### `KVM2_SSH_PRIVATE_KEY`

Chave privada usada pelo GitHub Actions.

**Nunca colocar no Git.**

## Boas regrinhas

- usar Environment com protecao
- limitar quem pode disparar deploy
- girar chave se ela vazar
- nao usar chave pessoal baguncada se puder usar chave dedicada

## Time envolvido

- `devops-engineer`
- `security-auditor`
- `Jarvis-maestro`

## So fica pronto quando

- todos os secrets existem
- os caminhos batem com o servidor
- a chave SSH autentica
- o smoke aponta para os dominios certos
