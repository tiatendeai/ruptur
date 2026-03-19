from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.settings import settings


class _FakeConnCtx:
    def __enter__(self):
        return object()

    def __exit__(self, exc_type, exc, tb):
        return False


class JarvisExecutiveDailyBriefTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self._previous_token = settings.jarvis_admin_token
        settings.jarvis_admin_token = "test-jarvis-token"

    def tearDown(self) -> None:
        settings.jarvis_admin_token = self._previous_token

    @patch("app.api.jarvis.connect", return_value=_FakeConnCtx())
    @patch("app.api.jarvis.jarvis_ops_repo.list_delivery_news")
    @patch("app.api.jarvis.jarvis_ops_repo.list_missions")
    @patch("app.api.jarvis.jarvis_ops_repo.mission_snapshot")
    @patch("app.services.jarvis_daily_brief_service.agent_service.get_jarvis_eggs_response")
    @patch("app.services.jarvis_daily_brief_service.agent_service.get_response")
    def test_exec_daily_brief_combines_status_and_jarvis(
        self,
        mock_status,
        mock_jarvis,
        mock_snapshot,
        mock_list_missions,
        mock_delivery_news,
        mock_connect,
    ) -> None:
        mock_status.return_value = "*IAzinha:* Ontem: entregas estaveis. Agora: 2 bloqueios."
        mock_jarvis.return_value = "*Jarvis:* Ontem foi estavel. Hoje precisa destravar 2 frentes."
        mock_snapshot.return_value = {
            "planned_count": 3,
            "in_progress_count": 4,
            "blocked_count": 2,
            "done_count": 8,
            "canceled_count": 1,
            "overdue_open_count": 1,
        }
        mock_list_missions.side_effect = [
            [type("Row", (), {"__dict__": {"title": "Destravar host1", "status": "blocked", "priority": "p0", "owner": "Infra"}})()],
            [type("Row", (), {"__dict__": {"title": "Deploy KVM2", "status": "in_progress", "priority": "p0", "owner": "Jarvis"}})()],
            [type("Row", (), {"__dict__": {"title": "Daily executiva", "status": "planned", "priority": "p0", "owner": "Status"}})()],
        ]
        mock_delivery_news.return_value = [type("Row", (), {"__dict__": {"mission_title": "Warmup", "message": "Host2 ativo"}})()]

        response = self.client.get(
            "/jarvis/brief/executive-daily?principal_name=Diego",
            headers={"x-jarvis-token": "test-jarvis-token"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["reason"], "database_ok")
        self.assertEqual(body["duo"]["status"]["persona"], "iazinha")
        self.assertEqual(body["duo"]["jarvis"]["persona"], "jarvis")
        self.assertEqual(body["snapshot"]["blocked_count"], 2)
        self.assertEqual(len(body["blocked"]), 1)
        self.assertEqual(len(body["delivery_news"]), 1)
        mock_status.assert_called_once()
        self.assertEqual(mock_status.call_args.kwargs["persona"], "iazinha")
        mock_jarvis.assert_called_once()

    @patch("app.api.jarvis.connect", side_effect=Exception("db down"))
    @patch("app.services.jarvis_daily_brief_service.agent_service.get_jarvis_eggs_response", return_value="*Jarvis:* fallback")
    @patch("app.services.jarvis_daily_brief_service.agent_service.get_response", return_value="*IAzinha:* fallback")
    def test_exec_daily_brief_survives_database_failure(self, mock_status, mock_jarvis, mock_connect) -> None:
        response = self.client.get(
            "/jarvis/brief/executive-daily",
            headers={"x-jarvis-token": "test-jarvis-token"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["reason"], "database_unavailable")
        self.assertEqual(body["duo"]["status"]["summary"], "*IAzinha:* fallback")
        self.assertEqual(body["duo"]["jarvis"]["summary"], "*Jarvis:* fallback")


if __name__ == "__main__":
    unittest.main()
