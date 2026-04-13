# backend/middleware/ownership.py
"""
IDOR (Insecure Direct Object Reference) Protection
---------------------------------------------------
Every resource that belongs to a user must pass through one of these guards
before it is read, written, or deleted.

Usage:
    from middleware.ownership import require_owner

    @router.get("/api/journal/{entry_id}")
    def get_entry(
        entry_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        entry = require_owner(
            db.query(JournalEntry).filter(JournalEntry.id == entry_id).first(),
            owner_id_attr="user_id",
            current_user_id=current_user.id,
            resource_name="Journal entry",
        )
        return entry
"""

import logging
from typing import Any, Optional, Type, TypeVar
from fastapi import HTTPException, status

logger = logging.getLogger("lumina.security")

T = TypeVar("T")


def require_owner(
    resource: Optional[T],
    *,
    owner_id_attr: str = "user_id",
    current_user_id: str,
    resource_name: str = "Resource",
) -> T:
    """
    Verify that the authenticated user owns the requested resource.

    Raises 404 (not 403) when the resource is not found OR when it belongs to
    a different user — this prevents leaking the existence of other users' data.
    """
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found.",
        )

    resource_owner = getattr(resource, owner_id_attr, None)
    if resource_owner != current_user_id:
        # Log the access attempt without exposing details to the caller
        logger.warning(
            "IDOR_ATTEMPT resource=%s owner=%s requester=%s attr=%s",
            resource_name,
            resource_owner,
            current_user_id,
            owner_id_attr,
        )
        # Return 404, not 403, so attackers cannot enumerate IDs
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found.",
        )

    return resource


def require_owner_bulk(
    resources: list,
    *,
    owner_id_attr: str = "user_id",
    current_user_id: str,
    resource_name: str = "Resource",
) -> list:
    """
    Filter a list to only return resources owned by the current user.
    Logs any mismatches (should never happen with correct DB queries).
    """
    owned = []
    for r in resources:
        resource_owner = getattr(r, owner_id_attr, None)
        if resource_owner == current_user_id:
            owned.append(r)
        else:
            logger.error(
                "IDOR_BULK_LEAK resource=%s owner=%s requester=%s",
                resource_name, resource_owner, current_user_id,
            )
    return owned
