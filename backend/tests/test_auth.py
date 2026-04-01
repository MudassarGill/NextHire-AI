"""
Unit tests for authentication endpoints.
"""


class TestSignup:
    def test_signup_success(self, client):
        """Test successful user registration."""
        response = client.post("/api/auth/signup", json={
            "name": "Alice Smith",
            "email": "alice@example.com",
            "password": "securepass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["name"] == "Alice Smith"
        assert data["user"]["email"] == "alice@example.com"

    def test_signup_duplicate_email(self, client):
        """Test that duplicate emails are rejected."""
        # First signup
        client.post("/api/auth/signup", json={
            "name": "User One",
            "email": "duplicate@example.com",
            "password": "pass123"
        })
        # Second signup with same email
        response = client.post("/api/auth/signup", json={
            "name": "User Two",
            "email": "duplicate@example.com",
            "password": "pass456"
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_signup_missing_fields(self, client):
        """Test signup with missing required fields."""
        response = client.post("/api/auth/signup", json={
            "email": "noname@example.com"
        })
        assert response.status_code == 422  # Validation error


class TestLogin:
    def test_login_success(self, client):
        """Test successful login."""
        # Create user first
        client.post("/api/auth/signup", json={
            "name": "Login User",
            "email": "login@example.com",
            "password": "mypassword"
        })
        # Login
        response = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "mypassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "login@example.com"

    def test_login_wrong_password(self, client):
        """Test login with incorrect password."""
        # Create user
        client.post("/api/auth/signup", json={
            "name": "Wrong Pass User",
            "email": "wrong@example.com",
            "password": "correct_password"
        })
        # Try wrong password
        response = client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrong_password"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Test login for a user that doesn't exist."""
        response = client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "nopassword"
        })
        assert response.status_code == 401


class TestHealthCheck:
    def test_health_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["app"] == "NextHire AI"
