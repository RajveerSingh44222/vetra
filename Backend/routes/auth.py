from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import secrets
from middleware.auth_middleware import get_current_user
from database.connection import get_db
from models.user import User
from schemas.auth_schema import SignupRequest, LoginRequest
from services.auth_service import hash_password, verify_password
from services.jwt_service import create_access_token
from services.encryption_service import derive_key
from services.redis_service import delete_vault_key
from services.redis_service import redis_client
from services.redis_service import (
    store_vault_key
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/signup")
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    
    new_user = User(
        id=str(uuid.uuid4()),
        email=request.email,
        master_password_hash=hash_password(
            request.master_password
        ),
        
    )

    db.add(new_user)
    db.commit()

    return {
        "message": "Account created successfully"
    }


@router.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not verify_password(
        request.master_password,
        user.master_password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
   
    vault_key = derive_key(
        request.master_password
    )
    
    store_vault_key(
        user_id=str(user.id),
        vault_key=vault_key,
        expiry_seconds=900
    )
    
    access_token = create_access_token(
        {
            "user_id": str(user.id),
            "email": user.email
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_me(
    user=Depends(get_current_user)
):
    return {
        "user_id": user["user_id"],
        "email": user["email"]
    }
@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    delete_vault_key(
        user_id=str(current_user["user_id"])
    )

    return {
        "message": "Logged out successfully"
    }