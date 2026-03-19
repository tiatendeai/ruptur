from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch


def _load_module():
    root = Path(__file__).resolve().parents[2]
    script_path = root / "ops" / "jarvis" / "executive_daily_brief.py"
    spec = importlib.util.spec_from_file_location("jarvis_daily_exec_brief", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


daily_module = _load_module()


class JarvisDailyTelegramDeliveryTest(TestCase):
    def test_warns_and_skips_when_env_has_non_numeric_target_without_updates(self) -> None:
        with patch.dict(
            os.environ,
            {
                "TELEGRAM_BOT_TOKEN": "bot-token",
                "TELEGRAM_ALLOWED_USER_IDS": "RupturBot",
            },
            clear=False,
        ):
            with patch.object(daily_module, "_telegram_bot_username", return_value="RupturBot"), patch.object(
                daily_module, "_discover_private_chat_ids", return_value=[]
            ):
                warnings = daily_module.send_telegram("oi")

        self.assertEqual(
            warnings,
            [
                "telegram:destino_nao_numerico:RupturBot:env precisa de chat_id numerico; envie /start para @RupturBot para auto-descoberta"
            ],
        )

    def test_auto_discovers_private_chat_id_and_sends_message(self) -> None:
        with patch.dict(
            os.environ,
            {
                "TELEGRAM_BOT_TOKEN": "bot-token",
                "TELEGRAM_ALLOWED_USER_IDS": "RupturBot",
            },
            clear=False,
        ):
            with patch.object(daily_module, "_telegram_bot_username", return_value="RupturBot"), patch.object(
                daily_module, "_discover_private_chat_ids", return_value=["123456789"]
            ), patch.object(daily_module, "_telegram_api_json", return_value={"ok": True}) as mock_send:
                warnings = daily_module.send_telegram("daily pronta")

        self.assertEqual(
            warnings,
            [
                "telegram:destino_nao_numerico:RupturBot:env precisa de chat_id numerico; envie /start para @RupturBot para auto-descoberta"
            ],
        )
        mock_send.assert_called_once_with(
            "bot-token",
            "sendMessage",
            {
                "chat_id": "123456789",
                "text": "daily pronta",
                "disable_web_page_preview": "true",
            },
        )
