from __future__ import annotations

import os
import unittest
from pathlib import Path

import psycopg
from fastapi.testclient import TestClient

from app.main import app


BASE_DIR = Path(__file__).resolve().parents[1]
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"
DATABASE_URL = os.environ.get("RUPTUR_DATABASE_URL", "").strip()


class HealthSmokeTest(unittest.TestCase):
    def test_health_endpoint(self) -> None:
        client = TestClient(app)

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)
        self.assertEqual(response.json()["service"], "ruptur-backend")


@unittest.skipUnless(DATABASE_URL, "RUPTUR_DATABASE_URL nao configurado para smoke tests com banco")
class FlowSmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)
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

    def test_webhook_to_inbox_to_stage_flow(self) -> None:
        webhook_payload = {
            "data": {
                "messageid": "msg-smoke-001",
                "chatid": "5511999999999@s.whatsapp.net",
                "sender": "5511999999999@s.whatsapp.net",
                "senderName": "Lead Smoke",
                "text": "Oi, tenho interesse no produto",
                "fromMe": False,
            }
        }

        ingest_response = self.client.post("/webhook/uazapi", json=webhook_payload)
        self.assertEqual(ingest_response.status_code, 200)
        ingest_body = ingest_response.json()
        self.assertEqual(ingest_body["ok"], True)
        self.assertEqual(ingest_body["stored"], True)

        leads_response = self.client.get("/crm/leads")
        self.assertEqual(leads_response.status_code, 200)
        leads = leads_response.json()["leads"]
        self.assertEqual(len(leads), 1)
        self.assertEqual(leads[0]["name"], "Lead Smoke")
        self.assertEqual(leads[0]["status"], "contato")
        self.assertEqual(leads[0]["last_message_body"], "Oi, tenho interesse no produto")

        conversation_id = leads[0]["conversation_id"]
        self.assertIsNotNone(conversation_id)

        messages_response = self.client.get(f"/crm/conversations/{conversation_id}/messages")
        self.assertEqual(messages_response.status_code, 200)
        messages = messages_response.json()["messages"]
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["direction"], "in")
        self.assertEqual(messages[0]["body"], "Oi, tenho interesse no produto")

        lead_id = leads[0]["id"]
        update_response = self.client.patch(f"/crm/leads/{lead_id}", json={"status": "qualificado"})
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["ok"], True)

        updated_leads_response = self.client.get("/crm/leads")
        self.assertEqual(updated_leads_response.status_code, 200)
        updated_leads = updated_leads_response.json()["leads"]
        self.assertEqual(updated_leads[0]["status"], "qualificado")


if __name__ == "__main__":
    unittest.main()
