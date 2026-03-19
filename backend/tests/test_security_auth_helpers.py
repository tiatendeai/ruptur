from __future__ import annotations

import unittest

from app.api.security import _extract_bearer_token, _extract_roles, is_public_path


class SecurityAuthHelpersTest(unittest.TestCase):
    def test_extract_bearer_token(self) -> None:
        self.assertEqual(_extract_bearer_token("Bearer abc123"), "abc123")
        self.assertEqual(_extract_bearer_token("bearer xyz"), "xyz")
        self.assertIsNone(_extract_bearer_token("Token abc"))
        self.assertIsNone(_extract_bearer_token(None))

    def test_extract_roles_prefers_unique_values(self) -> None:
        payload = {
            "app_metadata": {"roles": ["tenant_admin", "billing_admin"], "role": "platform_admin"},
            "user_metadata": {"roles": ["billing_admin", "ops_manager"]},
        }
        self.assertEqual(_extract_roles(payload), ["billing_admin", "ops_manager", "platform_admin", "tenant_admin"])

    def test_public_path_rules(self) -> None:
        self.assertTrue(is_public_path("/health"))
        self.assertTrue(is_public_path("/webhook/uazapi"))
        self.assertTrue(is_public_path("/billing/webhook/asaas"))
        self.assertFalse(is_public_path("/crm/leads"))


if __name__ == "__main__":
    unittest.main()
