from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import (
    UserDB, InterviewSessionDB, QuestionDB,
    StartInterviewRequest, SubmitAnswerRequest,
    QuestionResponse, SessionResponse, DashboardResponse
)
from routers.auth import get_current_user
from services.llm_service import generate_questions, evaluate_answer

router = APIRouter(prefix="/api/interview", tags=["Interview"])


def require_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/start")
def start_interview(
    data: StartInterviewRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Start a new interview session — generates questions via LLM."""
    # Generate questions using Groq
    questions = generate_questions(data.role, data.difficulty, data.question_count)

    # Create session
    session = InterviewSessionDB(
        user_id=user.id,
        role=data.role,
        difficulty=data.difficulty,
        question_count=len(questions),
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Save questions
    question_records = []
    for i, q_text in enumerate(questions):
        q = QuestionDB(
            session_id=session.id,
            question_number=i + 1,
            question_text=q_text
        )
        db.add(q)
        question_records.append(q)

    db.commit()

    return {
        "session_id": session.id,
        "role": session.role,
        "difficulty": session.difficulty,
        "question_count": session.question_count,
        "questions": [
            {"id": q.id, "question_number": q.question_number, "question_text": q.question_text}
            for q in question_records
        ]
    }


@router.get("/question/{session_id}")
def get_questions(
    session_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get all questions for a session."""
    session = db.query(InterviewSessionDB).filter(
        InterviewSessionDB.id == session_id,
        InterviewSessionDB.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = db.query(QuestionDB).filter(
        QuestionDB.session_id == session_id
    ).order_by(QuestionDB.question_number).all()

    return {
        "session_id": session.id,
        "role": session.role,
        "difficulty": session.difficulty,
        "status": session.status,
        "questions": [
            {
                "id": q.id,
                "question_number": q.question_number,
                "question_text": q.question_text,
                "user_answer": q.user_answer,
                "score": q.score,
                "feedback": q.feedback,
                "improvement": q.improvement
            }
            for q in questions
        ]
    }


@router.post("/answer")
def submit_answer(
    data: SubmitAnswerRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Submit an answer and get AI evaluation."""
    # Verify session belongs to user
    session = db.query(InterviewSessionDB).filter(
        InterviewSessionDB.id == data.session_id,
        InterviewSessionDB.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = db.query(QuestionDB).filter(
        QuestionDB.id == data.question_id,
        QuestionDB.session_id == data.session_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Evaluate with LLM
    evaluation = evaluate_answer(
        role=session.role,
        difficulty=session.difficulty,
        question=question.question_text,
        answer=data.answer
    )

    # Update question record
    question.user_answer = data.answer
    question.score = evaluation["score"]
    question.correctness = evaluation["correctness"]
    question.depth = evaluation["depth"]
    question.clarity = evaluation["clarity"]
    question.feedback = evaluation["feedback"]
    question.improvement = evaluation["improvement"]
    question.answered_at = datetime.utcnow()
    db.commit()

    return {
        "question_id": question.id,
        "score": evaluation["score"],
        "correctness": evaluation["correctness"],
        "depth": evaluation["depth"],
        "clarity": evaluation["clarity"],
        "feedback": evaluation["feedback"],
        "improvement": evaluation["improvement"]
    }


@router.post("/end/{session_id}")
def end_interview(
    session_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """End an interview session and calculate final scores."""
    session = db.query(InterviewSessionDB).filter(
        InterviewSessionDB.id == session_id,
        InterviewSessionDB.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = db.query(QuestionDB).filter(QuestionDB.session_id == session_id).all()
    answered = [q for q in questions if q.user_answer]

    if answered:
        avg_score = sum(q.score for q in answered) / len(answered)
        total_score = round(avg_score * 10, 1)  # Convert to 0-100
    else:
        total_score = 0

    session.total_score = total_score
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()

    return {"session_id": session.id, "total_score": total_score, "status": "completed"}


@router.get("/feedback/{session_id}")
def get_feedback(
    session_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get full feedback/dashboard for a completed session."""
    session = db.query(InterviewSessionDB).filter(
        InterviewSessionDB.id == session_id,
        InterviewSessionDB.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = db.query(QuestionDB).filter(
        QuestionDB.session_id == session_id
    ).order_by(QuestionDB.question_number).all()

    answered = [q for q in questions if q.user_answer]
    avg_correctness = sum(q.correctness for q in answered) / len(answered) if answered else 0
    avg_depth = sum(q.depth for q in answered) / len(answered) if answered else 0
    avg_clarity = sum(q.clarity for q in answered) / len(answered) if answered else 0

    return {
        "session": {
            "id": session.id,
            "role": session.role,
            "difficulty": session.difficulty,
            "question_count": session.question_count,
            "total_score": session.total_score,
            "status": session.status,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None
        },
        "avg_correctness": round(avg_correctness, 1),
        "avg_depth": round(avg_depth, 1),
        "avg_clarity": round(avg_clarity, 1),
        "answered_count": len(answered),
        "skipped_count": len(questions) - len(answered),
        "questions": [
            {
                "id": q.id,
                "question_number": q.question_number,
                "question_text": q.question_text,
                "user_answer": q.user_answer or "(Skipped)",
                "score": q.score,
                "correctness": q.correctness,
                "depth": q.depth,
                "clarity": q.clarity,
                "feedback": q.feedback or "No feedback available.",
                "improvement": q.improvement or "No suggestions available."
            }
            for q in questions
        ]
    }


@router.get("/history")
def get_history(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get all completed interview sessions for the user."""
    sessions = db.query(InterviewSessionDB).filter(
        InterviewSessionDB.user_id == user.id
    ).order_by(InterviewSessionDB.started_at.desc()).all()

    return [
        {
            "id": s.id,
            "role": s.role,
            "difficulty": s.difficulty,
            "question_count": s.question_count,
            "total_score": s.total_score,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        }
        for s in sessions
    ]
