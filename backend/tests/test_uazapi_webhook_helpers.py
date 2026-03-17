from __future__ import annotations

import unittest

from app.api.uazapi_webhook import is_self_chat, resolve_target_jid, resolve_uazapi_instance_id


class UazapiWebhookHelpersTest(unittest.TestCase):
    def test_resolve_target_jid_prefers_nested_message_payload(self) -> None:
        payload = {
            "data": {
                "message": {
                    "chatid": "5531989131980@lid",
                    "wa_chatid": "553189131980@s.whatsapp.net",
                    "text": "oi",
                }
            }
        }

        self.assertEqual(resolve_target_jid(payload, "5511999999999"), "553189131980@s.whatsapp.net")

    def test_resolve_uazapi_instance_id_reads_nested_message_payload(self) -> None:
        payload = {
            "data": {
                "message": {
                    "instance": "inst-nested-001",
                    "chatid": "553189131980@s.whatsapp.net",
                }
            }
        }

        self.assertEqual(resolve_uazapi_instance_id(payload), "inst-nested-001")

    def test_is_self_chat_reads_nested_message_metadata(self) -> None:
        payload = {
            "data": {
                "message": {
                    "chatid": "5531989131980@lid",
                    "sender": "5531989131980@lid",
                    "fromMe": True,
                    "meJid": "5531989131980@s.whatsapp.net",
                }
            }
        }

        self.assertTrue(is_self_chat(payload, "5531989131980@lid"))


if __name__ == "__main__":
    unittest.main()
