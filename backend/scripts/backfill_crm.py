import requests
import json
import time

UAZAPI_URL = "https://tiatendeai.uazapi.com"
UAZAPI_TOKEN = "UmiLwsiyjN01ipt5XuaU97vC4PTyPwHfhFN15CyHvJklANTzGX"
BACKEND_URL = "http://localhost:8000/api/v1/uazapi/webhook"

def backfill_crm():
    print("📥 Iniciando Backfill de CRM (Uazapi -> KVM2 Local)...")
    headers = {"admintoken": UAZAPI_TOKEN}
    
    # 1. Listar instâncias
    resp = requests.get(f"{UAZAPI_URL}/instance/all", headers=headers)
    if resp.status_code != 200:
        print(f"❌ Erro ao listar: {resp.status_code}")
        return
    
    instances = resp.json()
    total = len(instances)
    print(f"📦 Processando {total} instâncias...")

    for i, inst in enumerate(instances):
        name = inst.get('name')
        token = inst.get('token')
        print(f"[{i+1}/{total}] 🔍 Lendo chats da instância {name}...", end=" ", flush=True)
        
        # 2. Pegar conversas recentes
        # O endpoint /chat/all costuma retornar a lista de conversas
        chats_resp = requests.get(f"{UAZAPI_URL}/chat/all", headers={"token": token})
        if chats_resp.status_code == 200:
            chats = chats_resp.json()
            if isinstance(chats, list):
                print(f"✅ {len(chats)} chats encontrados. Simulando webhooks...", end=" ")
                for chat in chats[:10]: # Pegar os 10 mais recentes para não sobrecarregar
                    # Simula um webhook de mensagem para o nosso backend local
                    # O uazapi_ingest.py vai processar isso como se fosse real
                    try:
                        webhook_payload = {
                            "instance": name,
                            "data": {
                                "chatId": chat.get('id'),
                                "senderName": chat.get('name') or chat.get('pushname'),
                                "text": chat.get('lastMessage', {}).get('text') or "Mensagem histórica sincronizada",
                                "fromMe": chat.get('lastMessage', {}).get('fromMe', False),
                                "messageid": chat.get('lastMessage', {}).get('id', f"hist_{time.time()}"),
                                "type": "text"
                            }
                        }
                        requests.post(BACKEND_URL, json=webhook_payload)
                    except Exception:
                        pass
                print("Concluído.")
            else:
                print("⚠️ Sem chats.")
        else:
            print(f"❌ Erro ({chats_resp.status_code})")

if __name__ == "__main__":
    backfill_crm()
