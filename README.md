# NextHire AI 🎯

> **AI-Powered Mock Interview Platform** — Practice role-specific technical interviews, get instant AI feedback, and track your progress.

---

## Overview

NextHire AI is a full-stack web application that simulates real technical interview experiences. Users select a job role (e.g., Machine Learning Engineer, Backend Developer, UI/UX Designer), choose a difficulty level, and answer AI-generated questions in an interactive session. Each answer is evaluated in real time by a large language model (LLaMA 3 via Groq), providing detailed scores, feedback, and improvement tips.

---

## Features

- **12+ Job Roles** — ML Engineer, Data Scientist, Frontend/Backend/Full Stack Dev, DevOps, Cloud Architect, Cybersecurity, Mobile Dev, UI/UX, Data Analyst, AI Researcher
- **3 Difficulty Levels** — Easy, Medium, Hard
- **AI-Generated Questions** — Dynamic, role-specific questions via Groq LLM (LLaMA 3.3-70B)
- **Real-Time Evaluation** — Each answer scored on Correctness, Depth, and Clarity (0–100%)
- **Score Dashboard** — Animated score circle, performance breakdown, Q&A accordion with AI feedback
- **Interview History** — Full history of all past sessions with search and score tracking
- **JWT Authentication** — Secure signup/login with bcrypt password hashing
- **Responsive Design** — Dark glassmorphism UI, works on desktop and mobile

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript      |
| Backend   | Python 3.10+, FastAPI, Uvicorn       |
| AI / LLM  | Groq API (LLaMA-3.3-70B-Versatile)  |
| Database  | SQLite + SQLAlchemy ORM              |
| Auth      | JWT (python-jose) + bcrypt (passlib) |

---

## Project Structure

```
NextHire-AI/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment variable loader
│   ├── database.py             # SQLAlchemy engine & session
│   ├── models.py               # DB models + Pydantic schemas
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables (not committed)
│   ├── routers/
│   │   ├── auth.py             # /api/auth/signup, /api/auth/login
│   │   └── interview.py        # /api/interview/* endpoints
│   ├── services/
│   │   └── llm_service.py      # Groq LLM integration
│   └── prompts/
│       └── templates.py        # LLM prompt templates
└── frontend/
    ├── index.html              # Landing page
    ├── auth.html               # Login / Sign Up
    ├── select-role.html        # Role & difficulty selector
    ├── interview.html          # Interview room
    ├── dashboard.html          # Results & feedback
    ├── history.html            # Past sessions
    ├── about.html              # About page
    ├── css/
    │   └── styles.css          # Full design system
    └── js/
        ├── app.js              # Global utilities, auth guard, navbar
        ├── auth.js             # Login/signup API calls
        ├── roles.js            # Role selection & interview start
        ├── interview.js        # Interview room logic
        ├── dashboard.js        # Results rendering
        ├── history.js          # History page
        └── particles.js        # Landing page particle animation
```

---

## Prerequisites

- **Python 3.10+**
- **pip** (Python package manager)
- **A free Groq API key** → [https://console.groq.com](https://console.groq.com)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/MudassarGill/NextHire-AI.git
cd NextHire-AI
```

### 2. Create a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Open `backend/.env` and set your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
SECRET_KEY=change-this-to-a-random-secret
DATABASE_URL=sqlite:///./nexthire.db
```

> Get a **free** Groq API key at [https://console.groq.com](https://console.groq.com) — no credit card required.

---

## Running the Application

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open your browser at:

```
http://localhost:8000
```

The FastAPI backend serves the frontend automatically from the `frontend/` folder.

---

## API Reference

All endpoints are under `/api/`. Authentication requires `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint           | Description              | Auth |
|--------|--------------------|--------------------------|------|
| POST   | `/api/auth/signup` | Create a new account     | No   |
| POST   | `/api/auth/login`  | Login and receive a JWT  | No   |

**Signup / Login request body:**
```json
{ "name": "Alice Smith", "email": "alice@example.com", "password": "secret123" }
```

**Response:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com" }
}
```

### Interview

| Method | Endpoint                          | Description                          | Auth |
|--------|-----------------------------------|--------------------------------------|------|
| POST   | `/api/interview/start`            | Generate questions & create session  | Yes  |
| POST   | `/api/interview/answer`           | Submit & evaluate one answer         | Yes  |
| POST   | `/api/interview/end/{session_id}` | Finalize session & compute score     | Yes  |
| GET    | `/api/interview/feedback/{id}`    | Get full results for a session       | Yes  |
| GET    | `/api/interview/history`          | List all user sessions               | Yes  |

**Start interview request:**
```json
{ "role": "Machine Learning Engineer", "difficulty": "medium", "question_count": 10 }
```

**Submit answer request:**
```json
{ "session_id": 1, "question_id": 5, "answer": "Gradient descent is..." }
```

**Evaluation response:**
```json
{
  "score": 7.5,
  "correctness": 80,
  "depth": 70,
  "clarity": 85,
  "feedback": "Strong explanation...",
  "improvement": "Consider adding..."
}
```

### Health Check

```
GET /api/health  →  { "status": "ok", "app": "NextHire AI", "version": "1.0.0" }
```

You can also explore all endpoints interactively at:
```
http://localhost:8000/docs
```

---

## Testing the Project

### Step-by-Step User Flow

1. **Open** `http://localhost:8000` in your browser
2. **Sign Up** — Click "Get Started", fill in your name, email, and password
3. **Select a Role** — Choose from 12+ job roles (e.g., Machine Learning Engineer)
4. **Configure** — Set difficulty (Easy / Medium / Hard) and number of questions (5, 10, or 15)
5. **Start Interview** — AI generates questions in real time (~3–5 seconds)
6. **Answer Questions** — Type your answers and click "Submit & Next"
   - Each answer is evaluated immediately by the LLM
   - You'll see a score toast (e.g., "🌟 Score: 8.5/10")
7. **Finish** — Click "Finish Interview" on the last question
8. **View Results** — Dashboard shows your overall score, performance breakdown, and per-question AI feedback
9. **History** — Visit the History page to review all past sessions

### Testing the API Directly

```bash
# Health check
curl http://localhost:8000/api/health

# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login (save the token)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Start interview
curl -X POST http://localhost:8000/api/interview/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"role":"Data Scientist","difficulty":"easy","question_count":3}'
```

### Interactive API Docs

FastAPI auto-generates interactive API documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `GROQ_API_KEY` error | Add your key to `backend/.env` |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` inside the venv |
| Port 8000 already in use | Use `uvicorn main:app --port 8001` |
| CORS errors | Ensure you open the app via `http://localhost:8000`, not as a file |
| Slow question generation | Normal — Groq typically responds in 2–5 seconds |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Developer

**Mudassar Hussain** — AI/ML Engineer

> Built with FastAPI, Groq LLM, and vanilla HTML/CSS/JS — no heavy frameworks needed.
