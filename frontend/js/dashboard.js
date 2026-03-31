// ========== Dashboard — Loads Results from API or Local Storage ==========

async function initDashboard() {
  const sessionId = sessionStorage.getItem('nexthire_session_id');

  if (!sessionId) {
    showToast('No interview session found. Please complete an interview first.', 'error');
    setTimeout(() => window.location.href = 'select-role.html', 2000);
    return;
  }

  // Show loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'dashLoader';
  overlay.innerHTML = `
    <div class="spinner" style="width:52px;height:52px;border-width:4px;"></div>
    <p style="color:var(--text-secondary);margin-top:20px;font-size:1rem;">Loading your results...</p>
  `;
  document.body.appendChild(overlay);

  // Check if this is a local mode session
  const isLocal = String(sessionId).startsWith('local-');

  if (isLocal) {
    // Load from sessionStorage (local mode)
    const localResults = sessionStorage.getItem('nexthire_local_results');
    document.getElementById('dashLoader')?.remove();

    if (localResults) {
      const data = JSON.parse(localResults);
      renderDashboard(data);
      showToast('Results loaded (demo mode)', 'info');
    } else {
      showToast('No results available for this session.', 'error');
      setTimeout(() => window.location.href = 'select-role.html', 2000);
    }
    return;
  }

  // API mode — fetch from server
  try {
    const token = localStorage.getItem('nexthire_token');
    const response = await fetch(`/api/interview/feedback/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    document.getElementById('dashLoader')?.remove();

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to load results');
    }

    const data = await response.json();
    renderDashboard(data);

  } catch (err) {
    document.getElementById('dashLoader')?.remove();

    // Fallback to local results if available
    const localResults = sessionStorage.getItem('nexthire_local_results');
    if (localResults) {
      const data = JSON.parse(localResults);
      renderDashboard(data);
      showToast('Loaded cached results (server unavailable)', 'info');
    } else {
      showToast('Failed to load results: ' + (err.message || 'Unknown error'), 'error');
      setTimeout(() => window.location.href = 'select-role.html', 3000);
    }
  }
}

function renderDashboard(data) {
  const session   = data.session;
  const questions = data.questions;
  const totalScore = session.total_score;

  // --- Subtitle ---
  const diff = session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1);
  let duration = '';
  if (session.started_at && session.completed_at) {
    const ms = new Date(session.completed_at) - new Date(session.started_at);
    duration = ' • ' + formatDuration(Math.floor(ms / 1000));
  }
  document.getElementById('dashboardSubtitle').textContent =
    `${session.role} • ${diff} • ${session.question_count} Questions${duration}`;

  // --- Score circle ---
  setTimeout(() => {
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 80;
    circle.style.strokeDashoffset = circumference - (totalScore / 100) * circumference;
    if (totalScore >= 70) circle.style.stroke = '#10B981';
    else if (totalScore >= 40) circle.style.stroke = '#FBBF24';
    else circle.style.stroke = '#F87171';
  }, 300);

  animateNumber('totalScore', 0, totalScore, 1500);

  // --- Grade ---
  const grade = totalScore >= 90 ? 'Excellent! 🌟'
    : totalScore >= 70 ? 'Great Job! 👏'
    : totalScore >= 50 ? 'Good Effort 👍'
    : totalScore >= 30 ? 'Keep Practicing 💪'
    : 'Needs Improvement 📚';
  document.getElementById('scoreGrade').textContent = grade;

  // --- Performance Bars ---
  const ac = Math.round(data.avg_correctness);
  const ad = Math.round(data.avg_depth);
  const acl = Math.round(data.avg_clarity);
  setTimeout(() => {
    document.getElementById('correctnessBar').style.width = ac + '%';
    document.getElementById('correctnessVal').textContent  = ac + '%';
    document.getElementById('depthBar').style.width        = ad + '%';
    document.getElementById('depthVal').textContent        = ad + '%';
    document.getElementById('clarityBar').style.width      = acl + '%';
    document.getElementById('clarityVal').textContent      = acl + '%';
  }, 500);

  // --- Summary cards ---
  document.getElementById('answeredCount').textContent = data.answered_count;
  document.getElementById('skippedCount').textContent  = data.skipped_count;
  const answeredQs = questions.filter(q => q.user_answer && q.user_answer !== '(Skipped)');
  const avgScore = answeredQs.length
    ? (answeredQs.reduce((s, q) => s + q.score, 0) / answeredQs.length).toFixed(1)
    : '0.0';
  document.getElementById('avgScore').textContent = avgScore + '/10';

  // --- Strengths & Weaknesses ---
  const swDiv = document.getElementById('strengthsWeaknesses');
  const metrics = [
    { name: 'Correctness', val: ac },
    { name: 'Depth', val: ad },
    { name: 'Clarity', val: acl }
  ].sort((a, b) => b.val - a.val);
  swDiv.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="color:var(--success);font-weight:600;">Strongest:</span>
      ${metrics[0].name} <span style="color:var(--text-muted);">(${metrics[0].val}%)</span>
    </div>
    <div>
      <span style="color:var(--warning);font-weight:600;">Needs Work:</span>
      ${metrics[2].name} <span style="color:var(--text-muted);">(${metrics[2].val}%)</span>
    </div>
  `;

  // --- Q&A Accordion ---
  const accordion = document.getElementById('qaAccordion');
  accordion.innerHTML = questions.map((q, i) => {
    const skipped    = !q.user_answer || q.user_answer === '(Skipped)';
    const scoreClass = q.score >= 7 ? 'high' : q.score >= 4 ? 'mid' : 'low';
    return `
      <div class="glass-card qa-item" id="qa-${i}">
        <div class="qa-header" onclick="toggleQA(${i})" style="align-items: flex-start;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.95rem;line-height:1.5;word-break:break-word;padding-right:12px;">
              Q${i + 1}: ${escapeHtml(q.question_text)}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-top:2px;">
            <span class="qa-score ${skipped ? 'low' : scoreClass}">
              ${skipped ? 'Skipped' : q.score + '/10'}
            </span>
            <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;transition:transform 0.3s;">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
        <div class="qa-body">
          <div style="margin-top:16px;">
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;letter-spacing:.06em;margin-bottom:6px;">YOUR ANSWER</div>
            <div style="font-size:0.9rem;color:var(--text-secondary);padding:12px;background:var(--surface);border-radius:var(--radius-sm);margin-bottom:16px;white-space:pre-wrap;word-break:break-word;line-height:1.6;">
              ${escapeHtml(q.user_answer || '(Not answered)')}
            </div>
            ${!skipped ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(80px, 1fr));gap:10px;margin-bottom:16px;">
                <div style="text-align:center;padding:10px;background:var(--surface);border-radius:var(--radius-sm);border-top:2px solid var(--primary);">
                  <div style="font-size:1.1rem;font-weight:700;color:var(--primary);">${q.correctness || 0}%</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;word-break:break-word;">Correctness</div>
                </div>
                <div style="text-align:center;padding:10px;background:var(--surface);border-radius:var(--radius-sm);border-top:2px solid var(--secondary);">
                  <div style="font-size:1.1rem;font-weight:700;color:var(--secondary);">${q.depth || 0}%</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Depth</div>
                </div>
                <div style="text-align:center;padding:10px;background:var(--surface);border-radius:var(--radius-sm);border-top:2px solid var(--accent);">
                  <div style="font-size:1.1rem;font-weight:700;color:var(--accent);">${q.clarity || 0}%</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;word-break:break-word;">Clarity</div>
                </div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;letter-spacing:.06em;margin-bottom:6px;">AI FEEDBACK</div>
              <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:14px;line-height:1.6;word-break:break-word;">${escapeHtml(q.feedback || 'No feedback available.')}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;letter-spacing:.06em;margin-bottom:6px;">IMPROVEMENT TIPS</div>
              <div style="font-size:0.9rem;color:var(--secondary);line-height:1.6;word-break:break-word;">${escapeHtml(q.improvement || 'Keep practicing.')}</div>
            ` : `<div style="color:var(--text-muted);font-size:0.9rem;word-break:break-word;">This question was skipped — consider attempting it in your next session.</div>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleQA(index) {
  const item  = document.getElementById(`qa-${index}`);
  const arrow = item.querySelector('.qa-arrow');
  item.classList.toggle('open');
  if (arrow) arrow.style.transform = item.classList.contains('open') ? 'rotate(180deg)' : '';
}

function animateNumber(id, start, end, duration) {
  const el = document.getElementById(id);
  const startTime = performance.now();
  const range = end - start;
  function update(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + range * eased);
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initDashboard);
