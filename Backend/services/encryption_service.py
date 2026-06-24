import base64
import os

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from cryptography.hazmat.primitives.ciphers import (
    Cipher,
    algorithms,
    modes
)
from cryptography.hazmat.backends import default_backend
import hashlib


def derive_key(master_password: str):

    password_bytes = master_password.encode()

    salt = b"VETRA_STATIC_SALT"

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )

    return kdf.derive(password_bytes)


def encrypt_password(
    plaintext_password: str,
    key: bytes
):

    iv = os.urandom(12)

    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(iv),
        backend=default_backend()
    )

    encryptor = cipher.encryptor()

    ciphertext = (
        encryptor.update(
            plaintext_password.encode()
        )
        + encryptor.finalize()
    )

    tag = encryptor.tag

    return (
        base64.b64encode(ciphertext).decode(),
        base64.b64encode(iv).decode(),
        base64.b64encode(tag).decode()
    )


def decrypt_password(
    encrypted_password: str,
    iv: str,
    tag: str,
    key: bytes
):

    cipher = Cipher(
        algorithms.AES(key),
        modes.GCM(
            base64.b64decode(iv),
            base64.b64decode(tag)
        ),
        backend=default_backend()
    )

    decryptor = cipher.decryptor()

    plaintext = (
        decryptor.update(
            base64.b64decode(
                encrypted_password
            )
        )
        + decryptor.finalize()
    )

    return plaintext.decode()