from fastapi import FastAPI
from sqlalchemy import text
from database.connection import engine
from routes.auth import router as auth_router
from routes.vault import router as vault_router
from fastapi.middleware.cors import CORSMiddleware
from routes.dashboard import router as dashboard_router
from routes.tools import router as tools_router


app = FastAPI(
    title="Vetra API",
    description="Backend API for Vetra Password Manager",
    version="1.0.0"
)


app.include_router(auth_router, prefix="/api/v1")
app.include_router(vault_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(tools_router, prefix="/api/v1")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database Connected Successfully")
    except Exception as e:
        print("❌ Database Connection Failed")
        print(e)


@app.get("/")
def root():
    return {
        "message": "Vetra Backend Running",
        "status": "healthy"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }