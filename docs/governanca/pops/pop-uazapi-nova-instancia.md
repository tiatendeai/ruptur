# POP — UAZAPI: criar e conectar nova instância

Diretriz: **usar fluxo nativo da UAZAPI** (não duplicar no Ruptur).

## Objetivo

Criar uma instância (chip) na uazapi e conectá-la via QR/pairing, deixando pronta para envio/recebimento.

## Pré-requisitos

- `admintoken` válido (admin da uazapi)
- acesso ao painel/ambiente onde o QR será escaneado

## Passo a passo (nativo UAZAPI)

1) Criar instância:
- `POST /instance/init` (header `admintoken`)

2) Conectar instância:
- `POST /instance/connect` (header `token` da instância)
  - sem `phone` → QR
  - com `phone` → pair code

3) Monitorar:
- `GET /instance/status` (header `token`)
  - estado `connecting` → QR disponível
  - estado `connected` → pronto

## Observação (orquestração pelo Ruptur)

O Ruptur pode:
- listar instâncias (`/instance/all`) e escolher por `name/id`
- acionar connect
- expor `qrcode.png` como PNG para facilitar scan

Mas o “controle” de instâncias é sempre da uazapi.

