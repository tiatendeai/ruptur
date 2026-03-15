from __future__ import annotations
import os
import uuid
import logging
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks

from app.db import DatabaseNotConfiguredError, connect
from app.services.uazapi_ingest import ingest_uazapi_webhook, extract_message_fields
from app.services.agent_service import agent_service
from app.clients.uazapi import UazapiClient
from app.clients.baileys import BaileysClient
from app.services.media_service import media_service
from app.repositories import crm_repo
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

def neutralize_br_number(number: str) -> str:
    """
    Remove o nono dígito de números brasileiros (especialmente DDD 31) 
    para contornar o bug de sincronização do WhatsApp Mobile.
    Ex: 5531989131980 -> 553189131980
    """
    digits = "".join(ch for ch in number if ch.isdigit())
    if digits.startswith("55") and len(digits) == 13 and digits[4] == "9":
        return digits[:4] + digits[5:]
    return digits

async def process_ai_response(payload: dict[str, Any], lead_id: str, conversation_id: str, last_msg: str, message_id: str):
    """
    Processa a resposta da IA em segundo plano.
    """
    print(f"[DEBUG] Starting process_ai_response for lead={lead_id} conv={conversation_id} msg_id={message_id}")
    try:
        with connect() as conn:
            # Pegar dados do lead
            lead = conn.execute(
                """
                SELECT name, phone, source, paused, manual_override
                FROM leads
                WHERE id = %s
                """,
                (lead_id,),
            ).fetchone()
            if not lead:
                print(f"[DEBUG] Lead {lead_id} not found in DB")
                return
            
            lead_name, lead_phone, lead_source, paused, manual_override = lead
            
            # UX: Inicia 'digitando...' imediatamente no WhatsApp (via Baileys)
            is_baileys = "instance" in payload or "jid" in payload.get("data", {})
            target_jid = None
            if is_baileys and settings.baileys_base_url:
                try:
                    chatid = payload.get("data", {}).get("chatid")
                    target_jid = chatid if chatid and "@" in chatid else f"{lead_phone}@s.whatsapp.net"
                    client = BaileysClient(base_url=settings.baileys_base_url, instance_id=settings.baileys_instance_id)
                    client.send_presence(jid=target_jid, presence="composing")
                except:
                    pass

            print(f"[DEBUG] Processing for {lead_name} ({lead_phone})")
            
            # Puxar histórico recente (excluindo a mensagem atual que já foi passada)
            history_rows = crm_repo.list_messages(conn, conversation_id=conversation_id, limit=10)
            history = []
            for m in reversed(history_rows):
                if m.id == message_id:
                    continue # Pula a mensagem atual pois ela será o 'last_message'
                role = "assistant" if m.direction == "out" else "user"
                history.append({"role": role, "content": m.body or ""})
            
            print(f"[DEBUG] Reconstructed history (context): {json.dumps(history, ensure_ascii=False)}")
            print(f"[DEBUG] Current message (trigger): '{last_msg}'")
            
            # Gerenciamento de Persona e Estado (Sessão)
            metadata = crm_repo.get_conversation_metadata(conn, conversation_id=conversation_id)
            active_persona = metadata.get("active_persona", "iazinha")
            last_activity = metadata.get("last_activity")
            
            # Lógica de Timeout (30 minutos)
            from datetime import datetime
            now_iso = datetime.now().isoformat()
            if last_activity and active_persona == "jarvis":
                try:
                    last_dt = datetime.fromisoformat(last_activity)
                    diff = (datetime.now() - last_dt).total_seconds()
                    if diff > 1800: # 30 min
                        active_persona = "iazinha"
                        print(f"[DEBUG] Session timeout (Jarvis -> IAzinha) after {diff}s")
                except:
                    pass
            
            # Atualiza última atividade
            metadata["last_activity"] = now_iso
            
            # Lógica de Troca de Persona / Password Challenge
            msg_body = last_msg or ""
            msg_lower = msg_body.lower().strip()
            
            # 1. Solicitação de Ativação do Jarvis
            if active_persona == "iazinha" and ("jarvis" in msg_lower or "senhor jarvis" in msg_lower):
                # Se já mandou a senha na mesma frase (ex: "Jarvis 7")
                if "7" in msg_lower:
                    active_persona = "jarvis"
                    metadata["active_persona"] = "jarvis"
                    crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)
                    response_text = "*Jarvis:* Protocolo de segurança validado. Em que posso ajudá-lo hoje, senhor?"
                else:
                    # Desafio de Senha
                    response_text = "*IAzinha:* Identidade de nível superior detectada. Aguardando chave de ativação para prosseguir com o Protocolo Jarvis."
                    print(f"[DEBUG] Password challenge sent for Jarvis activation.")
                    # Pula o restante e manda o desafio
                    external_id = crm_repo.store_out_message(conn, conversation_id=conversation_id, text=response_text, raw={"system_challenge": True})
                    conn.commit()
                    if is_baileys and settings.baileys_base_url:
                        client.send_menu(jid=target_jid, text=response_text, choices=["Digitar Senha", "Cancelar"], footer="Segurança Jarvis 🦾")
                    else:
                        clean_number = neutralize_br_number(lead_phone)
                        client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
                        client.send_text(number=clean_number, text=response_text)
                    return

            # 2. Recebimento da Senha isolada
            elif active_persona == "iazinha" and msg_lower == "7":
                active_persona = "jarvis"
                metadata["active_persona"] = "jarvis"
                crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)
                response_text = "*Jarvis:* Acesso concedido. Protocolo de ativação concluído. Como posso ajudar?"
            
            # 3. Resposta Normal (ou Jarvis já ativo)
            else:
                response_text = agent_service.get_response(
                    lead_name=lead_name or lead_phone or "Cliente",
                    last_message=msg_body,
                    history=history,
                    persona=active_persona
                )
                
                # Se estiver no modo Jarvis e encerrar, reseta persona nos metadados
                if active_persona == "jarvis" and ("encerrar" in msg_lower or "tchau" in msg_lower or "obrigado" in msg_lower):
                    active_persona = "iazinha"
                    metadata["active_persona"] = "iazinha"
                
                # Salva o estado atualizado (persona e timestamp)
                metadata["active_persona"] = active_persona
                crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)

            # Define a voz baseada na assinatura da resposta
            voice = "onyx" if "*Jarvis:*" in response_text else "nova"
            print(f"[DEBUG] Session Persona: {active_persona} | Voice: {voice}")

            # Decidir se envia áudio
            wants_audio = "[Áudio Transcrito]" in last_msg or any(x in last_msg.lower() for x in ["áudio", "audio", "auio", "voz", "mande um áudio", "manda áudio", "manda audio"])
            audio_data = None
            if wants_audio:
                # UX: Muda para 'gravando áudio...'
                if is_baileys and settings.baileys_base_url:
                    try:
                        client.send_presence(jid=target_jid, presence="recording")
                    except:
                        pass
                
                audio_text = response_text.split(":", 1)[-1].strip() # Remove a assinatura do áudio
                audio_data = media_service.text_to_speech_openai(audio_text, voice=voice)
            
            # Salvar no banco
            external_id = crm_repo.store_out_message(
                conn, 
                conversation_id=conversation_id, 
                text=response_text, 
                raw={"processed_by": "jarvis_ai", "audio_generated": audio_data is not None}
            )
            conn.commit()
            print(f"[DEBUG] Stored Jarvis response message id: {external_id}")

            # Enviar via Provedor correto
            chatid = payload.get("data", {}).get("chatid")
            is_baileys = "instance" in payload or "jid" in payload.get("data", {})
            
            if is_baileys and settings.baileys_base_url:
                if audio_data:
                    print(f"[DEBUG] Sending PTT via Baileys to {target_jid} (base64, {len(audio_data)} bytes)")
                    res = client.send_voice_jid(jid=target_jid, audio_data=audio_data)
                    # Envia botões logo após o áudio para manter a conversa fluida
                    client.send_menu(
                        jid=target_jid,
                        text="O que deseja fazer agora?",
                        choices=["Encerrar conversa", "Fazer nova pergunta"],
                        footer="Jarvis 🦾"
                    )
                else:
                    print(f"[DEBUG] Sending via Baileys (Interactive Menu) to {target_jid}")
                    # Envia a resposta de texto diretamente no corpo do menu de botões (mais eficiente)
                    res = client.send_menu(
                        jid=target_jid,
                        text=response_text,
                        choices=["Encerrar conversa", "Fazer nova pergunta"],
                        footer="Jarvis 🦾"
                    )
                
                # UX: Finaliza o status visual
                try:
                    client.send_presence(jid=target_jid, presence="paused")
                except:
                    pass
                print(f"[DEBUG] Baileys response: {res}")
            elif settings.uazapi_base_url and settings.uazapi_token:
                clean_number = neutralize_br_number(lead_phone)
                client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
                
                if audio_data:
                    filename = f"{uuid.uuid4()}.mp3"
                    file_path = os.path.join("static", "audio", filename)
                    with open(file_path, "wb") as f:
                        f.write(audio_data)
                    audio_url = f"{settings.public_url}/static/audio/{filename}"
                    print(f"[DEBUG] Sending PTT via UAZAPI to {clean_number}: {audio_url}")
                    res = client.send_ptt(number=clean_number, url=audio_url)
                else:
                    print(f"[DEBUG] Sending via UAZAPI to {clean_number}")
                    res = client.send_text(number=clean_number, text=response_text)
                print(f"[DEBUG] UAZAPI response: {res}")
            else:
                print("[DEBUG] No provider configured for sending response")

    except Exception as e:
        print(f"[DEBUG ERROR] Error in process_ai_response: {e}")
        logger.error(f"Error in process_ai_response: {e}")


