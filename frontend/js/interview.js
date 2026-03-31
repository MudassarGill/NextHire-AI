// ========== Interview Room — Real API Integration ==========

let state = {
  sessionId: null,
  config: null,
  currentIndex: 0,
  questions: [],   // [{id, question_number, question_text}]
  answers: [],     // string per question index
  startTime: null,
  timerInterval: null,
  isLoading: false
};

// --- Init ---
function initInterview() {
  const configStr = sessionStorage.getItem('nexthire_interview_config');
  if (!configStr) {
    showToast('No interview session found. Please select a role first.', 'error');
    setTimeout(() => window.location.href = 'select-role.html', 1500);
    return;
  }

  const config = JSON.parse(configStr);
  state.config = config;
  state.sessionId = config.sessionId;
  state.questions = config.questions;
  state.answers = new Array(state.questions.length).fill('');
  state.startTime = Date.now();

  // Update UI labels
  const diff = config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);
  document.getElementById('roleLabel').textContent = `${config.role.name} • ${diff}`;
  document.getElementById('infoRole').textContent = config.role.name;
  document.getElementById('infoDifficulty').textContent = diff;

  loadQuestion();
  startTimer();
}

// --- Load current question into the UI ---
function loadQuestion() {
  const idx = state.currentIndex;
  const total = state.questions.length;
  const q = state.questions[idx];

  document.getElementById('questionLabel').textContent = `Question ${idx + 1} of ${total}`;
  document.getElementById('progressBar').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('questionText').textContent = q.question_text;
  document.getElementById('answerInput').value = state.answers[idx] || '';
  document.getElementById('infoProgress').textContent = `${idx + 1}/${total}`;
  document.getElementById('infoAnswered').textContent = state.answers.filter(a => a && a.trim()).length;

  document.getElementById('prevBtn').disabled = idx === 0;

  const submitBtn = document.getElementById('submitBtn');
  if (idx === total - 1) {
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg> Finish Interview`;
  } else {
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg> Submit & Next`;
  }

  updateCharCount();
}

// --- Submit answer to API, then advance ---
async function submitAnswer() {
  if (state.isLoading) return;

  const answer = document.getElementById('answerInput').value.trim();
  if (!answer) {
    showToast('Please write an answer before submitting.', 'error');
    return;
  }

  state.isLoading = true;
  state.answers[state.currentIndex] = answer;

  const btn = document.getElementById('submitBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;"></span> Evaluating...`;

  const q = state.questions[state.currentIndex];
  const token = localStorage.getItem('nexthire_token');

  try {
    const response = await fetch('/api/interview/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: state.sessionId,
        question_id: q.id,
        answer: answer
      })
    });

    if (response.ok) {
      const result = await response.json();
      const scoreEmoji = result.score >= 7 ? '🌟' : result.score >= 4 ? '👍' : '📚';
      showToast(`${scoreEmoji} Score: ${result.score}/10 — Evaluated!`, result.score >= 4 ? 'success' : 'info');
    } else {
      showToast('Answer submitted!', 'success');
    }
  } catch (err) {
    showToast('Answer saved (evaluation pending)', 'info');
  }

  state.isLoading = false;
  btn.disabled = false;
  btn.innerHTML = originalHtml;

  // Advance or finish
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    loadQuestion();
  } else {
    await finishInterview();
  }
}

// --- Skip without evaluating ---
function skipQuestion() {
  state.answers[state.currentIndex] = '';
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    loadQuestion();
    showToast('Question skipped', 'info');
  } else {
    finishInterview();
  }
}

// --- Navigate to previous question ---
function prevQuestion() {
  if (state.currentIndex > 0) {
    state.answers[state.currentIndex] = document.getElementById('answerInput').value.trim();
    state.currentIndex--;
    loadQuestion();
  }
}

function updateCharCount() {
  const input = document.getElementById('answerInput');
  const count = document.getElementById('charCount');
  if (input && count) count.textContent = `${input.value.length} characters`;
}

function startTimer() {
  const display = document.getElementById('timerDisplay');
  state.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
  }, 1000);
}

function confirmEndInterview() {
  openModal('endModal');
}

// Called by the modal "End & View Results" button
async function endInterview() {
  closeModal('endModal');
  await finishInterview();
}

// --- End session via API and go to dashboard ---
async function finishInterview() {
  clearInterval(state.timerInterval);

  // Show finishing overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'finishOverlay';
  overlay.innerHTML = `
    <div class="spinner" style="width:52px;height:52px;border-width:4px;"></div>
    <p style="color:var(--text-secondary);margin-top:16px;font-size:1rem;">Calculating your results...</p>
  `;
  document.body.appendChild(overlay);

  try {
    const token = localStorage.getItem('nexthire_token');
    await fetch(`/api/interview/end/${state.sessionId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (err) {
    console.error('Error calling end interview API:', err);
  }

  // Store session ID so dashboard can load results
  sessionStorage.setItem('nexthire_session_id', String(state.sessionId));
  window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', initInterview);
