# Deployment Guide

Vetra uses a split deployment architecture:

* **Frontend:** Vercel
* **Backend:** Railway
* **Database:** PostgreSQL (Supabase)
* **Session Storage:** Redis (Railway)

---

## Architecture

```text
Browser
   │
   ▼
Vercel Frontend
   │
   ▼
Railway FastAPI Backend
   │
   ├── PostgreSQL
   └── Redis
```

---

## Backend Deployment (Railway)

### 1. Deploy Repository

1. Push the project to GitHub.
2. Open Railway.
3. Create a new project.
4. Select **Deploy from GitHub Repository**.
5. Choose the Vetra repository.

### 2. Environment Variables

Add the following variables:

```env
DATABASE_URL=your_postgresql_url
REDIS_URL=your_redis_url

JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=15
```

### 3. Build & Start Commands

**Build Command**

```bash
pip install -r requirements.txt
```

**Start Command**

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Deploy and copy the generated Railway URL.

---

## Frontend Deployment (Vercel)

### 1. Import Repository

1. Open Vercel.
2. Click **Add New Project**.
3. Import the GitHub repository.

### 2. Environment Variables

```env
API_BASE_URL=https://your-railway-url.up.railway.app
```

### 3. Deploy

Click **Deploy** and wait for the build to complete.

---

## Configure CORS

Update the FastAPI CORS configuration with your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400
)
```

---

## Verification

### Backend

Visit:

```text
https://your-railway-url.up.railway.app/docs
```

Swagger UI should load successfully.

### Frontend

Visit:

```text
https://your-app.vercel.app
```

Verify:

* User registration
* Login/logout
* Credential CRUD operations
* Password decryption
* Password generation

---

## Troubleshooting

### CORS Errors

* Verify the frontend URL matches `allow_origins`
* Remove trailing slashes from URLs
* Redeploy the backend

### Database Errors

* Verify `DATABASE_URL`
* Ensure PostgreSQL is running

### Redis Errors

* Verify `REDIS_URL`
* Ensure Redis is running

### 307 Redirects

Use consistent API routes:

```text
/api/v1/vault
```

instead of mixing:

```text
/api/v1/vault
/api/v1/vault/
```

---

## Author

**Rajveer Singh Sisodia**
