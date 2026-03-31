// ========== Auth Logic — API first, localStorage fallback ==========

const API_TIMEOUT = 4000; // 4 seconds

async function tryFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

function switchTab(tab) {
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab   = document.getElementById('loginTab');
  const signupTab  = document.getElementById('signupTab');

  if (tab === 'login') {
    loginForm.style.display  = 'block';
    signupForm.style.display = 'none';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.style.display  = 'none';
    signupForm.style.display = 'block';
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;

  if (password !== confirm) { showToast('Passwords do not match!', 'error'); return; }
  if (password.length < 6)  { showToast('Password must be at least 6 characters', 'error'); return; }

  const btn = document.getElementById('signupSubmit');
  btn.disabled    = true;
  btn.textContent = 'Creating account...';

  // --- Try real API ---
  try {
    const response = await tryFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      showToast(data.detail || 'Signup failed', 'error');
      btn.disabled = false; btn.textContent = 'Create Account';
      return;
    }

    localStorage.setItem('nexthire_token', data.access_token);
    localStorage.setItem('nexthire_user', JSON.stringify(data.user));
    showToast(`Welcome, ${data.user.name}! Account created 🎉`, 'success');
    setTimeout(() => window.location.href = 'select-role.html', 1200);
    return;

  } catch (err) {
    // Network error → fallback to localStorage
  }

  // --- Fallback: localStorage ---
  const users = JSON.parse(localStorage.getItem('nexthire_users') || '[]');
  if (users.find(u => u.email === email)) {
    showToast('Email already registered. Please log in.', 'error');
    btn.disabled = false; btn.textContent = 'Create Account';
    return;
  }

  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);
  localStorage.setItem('nexthire_users', JSON.stringify(users));
  const user = { id: newUser.id, name, email };
  localStorage.setItem('nexthire_user',  JSON.stringify(user));
  localStorage.setItem('nexthire_token', 'local-' + Date.now());

  showToast(`Welcome, ${name}! Account created 🎉`, 'success');
  setTimeout(() => window.location.href = 'select-role.html', 1200);
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const btn = document.getElementById('loginSubmit');
  btn.disabled    = true;
  btn.textContent = 'Logging in...';

  // --- Try real API ---
  try {
    const response = await tryFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      showToast(data.detail || 'Invalid credentials', 'error');
      btn.disabled = false; btn.textContent = 'Log In';
      return;
    }

    localStorage.setItem('nexthire_token', data.access_token);
    localStorage.setItem('nexthire_user', JSON.stringify(data.user));
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    setTimeout(() => window.location.href = 'select-role.html', 1200);
    return;

  } catch (err) {
    // Network error → fallback
  }

  // --- Fallback: localStorage ---
  const users = JSON.parse(localStorage.getItem('nexthire_users') || '[]');
  const user   = users.find(u => u.email === email && u.password === password);
  if (!user) {
    showToast('Invalid email or password', 'error');
    btn.disabled = false; btn.textContent = 'Log In';
    return;
  }

  const sessionUser = { id: user.id, name: user.name, email: user.email };
  localStorage.setItem('nexthire_user',  JSON.stringify(sessionUser));
  localStorage.setItem('nexthire_token', 'local-' + Date.now());
  showToast(`Welcome back, ${user.name}!`, 'success');
  setTimeout(() => window.location.href = 'select-role.html', 1200);
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈'; }
  else                           { input.type = 'password'; btn.textContent = '👁️'; }
}

// If already logged in, redirect
document.addEventListener('DOMContentLoaded', () => {
  const user  = JSON.parse(localStorage.getItem('nexthire_user') || 'null');
  const token = localStorage.getItem('nexthire_token');
  if (user && token) window.location.href = 'select-role.html';
});
