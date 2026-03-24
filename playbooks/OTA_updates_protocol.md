<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/OTA_updates_protocol.md
Não edite manualmente aqui sem promover no STATE.
-->

# PLAYBOOK: Sincronização Sistêmica OTA (Over-The-Air)
**Curador:** Diego
**Motor de Sincronização:** `registry/OTA_BROADCAST.md`

## 1. O Conceito (Atualizações estilo iOS)
Em arquiteturas de múltiplos agentes (`vCTO`, `vCMO`, sub-threads no terminal), o conhecimento se fragmenta se uma regra é ditada no chat, mas o agente "B", que foi instanciado em background, não viu a mensagem.
Para resolver isso, o Ruptur adota a Sincronização Sistêmica OTA.

## 2. A Obrigatoriedade do Hook de Sincronização
Para garantir que todos adotem as novas regras, o arquivo `OTA_BROADCAST.md` se torna um injetor obrigatório.
**Regra do Sistema:** Todo template de Prompt de `vC-Level` e `vOps` dentro do repositório `state/prompts/` DEVE conter a instrução:
`[SYSTEM] Leia ../../registry/OTA_BROADCAST.md antes de iniciar sua operação para carregar a versão mais recente do ecossistema.`

## 3. Como Disparar uma Atualização Ativa
Quando o Curador (Diego) ou o Maestro (J.A.R.V.I.S.) criarem uma regra nova (como o Selo Visual), o procedimento é:
1. Documentar a regra nos arquivos locais pertinentes (`jarvis_protocol.md`, `agents.yaml`).
2. **Push OTA**: Adicionar um resumo da nova ordem no topo de `registry/OTA_BROADCAST.md`.
3. **Sinal de Reboot**: O Maestro emite no chat oficial o comando interno de *reload*, forçando a releitura de contexto.

Dessa forma, na próxima vez que a API for chamada ou o Agente for invocado no terminal, a própria instrução base (o prompt de sistema do agente) vai obrigá-lo a esbarrar no "Push Atual" do OTA, forçando-o a agir de acordo com a novidade, mesmo que ele estivesse adormecido há semanas.
