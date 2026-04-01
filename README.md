# NextHire AI 🎯

> **AI-Powered Mock Interview Platform** — Practice role-specific technical interviews, interact with an Auto Voice AI Avatar, get instant Groq LLaMA 3 feedback, and track your progress.

🌍 **Live Demo:** [http://13.60.42.83](http://13.60.42.83)

---

## Overview

NextHire AI is a scalable, production-ready full-stack web application that simulates real technical interview experiences. Users select a job role (e.g., Machine Learning Engineer, Backend Developer), choose a difficulty, and participate in an interactive session.

**New Feature:** Featuring an **Auto Voice-Based Interview Mode**, the platform uses built-in browser SpeechSynthesis and SpeechRecognition to conduct hands-free, voice-to-voice interviews with an animated AI Avatar. Each answer is evaluated in real-time by **Groq (LLaMA 3.3)**, generating detailed score metrics and improvement tips.

---

## 🚀 Key Features

- **Auto Voice Interview Mode** — Hands-free TTS/STT flow with silence detection and animated AI Avatar.
- **12+ Job Roles** — ML Engineer, Data Scientist, DevOps, Cloud Architect, Cybersecurity, etc.
- **AI-Generated Questions** — Dynamic, role-specific questions via Groq API.
- **Real-Time Evaluation** — Answers scored on Correctness, Depth, and Clarity (0–100%).
- **Score Dashboard & History** — Animated score circle, performance breakdown, and past sessions logic.
- **Secure Authentication** — JWT Auth + bcrypt via FastAPI.
- **Production CI/CD** — Fully Dockerized architecture with automated GitHub Actions deploying to AWS EC2.

---

## 🏗️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (Dark Glassmorphism UI) |
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **Database** | PostgreSQL (AWS RDS) & SQLAlchemy ORM |
| **AI / LLM** | Groq API (LLaMA-3.3-70B-Versatile) |
| **DevOps** | Docker, Docker Compose, Nginx |
| **CI/CD** | GitHub Actions (Auto-Deploy to AWS EC2) |

---

## 🛠️ Local Development Setup

To run NextHire AI locally, you need [Docker](https://www.docker.com/) and a free [Groq API Key](https://console.groq.com).

### 1. Clone the repository
```bash
git clone https://github.com/MudassarGill/NextHire-AI.git
cd NextHire-AI
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
SECRET_KEY=change-this-to-a-secure-secret
DATABASE_URL=postgresql://user:password@host:5432/dbname
MLFLOW_ENABLED=false
```

### 3. Run with Docker Compose
```bash
docker-compose up -d --build
```
Open your browser at: `http://localhost`

*(Note: The backend runs internally on port 8000. Nginx serves the frontend on port 80 and proxies API requests automatically).*

---

## ☁️ Deployment Pipeline (AWS EC2 + GitHub Actions)

This project features a fully automated CI/CD pipeline using GitHub Actions.

1. **Push to `main`**: Pushing code triggers `.github/workflows/deploy.yml`.
2. **Automated SSH**: The GitHub Runner logs into the AWS EC2 instance.
3. **Environment Injection**: Securely reconstructs the `.env` file from GitHub Secrets.
4. **Docker Rebuild**: Pulls the latest code, tears down old containers, and runs `docker-compose up -d --build`.

**Required GitHub Secrets:**
- `EC2_HOST`: Public IP of the deployed EC2 server.
- `EC2_USERNAME`: ssh user (e.g., `ubuntu`).
- `EC2_SSH_KEY`: Private `.pem` key for EC2 access.
- `ENV_FILE`: The full contents of your `.env` configuration.

---

## 🎤 Auto Voice Mode APIs

NextHire AI utilizes built-in browser Web Speech APIs to avoid external TTS/STT costs:
- `window.speechSynthesis` for rendering AI voice responses.
- `window.SpeechRecognition` (or `webkitSpeechRecognition`) for capturing user microphone input and auto-submitting after 2.5 seconds of silence.

---

## License
MIT License.

---
**Developed by Mudassar Hussain** — AI/ML Engineer
