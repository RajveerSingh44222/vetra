from pydantic import BaseModel
from typing import Optional


class CreateVaultEntry(BaseModel):
    website_name: str
    website_url: str | None = None
    login_identifier: str
    password: str
    notes: str | None = None


class UpdateVaultEntry(BaseModel):

    website_name: Optional[str] = None
    website_url: Optional[str] = None
    login_identifier: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None


