import base64

from redis import Redis
from fastapi import HTTPException


redis_client = Redis(
    host="localhost",
    port=6379,
    decode_responses=True
)


def store_vault_key(
    user_id: str,
    vault_key: bytes,
    expiry_seconds: int
):
    encoded_key = base64.b64encode(
        vault_key
    ).decode()

    redis_client.setex(
        f"vault_key:{user_id}",
        expiry_seconds,
        encoded_key
    )


def get_vault_key(user_id: str) -> bytes:

    encoded_key = redis_client.get(
        f"vault_key:{user_id}"
    )

    if not encoded_key:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please login again."
        )

    return base64.b64decode(
        encoded_key
    )


def delete_vault_key(user_id: str):
    redis_client.delete(
        f"vault_key:{user_id}"
    )


def vault_key_exists(user_id: str) -> bool:
    return bool(
        redis_client.exists(
            f"vault_key:{user_id}"
        )
    )


def get_vault_key_ttl(user_id: str) -> int:
    return redis_client.ttl(
        f"vault_key:{user_id}"
    )