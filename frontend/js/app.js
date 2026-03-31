// ========== NextHire AI — Global App Utilities ==========

// --- Auth Token Helpers ---
function getAuthToken() {
  return localStorage.getItem('nexthire_token');
}

function getUser() {
  return JSON.parse(localStorage.getItem('nexthire_user') || 'null');
}

// --- Auth Guard ---
function checkAuth() {
  const user = getUser();
  const publicPages = ['index.html', 'auth.html', 'about.html', ''];
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (!user && !publicPages.includes(currentPage)) {
    showToast('Please log in to continue', 'error');
    setTimeout(() => window.location.href = 'auth.html', 1000);
    return null;
  }

  updateNavUser(user);
  return user;
}

// --- Update Navbar User Section ---
function updateNavUser(user) {
  const navUser = document.getElementById('navUser');
  const authBtn = document.getElementById('authBtn');
  const heroCTA = document.getElementById('heroCTA');

  if (user && navUser) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    navUser.innerHTML = `
      <div class="nav-avatar" onclick="toggleUserMenu()" id="userAvatar" title="${user.name}">${initials}</div>
      <div class="user-dropdown" id="userDropdown" style="display:none; position:absolute; top:60px; right:20px; z-index:100;">
        <div class="glass-card" style="padding:12px; min-width:180px;">
          <div style="padding:8px 12px; font-weight:600; font-size:0.9rem; border-bottom:1px solid var(--border); margin-bottom:8px;">${user.name}</div>
          <div style="padding:6px 12px; font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">${user.email}</div>
          <button onclick="logout()" class="btn btn-danger btn-sm" style="width:100%;">Log Out</button>
        </div>
      </div>
    `;
  }

  if (user && authBtn) {
    authBtn.textContent = 'Start Interview';
    authBtn.href = 'select-role.html';
  }

  if (user && heroCTA) {
    heroCTA.href = 'select-role.html';
    heroCTA.textContent = 'Start Practicing';
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

function logout() {
  localStorage.removeItem('nexthire_user');
  localStorage.removeItem('nexthire_token');
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = 'index.html', 800);
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Modal ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// --- Hamburger Menu ---
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.classList.toggle('active');
    });
  }
}

// --- Close dropdown on outside click ---
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const avatar = document.getElementById('userAvatar');
  if (dropdown && !avatar?.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// --- Init on page load ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initHamburger();
});
