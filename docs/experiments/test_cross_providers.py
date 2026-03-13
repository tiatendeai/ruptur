import urllib.request
import json
import base64
import time
import os

# ==========================================
# 1) CONFIGURAÇÕES UAZAPI (DEFAULT)
# ==========================================
uazapi_base_url = "https://tiatendeai.uazapi.com"
uazapi_instance_token = "43efa243-2c94-48cb-b119-4b55e849b773"

# ==========================================
# 2) CONFIGURAÇÕES BAILEYS (VPS SELF-HOSTED)
# ==========================================
baileys_base_url = "https://baileys.ruptur.cloud"
baileys_instance_id = "default"

# ALVOS (SEM O NÚMERO 9 PARA CONTORNAR O BUG DE SYNC DO WHATSAPP MOBILE)
target_diego_comercial = "553189131980"
target_diego_pessoal = "553181139540"

tests = [
    {
        "provider": "UAZAPI",
        "url": f"{uazapi_base_url}/send/text",
        "headers": {"token": uazapi_instance_token, "Content-Type": "application/json"},
        "target": target_diego_comercial,
        "persona": "Stephanie",
        "emoji": "👱‍♀️",
        "text": "*Stephanie (Via UAZAPI)*:\nOi Di (5531989131980)! Testando o gateway principal da Uazapi. Tudo fluindo perfeitamente pelo pipeline default! ✨"
    },
    {
        "provider": "BAILEYS",
        "url": f"{baileys_base_url}/send/text",
        "headers": {"x-instance-id": baileys_instance_id, "Content-Type": "application/json"},
        "target": target_diego_pessoal,
        "persona": "Jarvis",
        "emoji": "🤖",
        "text": "*Jarvis (Via VPS Baileys)*:\nOlá, Diego (5531981139540)! Testando nossa infraestrutura self-hosted no host2. O webhook recebeu os eventos atômicos e o traefik respondeu em ms."
    },
    {
        "provider": "UAZAPI",
        "url": f"{uazapi_base_url}/send/text",
        "headers": {"token": uazapi_instance_token, "Content-Type": "application/json"},
        "target": target_diego_pessoal,
        "persona": "Ruptur",
        "emoji": "🌩️",
        "text": "*Ruptur OS (Via UAZAPI)*:\n[SISTEMA RUPTUR]\nNotificação de Infra: Roteamento cruzado validado. Mensagem entregue a 5531981139540 via provider legacy."
    }
]

print("--- INICIANDO TESTE DE GATEWAY (UAZAPI & BAILEYS) ---")

for t in tests:
    print(f"\n[{t['emoji']}] Roteando mensagem de {t['persona']} via {t['provider']} para {t['target']}...")
    payload = json.dumps({
        "number": t['target'],
        "text": t['text']
    }).encode('utf-8')
    
    req = urllib.request.Request(t['url'])
    for key, val in t['headers'].items():
        req.add_header(key, val)
    
    try:
        with urllib.request.urlopen(req, data=payload) as response:
            print(f"[{t['provider']}] Status: {response.getcode()}")
            print(f"[{t['provider']}] Resposta: {response.read().decode('utf-8')}")
    except Exception as e:
        print(f"[{t['provider']}] Erro: {e}")
    
    time.sleep(3)
