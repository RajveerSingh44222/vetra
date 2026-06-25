# Vetra

> A secure, full-stack password manager built with FastAPI, PostgreSQL, Redis, and AES encryption. Store, manage, and retrieve credentials securely through an intuitive web interface.



\

---

## Why Vetra?

* **Secure Credential Storage** — Passwords are encrypted before being stored in the database.
* **Strong Authentication** — JWT-based authentication with Argon2 password hashing.
* **Session-Based Vault Access** — Encryption keys are securely managed using Redis.
* **Password Generator** — Generate strong, customizable passwords instantly.
* **Full CRUD Functionality** — Create, view, update, delete, and search credentials.
* **Cloud Deployed** — Frontend on Vercel, backend on Railway.

---

## Features

### Authentication

* User registration
* User login/logout
* JWT authentication
* Protected API routes

### Password Vault

* Store credentials securely
* View and manage saved accounts
* Search vault entries
* Secure password decryption on demand

### Password Utilities

* Random password generation
* Configurable password strength options

### Dashboard

* Vault statistics
* Credential overview

---

## Technology Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Frontend         | HTML, CSS, JavaScript |
| Backend          | FastAPI               |
| Database         | PostgreSQL            |
| Session Storage  | Redis                 |
| Authentication   | JWT                   |
| Password Hashing | Argon2                |
| Encryption       | AES Encryption        |
| Deployment       | Vercel & Railway      |

---

## Quick Start

### Clone Repository

```bash
git clone https://github.com/your-username/vetra.git
cd vetra
```

### Backend Setup

```bash
cd Backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url

JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=15
```

### Run Application

```bash
uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

API Documentation:

```text
http://localhost:8000/docs
```

---

## Project Structure

```text
vetra/
├── Backend/
│   ├── api/
│   ├── core/
│   ├── database/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── utils/
│   └── main.py
│
├── Frontend/
│   ├── css/
│   ├── js/
│   ├── assets/
│   └── index.html
│
└── README.md
```

---

## Deployment

Vetra uses a split deployment architecture:

```text
Frontend → Vercel
Backend  → Railway
Database → PostgreSQL
Sessions → Redis
```

For detailed deployment instructions, see:

**DEPLOYMENT.md**

---

## Security

| Layer            | Implementation |
| ---------------- | -------------- |
| Password Hashing | Argon2         |
| Authentication   | JWT            |
| Vault Encryption | AES Encryption |
| Session Storage  | Redis          |
| Database         | PostgreSQL     |

Passwords are encrypted before storage and decrypted only when requested by an authenticated user.

---

## Future Improvements

* Two-Factor Authentication (2FA)
* Password breach detection
* Credential categories
* Browser extension support
* Password sharing
* Audit logging

---

## Author

**Rajveer Singh Sisodia**

Full-Stack Developer 

---

## License

This project is released under the MIT License.
