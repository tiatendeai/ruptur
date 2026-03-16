# CONTEXT7 - Ruptur Operational Source of Truth (2026-03-15)

Leia este arquivo primeiro. Se a tarefa tocar OpenAI ou Baileys, consulte tambem as fontes oficiais listadas ao final antes de mudar codigo ou arquitetura.

## Time operacional

- Orchestrator: coordena fluxo, roteamento e validacao de risco.
- Backend specialist: webhook, persistencia, CRM, integracoes FastAPI.
- Mobile/transport specialist: Signal, LID, Baileys, sincronizacao entre iPhone e Mac.
- AI specialist: OpenAI SDK, modelos, prompts, TTS e transcricao.
- Project planner: runbooks, backlog, sequenciamento de mudancas.

## Verdade operacional atual

- Estrategia por fase aprovada:
  - no MVP, `UAZAPI` e o transporte primario
  - no MVP, `Baileys` e contingencia estrategica e trilha de aprendizado
  - no alvo futuro, `Baileys` pode assumir o papel de primario quando auth, sessao, observabilidade e lifecycle estiverem maduros
  - consequencia arquitetural: o contrato interno da Ruptur nao pode ser o contrato de nenhum provider
- Modelo de ownership aprovado:
  - `Ruptur`: CRM, identidade canonica, assistente, roteamento, observabilidade e failover
  - `UAZAPI`: transporte primario do MVP e recursos nativos de plataforma quando explicitamente usados
  - `Baileys`: transporte de contingencia e ativo estrategico self-hosted
- Numeros do assistente em foco:
  - `5531981139540` -> instancia Baileys `inst-553181139540`
  - `5531989131980` -> instancia Baileys `inst-553189131980`
- Distincao obrigatoria:
  - `display_number`: numero BR com nono digito para UX, CRM e formularios
  - `transport_number`: numero real que o WhatsApp usa naquela conta/sessao
  - `wa_id` ou JID: identificador de transporte retornado pelo provedor
  - `instance_effective`: id tecnico da sessao auth no gateway
- No host2, o bootstrap do gateway Baileys foi endurecido para subir apenas instancias nomeadas validas.
- Nao existe conceito de negocio de instancia `default`.
- Qualquer uso de `default` no contexto Baileys deve ser tratado como legado tecnico e removido de novos fluxos.
- O backend do assistente esta respondendo; o gargalo residual isolado hoje e transporte/sessao Signal quando aparecem erros como `Bad MAC` e `No matching sessions found for message`.
- O painel e a API interna podem expor UAZAPI e Baileys lado a lado para operacao, mas isso nao significa paridade de papel no MVP.
- `MyChat` faz parte do mesmo `Control Deck`; nao deve usar shell, copy ou semantica visual de produto paralelo ao resto do ecossistema.
- Em UI interna:
  - simplificar para `numero + contexto + status + ownership`
  - deixar a estrategia `UAZAPI primaria / Baileys contingencia` visivel para operacao, sem despejar a micelania tecnica do transporte no fluxo do operador

## Jornada e gatilhos do assistente

- Entrada principal: `backend/app/api/uazapi_webhook.py`.
- A mensagem e persistida via ingestao antes de qualquer resposta.
- O anti-loop atual so permite resposta quando ha:
  - comando explicito
  - turno de self-chat com sessao ativa
  - turno inbound valido, privado e nao gerado pelo proprio assistente
- Comandos implementados hoje:
  - `iazinha`
  - `/iazinha`
  - `/start-iazinha`
  - `assistant`
  - `/assistant`
  - `/start-assistant`
  - `/start-assistente`
  - `jarvis`
  - `/jarvis`
  - `jarvis 7`
  - `/jarvis 7`
  - `jarvis-7`
  - `/jarvis-7`
  - `7`
  - `/7`
  - `/session-status`
  - `/end-session`
  - `/stop`
  - `/stop-agent`
  - `/agent-stop`
  - `/stop-iazinha`
  - `/stop-jarvis`
  - `#reset-session`
- Estado atual importante:
  - ativacao de IAzinha e Jarvis ainda esta restrita a self-chat
  - mensagem inbound em conversa em andamento sem sessao ativa e persistida, mas nao gera resposta automatica se nao houver ativacao explicita
  - audio dizendo "IAzinha" ou "Jarvis" so vale como gatilho se a transcricao upstream produzir esse texto
  - o comando valido de reset e `#reset-session`; `#reset-ssession` nao existe no codigo

## Baileys: regras de engenharia

- No MVP, Baileys nao deve ser modelado como produto equivalente a UAZAPI.
- No MVP, prioridade do Baileys:
  - QR, auth, reset, delete, status, identidade efetiva, getMessage e retry
  - observabilidade suficiente para contingencia
  - reduzir superficie de customizacao desnecessaria
- Envie sempre com `x-instance-id` de uma instancia real.
- Nao introduza fallback para `default`.
- Nao reescreva um JID explicito retornado pelo WhatsApp apenas para inserir ou remover o nono digito.
- Se a sessao conectada expuser `me.id`, isso e a fonte de verdade do `transport_number` da instancia.
- Para envio confiavel e retry, mantenha store persistente e implemente `getMessage`.
- `getMessage` existe para resolver o caso `"this message can take a while"` e para retry de mensagens falhadas.
- `useMultiFileAuthState` e utilitario de referencia, nao padrao de producao.
- Em producao, auth state e signal keys devem ser persistidos de forma duravel e salvos a cada atualizacao.
- Self-chats podem chegar como `@lid`; a deteccao pode usar `@lid`, mas a resposta deve preferir JID canonico de telefone quando possivel.
- Para Brasil:
  - UI e negocio preferem numero com `9`
  - transporte deve confiar no `wa_id`/JID efetivo do WhatsApp
