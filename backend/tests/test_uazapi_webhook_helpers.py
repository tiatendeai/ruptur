from __future__ import annotations

import unittest

from app.api.uazapi_webhook import (
    extract_inline_persona_request,
    is_iazinha_activation_attempt,
    is_operational_brief_request,
    is_self_chat,
    resolve_target_candidates,
    resolve_uazapi_instance_id,
    strip_audio_request_instruction,
    wants_audio_response,
)


class UazapiWebhookHelpersTest(unittest.TestCase):
    def test_inline_iazinha_prompt_is_not_treated_as_plain_activation(self) -> None:
        self.assertFalse(is_iazinha_activation_attempt("Iazinha me dê um resumo operacional"))
        self.assertEqual(
            extract_inline_persona_request("Iazinha, me dê um resumo operacional"),
            ("iazinha", "me dê um resumo operacional"),
        )

    def test_wants_audio_response_detects_ptbr_prompt(self) -> None:
        self.assertTrue(wants_audio_response("Me responda em áudio: qual o status?"))

    def test_strip_audio_request_instruction_preserves_main_request(self) -> None:
        self.assertEqual(
            strip_audio_request_instruction("Me responda em áudio: qual o status da sessão?"),
            "qual o status da sessão?",
        )

    def test_operational_brief_detection_hits_on_exec_summary_requests(self) -> None:
        self.assertTrue(
            is_operational_brief_request(
                "IAzinha me dê um resumo operacional curto de ontem para hoje e de hoje para amanhã, com desafios, vitórias e oportunidades",
            )
        )

    def test_resolve_target_candidates_keep_same_thread_before_fallbacks(self) -> None:
        payload = {
            "data": {
                "message": {
                    "chatid": "5531989131980@lid",
                    "wa_chatid": "553189131980@s.whatsapp.net",
                    "text": "oi",
                    "meJid": "553189131980@s.whatsapp.net",
                }
            }
        }

        targets = resolve_target_candidates(payload, "5511999999999")

        self.assertEqual(targets[0], "5531989131980@lid")
        self.assertIn("553189131980@s.whatsapp.net", targets)

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

    def test_resolve_uazapi_instance_id_reads_top_level_instance_name(self) -> None:
        payload = {
            "instanceName": "vufp7R",
            "message": {
                "chatid": "553189131980@s.whatsapp.net",
                "text": "oi",
            },
        }

        self.assertEqual(resolve_uazapi_instance_id(payload), "vufp7R")

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

    def test_is_self_chat_accepts_lid_with_sender_matching_me_even_without_from_me(self) -> None:
        payload = {
            "data": {
                "message": {
                    "chatid": "5531989131980@lid",
                    "sender": "5531989131980@s.whatsapp.net",
                    "fromMe": False,
                    "meJid": "5531989131980@s.whatsapp.net",
                }
            }
        }

        self.assertTrue(is_self_chat(payload, "5531989131980@lid"))

    def test_is_self_chat_accepts_top_level_owner_and_sender_pn_payload(self) -> None:
        payload = {
            "owner": "553189131980",
            "chat": {
                "wa_chatid": "553189131980@s.whatsapp.net",
                "owner": "553189131980",
            },
            "message": {
                "chatid": "553189131980@s.whatsapp.net",
                "sender": "162611857477871@lid",
                "sender_pn": "553189131980@s.whatsapp.net",
                "fromMe": True,
                "owner": "553189131980",
            },
        }

        self.assertTrue(is_self_chat(payload, "553189131980@s.whatsapp.net"))


if __name__ == "__main__":
    unittest.main()
