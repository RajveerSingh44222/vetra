from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from middleware.auth_middleware import get_current_user
from models.vault_entry import VaultEntry

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    total_credentials = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.user_id == user["user_id"]
        )
        .count()
    )

    return {
        "total_credentials": total_credentials,
        "vault_health": "Secure"
    }