# Dominios canonicos e redirects

## Host canonico do produto

O host canonico da experiencia web atual e:

- `https://app.ruptur.cloud`

Toda superficie publica de front/warmup deve convergir para esse host.

## Hosts que devem redirecionar para `app.ruptur.cloud`

Os aliases abaixo devem redirecionar para o host canonico:

- `ruptur.cloud`
- `www.ruptur.cloud`
- `studio.ruptur.cloud`
- `showcase.ruptur.cloud`
- `site.ruptur.cloud`
- `lp.ruptur.cloud`
- `web.ruptur.cloud`
- `warmup.ruptur.cloud`
- `aquecimento.ruptur.cloud`

## Estado validado em 25/03/2026

- `app.ruptur.cloud` esta servindo pela **KVM2**
- `ruptur.cloud`, `www.ruptur.cloud`, `studio.ruptur.cloud`, `showcase.ruptur.cloud`, `site.ruptur.cloud`, `lp.ruptur.cloud` e `web.ruptur.cloud` ainda resolvem para a **Oracle/host2**, que agora responde com redirect para `https://app.ruptur.cloud`
- `warmup.ruptur.cloud` e `aquecimento.ruptur.cloud` agora possuem DNS publico e entram por redirect seguro para `https://app.ruptur.cloud`

## Onde isso e controlado

### Oracle / host2

Arquivo:

- `deploy/host2/traefik_dynamic.yml`
- `deploy/host2/docker-compose.yml`
- `deploy/host2/redirect/nginx.conf`

Funcao:

- manter redirects dos aliases que ainda resolvem para a Oracle
- garantir que o acesso publico caia no host canonico `app.ruptur.cloud`

### KVM2 / pacote atual

Arquivo:

- `saas/docker-compose.yml`

Funcao:

- publicar a aplicacao principal somente em `app.ruptur.cloud`
- evitar que aliases antigos continuem servindo conteudo diretamente pela KVM2

## Observacao importante

Esse controle e de **infra e roteamento**, nao de API.

Por isso, o lugar correto de documentacao e:

- README
- docs
- arquivos de Traefik / deploy

e **nao** o OpenAPI do backend, que documenta endpoints HTTP da aplicacao e nao politica de canonicalizacao de dominio.
