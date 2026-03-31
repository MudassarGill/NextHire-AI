from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import auth, interview
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NextHire AI",
    description="AI-Powered Mock Interview Platform",
    version="1.0.0"
)

# CORS — allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(interview.router)

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "NextHire AI", "version": "1.0.0"}
