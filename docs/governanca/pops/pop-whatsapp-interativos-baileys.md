# POP — Mensagens interativas no Baileys (compatível com UAZAPI `/send/menu`)

Objetivo: padronizar envio de **interativos** no fallback/contingência (Baileys) usando o *mesmo payload* do endpoint UAZAPI `/send/menu`, evitando criar “dialetos” diferentes na operação.

Diretriz: **UAZAPI primeiro**. Baileys entra para contingência e para cobrir gaps.

## Método (resumo)

1. Receber o payload no formato UAZAPI (`type=button|list`).
2. Montar `interactiveMessage + nativeFlowMessage` no Baileys.
3. **Injetar nodes obrigatórios** para renderização (via `baileys_helper`).
4. Enviar com fallback:
   - Se houver `urlButton`, incluir a URL no corpo do texto (cliente que não renderiza ainda tem link clicável).
   - Se falhar, enviar fallback text-only com o resumo das opções.

## Ferramenta (por que funciona)

No Baileys “puro”, muitos formatos interativos podem chegar como **texto** dependendo do cliente (iOS/Android/Web) e das mudanças do WhatsApp.

O pacote `baileys_helper` melhora a taxa de renderização porque envia a mensagem interativa com os *binary nodes* esperados pelo WhatsApp (ex.: `biz`, `interactive`, `native_flow` e, em 1:1, `bot`).

Implementação: `deploy/host2/baileys/src/index.mjs:451`.

## Compatibilidade de payload (UAZAPI → Baileys)

### `type: "button"`

Suporta os formatos de `choices` (UAZAPI):

- **Quick reply**: `"texto|id"` ou `"texto"` (id = texto)
- **URL**: `"texto|https://..."` ou `"texto|url:https://..."`
- **Call**: `"texto|call:+55..."`
- **Copy**: `"texto|copy:CODIGO"`

### `type: "list"`

Suporta:

- Seções: `"[Título da Seção]"`
- Linhas: `"texto|id|descrição"` (id/descrição opcionais)

Requer: `listButton`.

## Exemplos (curl)

Assumir:

- Base URL: `https://baileys.statuspersianas.com.br`
- Header de instância: `x-instance-id: default` (ou outro id conectado)

### 1) Botões quick reply (id)

```bash
curl -X POST 'https://baileys.statuspersianas.com.br/send/menu' \
  -H 'content-type: application/json' \
  -H 'x-instance-id: default' \
  -d '{
    "number": "5531989131980",
    "type": "button",
    "text": "Como posso ajudar?",
    "footerText": "Escolha uma opção",
    "choices": [
      "Suporte|suporte",
      "Financeiro|financeiro",
      "Falar com humano|humano"
    ]
  }'
```

### 2) Botão com link (URL)

```bash
curl -X POST 'https://baileys.statuspersianas.com.br/send/menu' \
  -H 'content-type: application/json' \
  -H 'x-instance-id: default' \
  -d '{
    "number": "5531989131980",
    "type": "button",
    "text": "Abrir site:",
    "footerText": "Ruptur",
    "choices": ["Abrir|https://statuspersianas.com.br"]
  }'
```

### 3) Lista (single select) com seções

```bash
curl -X POST 'https://baileys.statuspersianas.com.br/send/menu' \
  -H 'content-type: application/json' \
  -H 'x-instance-id: default' \
  -d '{
    "number": "5531989131980",
    "type": "list",
    "text": "Catálogo",
    "footerText": "Selecione um item",
    "listButton": "Ver opções",
    "choices": [
      "[Eletrônicos]",
      "Smartphones|phones|Últimos lançamentos",
      "Notebooks|notes|Modelos 2024",
      "[Acessórios]",
      "Capas|cases|Proteção",
      "Fones|fones|Bluetooth"
    ]
  }'
```

## Checklist de validação

- Confirmar `/health` indica `connection: "open"`.
- Validar em **iOS e Android** (botões e lista).
- Se URL button não renderizar em algum cliente, confirmar que o link aparece no corpo (fallback).

