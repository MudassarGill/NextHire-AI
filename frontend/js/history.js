// ========== History Page Logic ==========

function initHistory() {
  const history = JSON.parse(localStorage.getItem('nexthire_history') || '[]');
  
  updateHistoryStats(history);
  renderHistoryList(history);

  // Search filter
  const searchInput = document.getElementById('historySearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = history.filter(h => h.role.name.toLowerCase().includes(query));
      renderHistoryList(filtered);
    });
  }
}

function updateHistoryStats(history) {
  document.getElementById('totalInterviews').textContent = history.length;
  
  if (history.length > 0) {
    const scores = history.map(h => h.totalScore);
    document.getElementById('bestScore').textContent = Math.max(...scores) + '%';
    document.getElementById('avgHistoryScore').textContent = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%';
    document.getElementById('totalQuestions').textContent = history.reduce((s, h) => s + h.results.filter(r => r.answer !== '(Skipped)').length, 0);
    
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) clearBtn.style.display = 'inline-flex';
  }
}

function renderHistoryList(history) {
  const list = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');

  if (history.length === 0) {
    list.innerHTML = '';
    list.appendChild(emptyState || createEmptyState());
    return;
  }

  list.innerHTML = history.map(h => {
    const date = new Date(h.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const duration = formatDurationShort(h.duration);
    const scoreColor = h.totalScore >= 70 ? 'var(--success)' : h.totalScore >= 40 ? 'var(--warning)' : 'var(--danger)';
    const answered = h.results.filter(r => r.answer !== '(Skipped)').length;

    return `
      <div class="glass-card history-item animate-fade-in" onclick="viewResult('${h.id}')" style="cursor:pointer;">
        <div style="font-size:1.6rem; flex-shrink:0;">${h.role.icon}</div>
        <div class="history-item-info">
          <h3>${h.role.name}</h3>
          <p>${date} • ${h.difficulty} • ${answered}/${h.questionCount} answered • ${duration}</p>
        </div>
        <div class="history-item-score" style="color:${scoreColor};">${h.totalScore}%</div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    `;
  }).join('');
}

function viewResult(id) {
  const history = JSON.parse(localStorage.getItem('nexthire_history') || '[]');
  const result = history.find(h => h.id === id);
  if (result) {
    sessionStorage.setItem('nexthire_last_result', JSON.stringify(result));
    window.location.href = 'dashboard.html';
  }
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all interview history? This cannot be undone.')) {
    localStorage.removeItem('nexthire_history');
    showToast('History cleared', 'success');
    setTimeout(() => window.location.reload(), 800);
  }
}

function formatDurationShort(seconds) {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  return mins > 0 ? `${mins}m` : `${seconds}s`;
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="80" height="80"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
    <h3>No interviews yet</h3>
    <p>Start your first AI mock interview and your results will appear here.</p>
    <a href="select-role.html" class="btn btn-primary">Start First Interview</a>
  `;
  return div;
}

document.addEventListener('DOMContentLoaded', initHistory);
