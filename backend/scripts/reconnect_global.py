import requests
import sys
import os

# Script de Reconexão Global Ruptur -> KVM2
# Este script percorre as instâncias da Uazapi e atualiza o Webhook para o novo backend.

UAZAPI_URL = "https://tiatendeai.uazapi.com"
UAZAPI_TOKEN = "UmiLwsiyjN01ipt5XuaU97vC4PTyPwHfhFN15CyHvJklANTzGX"

def reconnect(public_url):
    print(f"🚀 Iniciando Reconexão Global para: {public_url}")
    webhook_endpoint = f"{public_url.rstrip('/')}/api/v1/uazapi/webhook"
    
    headers = {"admintoken": UAZAPI_TOKEN}
    
    # 1. Listar instâncias
    resp = requests.get(f"{UAZAPI_URL}/instance/all", headers=headers)
    if resp.status_code != 200:
        print(f"❌ Erro ao listar instâncias: {resp.status_code}")
        return

    instances = resp.json()
    print(f"📦 Encontradas {len(instances)} instâncias.")

    for inst in instances:
        name = inst.get('name')
        token = inst.get('token')
        
        print(f"🔄 Atualizando {name}...", end=" ", flush=True)
        
        # Endpoint de configuração de webhook na Uazapi
        # Baseado no padrão da API, vamos tentar o POST /instance/settings
        payload = {
            "webhook": {
                "enabled": True,
                "url": webhook_endpoint,
                "events": [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "MESSAGES_DELETE",
                    "CONTACTS_UPSERT",
                    "CONTACTS_UPDATE",
                    "PRESENCE_UPDATE",
                    "CHATS_UPSERT",
                    "CHATS_UPDATE",
                    "CHATS_DELETE"
                ]
            }
        }
        
        set_resp = requests.post(
            f"{UAZAPI_URL}/instance/settings", 
            headers={"token": token},
            json=payload
        )
        
        if set_resp.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ Falha ({set_resp.status_code})")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python reconnect_global.py <URL_PUBLICA_DO_BACKEND>")
        print("Exemplo: python reconnect_global.py https://seu-tunel.ngrok-free.app")
        sys.exit(1)
    
    reconnect(sys.argv[1])
