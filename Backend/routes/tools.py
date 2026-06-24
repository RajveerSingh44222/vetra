import secrets
import string

from fastapi import APIRouter

router = APIRouter(
    prefix="/tools",
    tags=["Tools"]
)


@router.get("/generate-password")
def generate_password():

    alphabet = (
        string.ascii_letters +
        string.digits +
        "!@#$%^&*()"
    )

    password = "".join(
        secrets.choice(alphabet)
        for _ in range(16)
    )

    return {
        "password": password
    }