@router.post("/uazapi")
async def uazapi_webhook(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    payload = await request.json()
    print(f"\n[WEBHOOK] Payload received: {str(payload)[:200]}...")
    
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    try:
        with connect() as conn:
            result = ingest_uazapi_webhook(conn, payload)
            conn.commit()
            print(f"[WEBHOOK] Ingestion result: stored={result.stored} lead={result.lead_id} conv={result.conversation_id}")
            
            if result.stored and result.lead_id and result.conversation_id:
                fields = extract_message_fields(payload)
                chatid = fields.get("chatid") or ""
                from_me = fields.get("from_me")
                
                print(f"[WEBHOOK] Checking AI Trigger: chatid={chatid} from_me={from_me}")
                
                # Regra Universal de Bloqueio de Grupos: 
                # O agente responde apenas em DMs.
                is_group = "@g.us" in chatid
                should_respond = not is_group
                print(f"[WEBHOOK] is_group={is_group} -> should_respond={should_respond}")
                
                # Resiliência para from_me (pode vir como string em alguns adaptadores)
                is_from_me = str(from_me).lower() == "true"
                
                if is_from_me is False and should_respond and result.message_id:
                   # A regra agora é universal: responde em ambos os números (DMs apenas)
                   print(f"[WEBHOOK] AI Response queued for lead {result.lead_id} (Message: {result.message_id})")
                   background_tasks.add_task(
                       process_ai_response, 
                       payload, 
                       result.lead_id, 
                       result.conversation_id, 
                       fields["body"], 
                       result.message_id
                   )
                else:
                   reason = "duplicate" if not result.message_id else "from_me/not_allowed"
                   print(f"[WEBHOOK] AI Response SKIPPED (reason={reason}, from_me={from_me}, should_respond={should_respond})")

            return {
                "ok": True,
                "stored": result.stored,
                "lead_id": result.lead_id,
                "conversation_id": result.conversation_id,
                "message_id": result.message_id,
            }
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
