"""Fail-closed policy for ECP institutional Drive folder ACLs.

This module is deliberately pure: it performs no network or Drive operations.
Only an explicit, non-inherited write grant to the configured service account
is accepted. Other write-capable permissions block until separately reviewed.
"""

WRITE_ROLES = frozenset({"owner", "writer", "fileOrganizer", "organizer"})
SERVICE_ACCOUNT_WRITE_ROLES = frozenset({"writer", "fileOrganizer", "organizer"})


def is_direct_service_account_writer(permission: dict, principal: str) -> bool:
    """Return True only for an explicit direct write grant to the service account."""
    details = permission.get("permissionDetails") or []
    return (
        permission.get("type") == "user"
        and (permission.get("emailAddress") or "").strip().lower()
        == principal.strip().lower()
        and permission.get("role") in SERVICE_ACCOUNT_WRITE_ROLES
        and not any(detail.get("inherited") is True for detail in details)
    )


def classify_folder_acl(permissions: list[dict], principal: str) -> dict:
    """Return a deterministic, fail-closed ACL decision and sanitized reasons."""
    direct_grant = any(
        is_direct_service_account_writer(permission, principal)
        for permission in permissions
    )
    unexpected_writers = []
    for permission in permissions:
        if permission.get("role") not in WRITE_ROLES:
            continue
        if is_direct_service_account_writer(permission, principal):
            continue
        # Never include email addresses or permission IDs in diagnostic reasons.
        details = permission.get("permissionDetails") or []
        inherited = any(detail.get("inherited") is True for detail in details)
        unexpected_writers.append({
            "type": permission.get("type", "unknown"),
            "role": permission.get("role", "unknown"),
            "inherited": inherited,
        })

    reasons = []
    if not direct_grant:
        reasons.append("missing_direct_service_account_write_grant")
    if unexpected_writers:
        reasons.append("unexpected_write_capable_permissions")
    return {
        "allowed": direct_grant and not unexpected_writers,
        "direct_service_account_write_grant": direct_grant,
        "unexpected_write_capable_permissions": unexpected_writers,
        "reasons": reasons,
    }
