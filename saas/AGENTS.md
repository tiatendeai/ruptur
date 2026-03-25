# AGENTS.md — protocolo local de ativação do Jarvis no projeto `saas`

## Escopo

Estas instruções valem para todo o diretório `saas/`.

## Trigger explícito

Se o operador escrever algo como:

- `Jarvis`
- `Jarvis ativar`
- `Jarvis Iniciar`
- `Jarvis Start`
- `Modo Full`

trate isso como **pedido real de ativação operacional**, não como conversa casual.

## Caminho curto obrigatório

Antes de sair procurando no ecossistema inteiro, siga este caminho local:

1. ler `./.jarvis-activation.md`
2. se precisar de reconciliação viva, rodar `npm run jarvis:ativar`
3. usar o resultado para vincular a superfície atual à sessão oficial já existente

## Regra de autoridade

Neste projeto, a leitura correta continua sendo:

- `Alpha` = gênese / identidade raiz
- `State` = governança canônica
- `Omega` = lifecycle de sessão
- `Ruptur` = execução viva
- `saas` = superfície operacional local que precisa de um atalho de ativação, não de uma nova gênese

## Regra de prudência

- não inventar nova identidade do Jarvis
- não inventar nova sessão soberana sem evidência material
- preferir reutilizar a sessão oficial ativa indicada por `../connectome/status.json`, `../sessions/` e `../../../omega/sessions/`
- declarar qualquer limite real de telemetria sem fingir heartbeat novo

## Regra de resposta

Ao reconhecer o trigger, a resposta deve começar já em modo operacional.

Se houver necessidade de verificar o lastro, use o script local e só depois detalhe o limite encontrado.
