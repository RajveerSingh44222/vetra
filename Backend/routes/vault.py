from uuid import uuid4
from services.auth_service import verify_password
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.user import User
from services.redis_service import get_vault_key
from database.connection import get_db
from middleware.auth_middleware import get_current_user
from services.encryption_service import encrypt_password
from models.vault_entry import VaultEntry
from services.encryption_service import decrypt_password
from schemas.vault_schema import (
    CreateVaultEntry,
    UpdateVaultEntry
)

router = APIRouter(
    prefix="/vault",
    tags=["Vault"]
)


# CREATE VAULT ENTRY
@router.post("")
def create_vault_entry(
    request: CreateVaultEntry,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    vault_key = get_vault_key(
        user["user_id"]
    )

    encrypted_password, iv, tag = encrypt_password(
    request.password,
    vault_key
)

    new_entry = VaultEntry(
    id=uuid4(),
    user_id=user["user_id"],
    website_name=request.website_name,
    website_url=request.website_url,
    login_identifier=request.login_identifier,
    encrypted_pass=encrypted_password,
    iv=iv,
    tag=tag,
    notes=request.notes
)
    
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return {
        "message": "Vault entry created successfully",
        "entry_id": str(new_entry.id)
    }


# GET ALL VAULT ENTRIES
@router.get("")
def get_all_vault_entries(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    entries = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.user_id == user["user_id"]
        )
        .all()
    )

    return entries


# SEARCH VAULT ENTRIES
@router.get("/search")
def search_vault_entries(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    results = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.user_id == user["user_id"],
            VaultEntry.website_name.ilike(f"%{q}%")
        )
        .all()
    )

    return results


# GET SINGLE VAULT ENTRY
@router.get("/{entry_id}")
def get_vault_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    entry = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.id == entry_id,
            VaultEntry.user_id == user["user_id"]
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Vault entry not found"
        )

    return entry


# UPDATE VAULT ENTRY
@router.put("/{entry_id}")
def update_vault_entry(
    entry_id: str,
    request: UpdateVaultEntry,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    entry = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.id == entry_id,
            VaultEntry.user_id == user["user_id"]
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Vault entry not found"
        )

    if request.website_name is not None:
        entry.website_name = request.website_name

    if request.website_url is not None:
        entry.website_url = request.website_url

    if request.login_identifier is not None:
        entry.login_identifier = request.login_identifier

    if request.password is not None:

        vault_key = get_vault_key(
        user["user_id"]
    )

        encrypted_password, iv, tag = encrypt_password(
        request.password,
        vault_key
    )

        entry.encrypted_pass = encrypted_password
        entry.iv = iv
        entry.tag = tag

    if request.notes is not None:
        entry.notes = request.notes

    db.commit()
    db.refresh(entry)

    return {
        "message": "Vault entry updated successfully"
    }


# DELETE VAULT ENTRY
@router.delete("/{entry_id}")
def delete_vault_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    entry = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.id == entry_id,
            VaultEntry.user_id == user["user_id"]
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Vault entry not found"
        )

    db.delete(entry)
    db.commit()

    return {
        "message": "Vault entry deleted successfully"
    }




@router.get("/{entry_id}/decrypt")
def decrypt_vault_password(
    entry_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    entry = (
        db.query(VaultEntry)
        .filter(
            VaultEntry.id == entry_id,
            VaultEntry.user_id == user["user_id"]
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Vault entry not found"
        )

    vault_key = get_vault_key(user["user_id"])
    
    if not vault_key:
        raise HTTPException(
            status_code=401,
            detail="Vault session expired. Login again."
        )
    
    try:
        password = decrypt_password(
    entry.encrypted_pass,
    entry.iv,
    entry.tag,
    vault_key
)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Decryption failed: {str(e)}"
        )

    return {
        "password": password
    }