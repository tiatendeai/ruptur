<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/runbooks/runbook-observabilidade-kvm2.md
Não edite manualmente aqui sem promover no STATE.
-->

# Runbook — Observabilidade do KVM2

## Objetivo

Deixar o `kvm2` com observabilidade leve no proprio host e observabilidade pesada fora da caixa.

## Estrategia oficial

### Dentro do KVM2

- `node-exporter`
- `cadvisor`

### Fora do KVM2

- `Prometheus`
- `Grafana`

## Por que esse desenho

- o `kvm2` continua focado em app, api, warmup e canais
- quando a maquina degrada, a observabilidade continua viva fora dela
- evita colocar CPU, RAM e disco de dashboards no mesmo host da operacao

## Profiles do compose

Profile dedicado:

- `observability-agents`

Deploy padrao recomendado:

```bash
export COMPOSE_PROFILES="${COMPOSE_PROFILES:-core,channels,warmup,observability-agents}"
docker compose --project-name "${RUPTUR_COMPOSE_PROJECT_NAME:-kvm2}" \
  up -d --build --remove-orphans
```

## Endpoints locais esperados

### Node Exporter

- bind padrao: `127.0.0.1:9100`
- metrica: `http://127.0.0.1:9100/metrics`

### cAdvisor

- bind padrao: `127.0.0.1:8080`
- metricas: `http://127.0.0.1:8080/metrics`

## Como expor com seguranca para o Prometheus externo

Escolher uma das opcoes abaixo:

### Opcao A — VPN / rede privada

Melhor opcao quando existir malha privada entre servidores.

### Opcao B — Tunel SSH

Boa opcao para POC e bootstrap rapido.

Exemplo conceitual:

```bash
ssh -N -L 19100:127.0.0.1:9100 -L 18080:127.0.0.1:8080 deploy@kvm2
```

Nesse caso, o `Prometheus` externo coleta via host local do servidor onde o tunel estiver aberto.

### Opcao C — Firewall com allowlist

Liberar `9100` e `8080` somente para o IP do servidor de observabilidade.

So usar se houver governanca clara de borda.

## O que nao fazer

- nao publicar `9100` e `8080` via Traefik na internet
- nao deixar exporters abertos para qualquer origem
- nao colocar `Prometheus + Grafana` dentro do mesmo `kvm2` como primeira escolha

## Watchdog

O `Warmup` ja possui watchdog de aplicacao e autorecovery.

O que esta sendo adicionado aqui e:

- observabilidade de host
- observabilidade de containers
- capacidade de detectar degradacao fora do processo da aplicacao

## Validacao minima

No `kvm2`:

```bash
curl -fsS http://127.0.0.1:9100/metrics >/dev/null
curl -fsS http://127.0.0.1:8080/metrics >/dev/null
```

No repositório:

```bash
docker compose -f deploy/kvm2/docker-compose.yml --env-file deploy/kvm2/.env.example config >/dev/null
```
