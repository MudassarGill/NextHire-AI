from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from pydantic import BaseModel, EmailStr
from typing import Optional, List


# ========== SQLAlchemy DB Models ==========

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    sessions = relationship("InterviewSessionDB", back_populates="user")


class InterviewSessionDB(Base):
    __tablename__ = "interview_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(100), nullable=False)
    difficulty = Column(String(20), nullable=False)
    question_count = Column(Integer, default=10)
    total_score = Column(Float, default=0.0)
    status = Column(String(20), default="active")  # active, completed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    user = relationship("UserDB", back_populates="sessions")
    questions = relationship("QuestionDB", back_populates="session")


class QuestionDB(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    score = Column(Float, default=0.0)
    correctness = Column(Float, default=0.0)
    depth = Column(Float, default=0.0)
    clarity = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    improvement = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)
    session = relationship("InterviewSessionDB", back_populates="questions")


# ========== Pydantic Request/Response Models ==========

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class StartInterviewRequest(BaseModel):
    role: str
    difficulty: str = "medium"
    question_count: int = 10

class SubmitAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer: str

class ModelAnswerRequest(BaseModel):
    question: str
    role: str
    difficulty: str = "medium"

class QuestionResponse(BaseModel):
    id: int
    question_number: int
    question_text: str
    user_answer: Optional[str] = None
    score: float
    feedback: Optional[str] = None
    improvement: Optional[str] = None

class FeedbackDetail(BaseModel):
    score: float
    correctness: float
    depth: float
    clarity: float
    feedback: str
    improvement: str

class SessionResponse(BaseModel):
    id: int
    role: str
    difficulty: str
    question_count: int
    total_score: float
    status: str
    started_at: str
    completed_at: Optional[str] = None

class DashboardResponse(BaseModel):
    session: SessionResponse
    questions: List[QuestionResponse]
    avg_correctness: float
    avg_depth: float
    avg_clarity: float
