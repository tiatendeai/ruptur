from __future__ import annotations

import os
import unittest
from pathlib import Path

import psycopg

from app.services.uazapi_ingest import extract_message_fields, ingest_uazapi_webhook


BASE_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"
DATABASE_URL = os.environ.get("RUPTUR_DATABASE_URL", "").strip()


class UazapiIngestRegressionUnitTest(unittest.TestCase):
    def test_extract_message_fields_uses_nested_message_payload(self) -> None:
        payload = {
            "event": "message-any",
            "data": {
                "message": {
                    "messageid": "msg-nested-001",
                    "chatid": "553189131980@s.whatsapp.net",
                    "sender": "553189131980@s.whatsapp.net",
                    "senderName": "IAzinha Device",
                    "text": "teste nested",
                    "isFromMe": False,
                }
            },
        }

        fields = extract_message_fields(payload)

        self.assertEqual(fields["message_external_id"], "msg-nested-001")
        self.assertEqual(fields["chatid"], "553189131980@s.whatsapp.net")
        self.assertEqual(fields["sender"], "553189131980@s.whatsapp.net")
        self.assertEqual(fields["body"], "teste nested")
        self.assertEqual(fields["from_me"], False)

    def test_extract_message_fields_ignores_empty_content_placeholder(self) -> None:
        payload = {
            "data": {
                "messageid": "msg-empty-001",
                "chatid": "553189131980@s.whatsapp.net",
                "sender": "553189131980@s.whatsapp.net",
                "content": {},
                "fromMe": False,
            }
        }

        fields = extract_message_fields(payload)

        self.assertEqual(fields["message_external_id"], "msg-empty-001")
        self.assertIsNone(fields["body"])


@unittest.skipUnless(DATABASE_URL, "RUPTUR_DATABASE_URL nao configurado para testes com banco")
class UazapiIngestRegressionDbTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    def setUp(self) -> None:
        with psycopg.connect(DATABASE_URL) as conn:
            conn.execute(self.schema_sql)
            conn.execute(
                """
                TRUNCATE TABLE
                  messages,
                  conversations,
                  pipeline_events,
                  leads
                RESTART IDENTITY CASCADE
                """
            )
            conn.commit()

    def test_duplicate_messageid_enriches_existing_message_and_keeps_message_id(self) -> None:
        first_payload = {
            "data": {
                "messageid": "msg-dup-001",
                "chatid": "553189131980@s.whatsapp.net",
                "sender": "553189131980@s.whatsapp.net",
                "senderName": "IAzinha Device",
                "text": None,
                "content": {},
                "fromMe": False,
            }
        }
        second_payload = {
            "data": {
                "messageid": "msg-dup-001",
                "chatid": "553189131980@s.whatsapp.net",
                "sender": "553189131980@s.whatsapp.net",
                "senderName": "IAzinha Device",
                "text": "iazinha",
                "fromMe": False,
            }
        }

        with psycopg.connect(DATABASE_URL) as conn:
            first_result = ingest_uazapi_webhook(conn, first_payload)
            conn.commit()
            second_result = ingest_uazapi_webhook(conn, second_payload)
            conn.commit()

            self.assertTrue(first_result.stored)
            self.assertTrue(second_result.stored)
            self.assertIsNotNone(first_result.message_id)
            self.assertEqual(first_result.message_id, second_result.message_id)

            row = conn.execute(
                """
                SELECT external_id, direction, sender, body
                FROM messages
                WHERE conversation_id = %s
                """,
                (first_result.conversation_id,),
            ).fetchall()

        self.assertEqual(len(row), 1)
        self.assertEqual(row[0][0], "msg-dup-001")
        self.assertEqual(row[0][1], "in")
        self.assertEqual(row[0][2], "553189131980@s.whatsapp.net")
        self.assertEqual(row[0][3], "iazinha")
