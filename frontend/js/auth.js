// ========== Auth Page Logic — Connected to FastAPI Backend ==========

function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (password !== confirm) {
    showToast('Passwords do not match!', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const btn = document.getElementById('signupSubmit');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Signup failed');
    }

    // Save token + user
    localStorage.setItem('nexthire_token', data.access_token);
    localStorage.setItem('nexthire_user', JSON.stringify(data.user));

    showToast(`Welcome, ${data.user.name}! Account created 🎉`, 'success');
    setTimeout(() => window.location.href = 'select-role.html', 1200);

  } catch (err) {
    showToast(err.message || 'Signup failed. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const btn = document.getElementById('loginSubmit');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    // Save token + user
    localStorage.setItem('nexthire_token', data.access_token);
    localStorage.setItem('nexthire_user', JSON.stringify(data.user));

    showToast(`Welcome back, ${data.user.name}!`, 'success');
    setTimeout(() => window.location.href = 'select-role.html', 1200);

  } catch (err) {
    showToast(err.message || 'Login failed. Check your credentials.', 'error');
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// If already logged in, redirect
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('nexthire_user') || 'null');
  if (user && localStorage.getItem('nexthire_token')) {
    window.location.href = 'select-role.html';
  }
});
