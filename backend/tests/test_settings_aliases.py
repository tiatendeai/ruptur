from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from app.settings import Settings


class SettingsAliasesTest(unittest.TestCase):
    def test_accepts_legacy_openai_and_elevenlabs_names(self) -> None:
        with patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "test-openai",
                "ELEVENLABS_API_KEY": "test-eleven",
                "ELEVENLABS_VOICE_ID": "voice-123",
            },
            clear=False,
        ):
            settings = Settings(_env_file=None)

        self.assertEqual(settings.openai_api_key, "test-openai")
        self.assertEqual(settings.eleven_api_key, "test-eleven")
        self.assertEqual(settings.eleven_voice_id, "voice-123")

    def test_normalizes_legacy_baileys_endpoint_to_base_url(self) -> None:
        with patch.dict(
            os.environ,
            {
                "RUPTUR_BAILEYS_ENDPOINT": "http://localhost:3001/send/text",
            },
            clear=False,
        ):
            settings = Settings(_env_file=None)

        self.assertEqual(settings.baileys_base_url, "http://localhost:3001")

    def test_accepts_legacy_telegram_github_and_cloudflare_names(self) -> None:
        with patch.dict(
            os.environ,
            {
                "TELEGRAM_BOT_TOKEN": "telegram-token",
                "TELEGRAM_ALLOWED_USER_IDS": "123,456",
                "GITHUB_TOKEN": "github-token",
                "GITHUB_OWNER": "tiatendeai",
                "GITHUB_REPO": "ruptur",
                "GITHUB_PROJECT_NUMBER": "7",
                "CLOUDFLARE_API_KEY": "cf-api-key",
                "CLOUDFLARE_API_TOKEN": "cf-api-token",
                "CLOUDFLARE_ORIGIN_CA_KEY": "cf-origin-ca",
                "CLOUDFLARE_EMAIL": "ops@example.com",
                "CLOUDFLARE_ZONE_ID": "zone-123",
                "CLOUDFLARE_ACCOUNT_ID": "account-123",
            },
            clear=False,
        ):
            settings = Settings(_env_file=None)

        self.assertEqual(settings.telegram_bot_token, "telegram-token")
        self.assertEqual(settings.telegram_allowed_user_ids, "123,456")
        self.assertEqual(settings.github_token, "github-token")
        self.assertEqual(settings.github_owner, "tiatendeai")
        self.assertEqual(settings.github_repo, "ruptur")
        self.assertEqual(settings.github_project_number, 7)
        self.assertEqual(settings.cloudflare_api_key, "cf-api-key")
        self.assertEqual(settings.cloudflare_api_token, "cf-api-token")
        self.assertEqual(settings.cloudflare_origin_ca_key, "cf-origin-ca")
        self.assertEqual(settings.cloudflare_email, "ops@example.com")
        self.assertEqual(settings.cloudflare_zone_id, "zone-123")
        self.assertEqual(settings.cloudflare_account_id, "account-123")


if __name__ == "__main__":
    unittest.main()
