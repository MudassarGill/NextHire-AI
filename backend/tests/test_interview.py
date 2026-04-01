"""
Unit tests for interview endpoints.
Uses mocked LLM responses to avoid external API calls during tests.
"""
from unittest.mock import patch, MagicMock


MOCK_QUESTIONS = [
    "What is supervised learning?",
    "Explain gradient descent.",
    "What is overfitting?"
]

MOCK_EVALUATION = {
    "score": 8.0,
    "correctness": 85,
    "depth": 75,
    "clarity": 90,
    "feedback": "Great explanation with good clarity.",
    "improvement": "Consider adding more mathematical detail."
}


class TestStartInterview:
    @patch("routers.interview.generate_questions", return_value=MOCK_QUESTIONS)
    def test_start_interview_success(self, mock_gen, client, auth_headers):
        """Test starting a new interview session."""
        response = client.post("/api/interview/start", json={
            "role": "Machine Learning Engineer",
            "difficulty": "medium",
            "question_count": 3
        }, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "Machine Learning Engineer"
        assert data["difficulty"] == "medium"
        assert data["question_count"] == 3
        assert len(data["questions"]) == 3

    def test_start_interview_unauthorized(self, client):
        """Test starting interview without auth token."""
        response = client.post("/api/interview/start", json={
            "role": "Data Scientist",
            "difficulty": "easy",
            "question_count": 3
        })
        assert response.status_code == 401


class TestSubmitAnswer:
    @patch("routers.interview.generate_questions", return_value=MOCK_QUESTIONS)
    @patch("routers.interview.evaluate_answer", return_value=MOCK_EVALUATION)
    def test_submit_answer_success(self, mock_eval, mock_gen, client, auth_headers):
        """Test submitting an answer and receiving evaluation."""
        # Start an interview first
        start_resp = client.post("/api/interview/start", json={
            "role": "ML Engineer",
            "difficulty": "medium",
            "question_count": 3
        }, headers=auth_headers)
        session_data = start_resp.json()
        session_id = session_data["session_id"]
        question_id = session_data["questions"][0]["id"]

        # Submit answer
        response = client.post("/api/interview/answer", json={
            "session_id": session_id,
            "question_id": question_id,
            "answer": "Supervised learning trains models on labeled data to make predictions."
        }, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 8.0
        assert data["correctness"] == 85
        assert "feedback" in data

    @patch("routers.interview.generate_questions", return_value=MOCK_QUESTIONS)
    def test_submit_answer_invalid_question(self, mock_gen, client, auth_headers):
        """Test submitting answer for non-existent question."""
        # Start interview
        start_resp = client.post("/api/interview/start", json={
            "role": "ML Engineer", "difficulty": "easy", "question_count": 3
        }, headers=auth_headers)
        session_id = start_resp.json()["session_id"]

        # Submit answer with wrong question ID
        response = client.post("/api/interview/answer", json={
            "session_id": session_id,
            "question_id": 99999,
            "answer": "Some answer"
        }, headers=auth_headers)
        assert response.status_code == 404


class TestEndInterview:
    @patch("routers.interview.generate_questions", return_value=MOCK_QUESTIONS)
    @patch("routers.interview.evaluate_answer", return_value=MOCK_EVALUATION)
    def test_end_interview(self, mock_eval, mock_gen, client, auth_headers):
        """Test ending an interview session and getting final score."""
        # Start interview
        start_resp = client.post("/api/interview/start", json={
            "role": "Data Scientist", "difficulty": "hard", "question_count": 3
        }, headers=auth_headers)
        session_id = start_resp.json()["session_id"]
        question_id = start_resp.json()["questions"][0]["id"]

        # Submit one answer
        client.post("/api/interview/answer", json={
            "session_id": session_id,
            "question_id": question_id,
            "answer": "Gradient descent is an optimization algorithm..."
        }, headers=auth_headers)

        # End interview
        response = client.post(f"/api/interview/end/{session_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["total_score"] >= 0


class TestHistory:
    @patch("routers.interview.generate_questions", return_value=MOCK_QUESTIONS)
    def test_get_history(self, mock_gen, client, auth_headers):
        """Test fetching interview history."""
        # Start and end an interview
        start_resp = client.post("/api/interview/start", json={
            "role": "Backend Developer", "difficulty": "easy", "question_count": 3
        }, headers=auth_headers)
        session_id = start_resp.json()["session_id"]
        client.post(f"/api/interview/end/{session_id}", headers=auth_headers)

        # Get history
        response = client.get("/api/interview/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["role"] == "Backend Developer"

    def test_history_unauthorized(self, client):
        """Test history without auth."""
        response = client.get("/api/interview/history")
        assert response.status_code == 401
