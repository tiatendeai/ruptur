# saas

Pacote temporariamente desacoplado do Ruptur com:

- front principal em `/`
- Warmup Manager em `/warmup/*`
- runtime unico em `runtime/server.mjs`

## Objetivo

Servir como pacote operacional temporario para:

- validar localmente o front atual
- expor o Warmup Manager real em rota separada
- publicar a mesma experiencia na KVM2 antes de um novo ciclo de consolidacao

## Host canonico

O pacote `saas` deve ser servido publicamente em:

- `https://app.ruptur.cloud`

Aliases antigos nao devem entregar conteudo proprio; eles devem redirecionar para o host canonico. A referencia publica dessa politica esta em:

- `docs/DOMINIOS_CANONICOS.md`

## Rodar localmente

```bash
cd saas
npm run runtime
```

## Rotas principais

- `/`
- `/warmup/`
- `/warmup/instances`
- `/warmup/routines`
- `/warmup/telemetry`
- `/warmup/device-lab`
- `/warmup/auto-regeneration`
- `/warmup/reports`
- `/warmup/groups`
- `/warmup/messages`
- `/warmup/logs`
- `/warmup/settings`

## Arquitetura resumida

- `dist/`: front principal atual
- `manager-dist/`: build do Warmup Manager
- `runtime/server.mjs`: servidor Node que roteia front + manager + API local
- `runtime-data/`: estado persistido local

## Correcao aplicada em 25/03/2026

### Problema

Ao abrir o painel, o browser acusava:

- `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

### Causa

O manager tentava bater em:

- `/warmup/api/local/*`

mas o runtime aceitava apenas:

- `/api/local/*`

Quando isso acontecia, a resposta voltava em HTML e quebrava o parse de JSON.

### Ajuste

O runtime agora:

- aceita `/api/local/*`
- aceita tambem `/warmup/api/local/*`
- abre o botao **Warmup Manager** diretamente no dashboard em `/warmup/`
- retorna lista vazia em `instance/all` quando ainda nao existe `adminToken`, evitando erro visual desnecessario
- adiciona o botao **Remover token** ao lado do aviso `Token ativo no runtime`, limpando o token ativo e zerando o painel operacional sem precisar editar segredo manualmente
- reidrata automaticamente a rotina protegida **Warmup 24/7**, que nao pode ser removida e pode apenas ser desativada para dar lugar a outra rotina especifica

## Logs que nao sao bug do app

Os logs abaixo foram classificados como ruido de extensao/navegador:

- `sw.js:13 Event handler of 'jamToggleDumpStore'...`
- `Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache...`

Eles nao foram encontrados no codigo do pacote `saas/`.

## Smoke test funcional — 25/03/2026

Ambiente auditado:

- URL publica: `http://app.ruptur.cloud`
- deploy: KVM2

| Tela | Rota | Status | Leitura atual |
| --- | --- | --- | --- |
| Front principal | `/` | OK | carrega landing/front e exibe botao `Warmup Manager` |
| Dashboard | `/warmup/` | OK | abre direto no dashboard, sem erro de JSON no console |
| Instancias | `/warmup/instances` | OK | lista instancias e cards operacionais |
| Warmup / Rotinas | `/warmup/routines` | OK com ressalva | tela abre, navega e sempre materializa a rotina protegida `Warmup 24/7`; se o runtime estiver sem token/mensagens carregadas, ela pode aparecer zerada |
| Telemetria | `/warmup/telemetry` | OK | tela abre com cards e atalhos |
| Device Lab | `/warmup/device-lab` | OK | tela abre e renderiza a superficie operacional |
| Auto-regeneracao | `/warmup/auto-regeneration` | OK | tela abre e renderiza a leitura da fila de cura |
| Relatorios | `/warmup/reports` | OK | tela abre e mostra leitura executiva |
| Grupos | `/warmup/groups` | OK | tela abre e lista grupos por instancia |
| Mensagens | `/warmup/messages` | OK | tela abre e exibe biblioteca de mensagens |
| Logs | `/warmup/logs` | OK | tela abre e lista registros |
| Configuracoes | `/warmup/settings` | OK | tela abre e mostra `Server URL`, `Admin Token`, padroes de warmup e o botao `Remover token` quando existir segredo ativo |

## Observacoes operacionais

- O dashboard agora e a tela de entrada do manager.
- A ausencia de `adminToken` ainda limita a operacao real do warmup, mas nao derruba mais a interface.
- Quando existir token ativo mascarado no runtime, a tela de configuracoes agora oferece um caminho explicito para limpeza do segredo.
- A rotina `Warmup 24/7 Padrão` agora e protegida no runtime: nao pode sumir da UI por sincronizacao e nao deve ser excluida.

## URLs uteis

Local:

- `http://127.0.0.1:8787/`
- `http://127.0.0.1:8787/warmup/`
- `http://127.0.0.1:8787/warmup/settings`

Publico:

- `http://app.ruptur.cloud/`
- `http://app.ruptur.cloud/warmup/`
- `http://app.ruptur.cloud/warmup/settings`