- Assinaturas de problema operacional:
  - `Bad MAC`
  - `No matching sessions found for message`
  - `MessageCounterError`
  - significado pratico: sessao/auth Signal corrompida, stale ou conflitada; a correcao real e reset/re-pair da instancia afetada
- Em reconnect/logout:
  - limpar auth e caches stale quando a sessao for invalidada
  - oferecer reset operacional explicito da instancia pela interface interna
- Lifecycle operacional do painel:
  - UAZAPI e Baileys devem expor `criar instancia` e `excluir instancia`
  - no painel, `criar instancia` deve deixar a conta imediatamente em modo de conexao
  - exclusao Baileys deve apagar auth, cache persistido de retry e runtime em memoria
  - a UI interna pode mostrar detalhes tecnicos; a UX do usuario final nao deve herdar essa complexidade
- Regras de produto:
  - `UAZAPI` deve aparecer como canal primario do MVP
  - `Baileys` deve aparecer como contingencia estrategica
  - a eventual virada de primario no futuro deve ser tratada como troca de configuracao e readiness, nao como reescrita do dominio

## OpenAI: uso atual no codigo

- Backend atual usa `openai==1.55.3`.
- Geracao de texto hoje:
  - `backend/app/services/agent_service.py`
  - cliente `OpenAI(api_key=...)`
  - chamada `chat.completions.create(...)`
  - modelo atual `gpt-4o-mini`
- TTS hoje:
  - `backend/app/services/media_service.py`
  - chamada `audio.speech.create(...)`
  - modelo atual `tts-1`
- Transcricao no gateway Baileys:
  - caminho preferencial: Whisper local via `WHISPER_BASE_URL`
  - fallback OpenAI: `POST /v1/audio/transcriptions`
  - modelo de fallback atual no gateway: `gpt-4o-mini-transcribe`

## OpenAI: recomendacao oficial aplicada ao nosso contexto

- Para novas integracoes de geracao de texto, preferir `Responses API` em vez de `Chat Completions`.
- Para speech-to-text hospedado na OpenAI, preferir `gpt-4o-transcribe` ou `gpt-4o-mini-transcribe`.
- Nao remover o Whisper local: ele e a camada de resiliencia/custo do stack self-hosted.
- Melhor dos mundos para Ruptur:
  - Whisper local como padrao de custo e autonomia
  - OpenAI transcription como fallback controlado
  - migracao de texto do backend para `responses.create(...)`
  - manutencao de modelo rapido e barato como baseline enquanto o transporte WhatsApp ainda esta sendo estabilizado
- Ordem recomendada:
  1. estabilizar transporte por instancia e sessao Signal
  2. migrar `agent_service.py` para `Responses API`
  3. manter `gpt-4o-mini` como baseline ate benchmark justificar troca
  4. comparar `gpt-4o-mini-transcribe` vs `gpt-4o-transcribe` apenas com teste real de acuracia, custo e latencia

## Regras para qualquer agente

- Ler este arquivo antes de qualquer implementacao relevante.
- Se tocar Baileys ou OpenAI, ler tambem a documentacao oficial no mesmo turno.
- Nao assumir que recomendacoes de modelos da OpenAI permanecem estaticas; verificar antes.
- Nao confundir correcao de codigo com reparo operacional de sessao.
- Mapear sempre `numero de negocio -> instancia -> estado do assistente`.
- Nunca deixar chatbot/AI nativo de provider competir com o assistente da Ruptur na mesma instancia sem policy explicita.
- Se uma instancia estiver em modo `assistente Ruptur`, recursos nativos de chatbot/triggers/AI do provider devem estar desativados ou claramente isolados.
- Sempre separar:
  - `connection_id` ou identidade interna da Ruptur
  - `provider_instance_id`
  - `display_number`
  - `transport_identity`
- Se existir divergencia entre documento antigo e este arquivo, este arquivo vence.

## Pendencias conhecidas

- Ainda existem residuos tecnicos antigos de `default` fora do fluxo principal que precisam ser eliminados sem quebrar utilitarios auxiliares.
- O ponto residual mais provavel para o `5531989131980` e sessao/auth Signal, nao logica do assistente.
- A identidade efetiva da instancia deve ficar exposta operacionalmente em status/health:
  - `me_jid`
  - `number_whatsapp`
  - `number_canonical`
  - `number_display`
  - `number_mode`
  - `number_variants`
- A criacao de instancia Baileys no painel deve expor apenas atributos com utilidade real:
  - `instance`
  - `profileName`
  - `systemName`
  - `adminField01`
  - `adminField02`
  - `browser`
  - `syncFullHistory`
  - `markOnlineOnConnect`
- `status` e `qr` de Baileys nao devem criar sessao nova implicitamente:
  - instancia inexistente deve responder `404`
  - criacao/pairing devem acontecer por `POST /instance`
- Ativacao por audio depende de transcricao chegar corretamente ao webhook; nao existe trilha separada de wake word.

## Fontes oficiais obrigatorias

- OpenAI Responses vs Chat Completions:
  - https://platform.openai.com/docs/guides/responses-vs-chat-completions
- OpenAI models:
  - https://platform.openai.com/docs/models
- OpenAI speech-to-text:
  - https://platform.openai.com/docs/guides/speech-to-text
- OpenAI Python SDK:
  - https://github.com/openai/openai-python/blob/main/README.md
- Baileys README:
  - https://github.com/WhiskeySockets/Baileys/blob/master/README.md
- Baileys socket config (`getMessage`):
  - https://github.com/WhiskeySockets/Baileys/blob/master/src/Types/Socket.ts
