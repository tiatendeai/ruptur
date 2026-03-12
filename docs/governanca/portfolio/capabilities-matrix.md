# Matriz de capacidades (UAZAPI x Baileys) — Ruptur

Objetivo: decidir *antes* “quem faz o quê” e manter o produto focado em **orquestração**.

Legenda:

- ✅ = nativo (usar)
- ⚠️ = existe, mas pode ser inconsistente/limitado
- 🧩 = não existe nativo; só implementar no Ruptur/Baileys se necessário

## Controle / multi-tenant

- Multi-instância (criar/listar): UAZAPI ✅ (`admintoken` + `/instance/init`, `/instance/all`) | Baileys 🧩 (precisa camada)
- Connect/status/QR: UAZAPI ✅ | Baileys ✅ (mas via wrapper)
- Webhooks (mensagens/eventos): UAZAPI ✅ | Baileys 🧩 (precisa encaminhar eventos)
- Delay/warmup por instância: UAZAPI ✅ (`/instance/updateDelaySettings`) | Baileys 🧩 (precisa fila/política)

## Envio (core)

- Texto: UAZAPI ✅ | Baileys ✅
- Mídia (imagem/vídeo/doc): UAZAPI ✅ | Baileys ✅
- Áudio/PTT: UAZAPI ✅ | Baileys ✅
- Status: UAZAPI ✅ | Baileys ✅ (parcial, depende do formato)

## Interativos (botões/menus)

- Botão com link “renderizado”: UAZAPI ✅ | Baileys ⚠️ (no Baileys puro costuma “virar texto”; melhora muito usando `nativeFlowMessage` + helper que injeta nodes)
- Fallback garantido (link clicável no texto): UAZAPI ✅ | Baileys ✅ (deve sempre enviar URL no corpo)

## IA (opcional)

- Transcrição: UAZAPI ⚠️ (depende do setup) | Baileys 🧩 (nossa stack com Whisper local já cobre)

## Regra de roteamento (recomendada)

1) `provider=auto`
   - tenta UAZAPI
   - fallback para Baileys em: timeout, 5xx, rate limit, instância desconectada
2) Se a feature é “interativo” e precisa renderização perfeita:
   - preferir UAZAPI
   - em Baileys, enviar interativo + URL no texto como fallback
