from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    master_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    master_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str

