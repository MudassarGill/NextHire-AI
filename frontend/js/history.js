// ========== Interview History — Loads from Real API ==========

async function initHistory() {
  const token = localStorage.getItem('nexthire_token');
  if (!token) {
    window.location.href = 'auth.html';
    return;
  }

  const list = document.getElementById('historyList');
  list.innerHTML = `
    <div style="text-align:center;padding:48px 20px;">
      <div class="spinner" style="width:40px;height:40px;margin:0 auto 16px;"></div>
      <div style="color:var(--text-secondary);">Loading your interview history...</div>
    </div>
  `;

  try {
    const response = await fetch('/api/interview/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load history');

    const history = await response.json();
    updateHistoryStats(history);
    renderHistoryList(history);

    // Live search filter
    const searchInput = document.getElementById('historySearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = history.filter(h => h.role.toLowerCase().includes(q));
        renderHistoryList(filtered);
      });
    }

  } catch (err) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Could Not Load History</h3>
        <p>${err.message || 'Please make sure the backend server is running.'}</p>
        <a href="select-role.html" class="btn btn-primary">Start an Interview</a>
      </div>
    `;
  }
}

function updateHistoryStats(history) {
  document.getElementById('totalInterviews').textContent = history.length;

  if (history.length > 0) {
    const scores = history.map(h => h.total_score);
    document.getElementById('bestScore').textContent    = Math.max(...scores).toFixed(0) + '%';
    document.getElementById('avgHistoryScore').textContent =
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%';
    document.getElementById('totalQuestions').textContent =
      history.reduce((s, h) => s + h.question_count, 0);
  }
}

function renderHistoryList(history) {
  const list = document.getElementById('historyList');

  if (history.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18"/><path d="M9 21V9"/>
        </svg>
        <h3>No Interviews Found</h3>
        <p>Start your first AI mock interview and your results will appear here.</p>
        <a href="select-role.html" class="btn btn-primary">Start First Interview</a>
      </div>`;
    return;
  }

  list.innerHTML = history.map((h, i) => {
    const date = new Date(h.started_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const diff         = h.difficulty.charAt(0).toUpperCase() + h.difficulty.slice(1);
    const scoreColor   = h.total_score >= 70 ? 'var(--success)' : h.total_score >= 40 ? 'var(--warning)' : 'var(--danger)';
    const statusBadge  = h.status === 'completed'
      ? `<span style="font-size:0.72rem;padding:3px 8px;border-radius:50px;background:rgba(16,185,129,0.15);color:var(--success);font-weight:600;">Completed</span>`
      : `<span style="font-size:0.72rem;padding:3px 8px;border-radius:50px;background:rgba(245,158,11,0.15);color:var(--warning);font-weight:600;">In Progress</span>`;

    return `
      <div class="glass-card history-item animate-fade-in delay-${Math.min(i + 1, 5)}"
           onclick="viewResult(${h.id})" style="cursor:pointer;">
        <div style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;
             border-radius:var(--radius-sm);background:rgba(108,99,255,0.12);flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="history-item-info">
          <h3>${h.role}</h3>
          <p>${date} &nbsp;·&nbsp; ${diff} &nbsp;·&nbsp; ${h.question_count} Questions &nbsp;·&nbsp; ${statusBadge}</p>
        </div>
        <div class="history-item-score" style="color:${scoreColor};">${h.total_score.toFixed(0)}%</div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="flex-shrink:0;">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    `;
  }).join('');
}

function viewResult(sessionId) {
  sessionStorage.setItem('nexthire_session_id', String(sessionId));
  window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', initHistory);
