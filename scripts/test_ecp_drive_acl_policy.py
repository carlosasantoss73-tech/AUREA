import unittest

from scripts.ecp_drive_acl_policy import classify_folder_acl


PRINCIPAL = "ecp-writer@example.iam.gserviceaccount.com"


def permission(kind="user", role="writer", email=PRINCIPAL, details=None):
    item = {"type": kind, "role": role}
    if email is not None:
        item["emailAddress"] = email
    if details is not None:
        item["permissionDetails"] = details
    return item


class EcpDriveAclPolicyTests(unittest.TestCase):
    def test_accepts_only_direct_explicit_service_account_writer(self):
        result = classify_folder_acl([permission()], PRINCIPAL)
        self.assertTrue(result["allowed"])
        self.assertEqual(result["reasons"], [])

    def test_service_account_match_is_case_insensitive(self):
        result = classify_folder_acl(
            [permission(email="ECP-WRITER@EXAMPLE.IAM.GSERVICEACCOUNT.COM")],
            PRINCIPAL,
        )
        self.assertTrue(result["allowed"])

    def test_blocks_when_service_account_grant_is_inherited(self):
        result = classify_folder_acl(
            [permission(details=[{"inherited": True, "role": "writer"}])],
            PRINCIPAL,
        )
        self.assertFalse(result["allowed"])
        self.assertIn("missing_direct_service_account_write_grant", result["reasons"])
        self.assertIn("unexpected_write_capable_permissions", result["reasons"])

    def test_blocks_unknown_direct_writer(self):
        result = classify_folder_acl(
            [permission(email="unknown@example.com")], PRINCIPAL
        )
        self.assertFalse(result["allowed"])
        self.assertIn("unexpected_write_capable_permissions", result["reasons"])

    def test_blocks_group_and_domain_writers(self):
        for kind, email in (("group", None), ("domain", None)):
            with self.subTest(kind=kind):
                result = classify_folder_acl(
                    [permission(kind=kind, email=email)], PRINCIPAL
                )
                self.assertFalse(result["allowed"])

    def test_blocks_owner_even_if_service_account_has_writer(self):
        result = classify_folder_acl(
            [permission(), permission(role="owner", email="owner@example.com")],
            PRINCIPAL,
        )
        self.assertFalse(result["allowed"])

    def test_ignores_read_only_permissions(self):
        result = classify_folder_acl(
            [permission(role="reader", email="auditor@example.com"), permission()],
            PRINCIPAL,
        )
        self.assertTrue(result["allowed"])

    def test_does_not_expose_email_or_permission_ids(self):
        result = classify_folder_acl(
            [dict(permission(email="private@example.com"), id="private-id")],
            PRINCIPAL,
        )
        self.assertNotIn("private@example.com", repr(result))
        self.assertNotIn("private-id", repr(result))


if __name__ == "__main__":
    unittest.main()
