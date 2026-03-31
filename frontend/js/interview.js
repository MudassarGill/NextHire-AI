// ========== Interview Room — Real API + Local Fallback + AI Answer ==========

let state = {
  sessionId: null,
  config: null,
  currentIndex: 0,
  questions: [],   // [{id, question_number, question_text}]
  answers: [],     // string per question index
  scores: [],      // store scores per question for local mode
  startTime: null,
  timerInterval: null,
  isLoading: false,
  aiAnswers: {},   // cache AI answers per question index
  mode: 'api'      // 'api' or 'local'
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
  state.scores = new Array(state.questions.length).fill(null);
  state.startTime = Date.now();
  state.mode = config.mode || 'api';

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

  // Clear AI answer panel when switching questions
  const aiContainer = document.getElementById('aiResponseContainer');
  if (aiContainer) {
    // Show cached answer if available
    if (state.aiAnswers[idx]) {
      renderAIAnswer(state.aiAnswers[idx]);
    } else {
      aiContainer.innerHTML = '';
    }
  }

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

  // Try API evaluation
  if (state.mode === 'api' && token && !token.startsWith('local-')) {
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
        state.scores[state.currentIndex] = result;
        const scoreEmoji = result.score >= 7 ? '🌟' : result.score >= 4 ? '👍' : '📚';
        showToast(`${scoreEmoji} Score: ${result.score}/10 — Evaluated!`, result.score >= 4 ? 'success' : 'info');
      } else {
        showToast('Answer submitted!', 'success');
      }
    } catch (err) {
      showToast('Answer saved (evaluation pending)', 'info');
    }
  } else {
    // Local mode - just save the answer
    showToast('Answer saved! ✓', 'success');
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

// --- Show AI Model Answer ---
async function showAIAnswer() {
  const idx = state.currentIndex;
  const q = state.questions[idx];
  const container = document.getElementById('aiResponseContainer');

  // If already showing, toggle off
  if (container.innerHTML && state.aiAnswers[idx]) {
    if (container.querySelector('.ai-response-panel')) {
      container.innerHTML = '';
      return;
    }
  }

  // If cached, show immediately
  if (state.aiAnswers[idx]) {
    renderAIAnswer(state.aiAnswers[idx]);
    return;
  }

  // Show loading state
  const btn = document.getElementById('aiAnswerBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="ai-loading-dots"><span></span><span></span><span></span></span> Generating...`;

  container.innerHTML = `
    <div class="ai-response-panel">
      <div class="ai-response-header">
        <span class="ai-loading-dots"><span></span><span></span><span></span></span>
        AI is thinking...
      </div>
      <div class="ai-response-body" style="color:var(--text-muted);">Generating the ideal answer for this question...</div>
    </div>
  `;

  try {
    const response = await fetch('/api/interview/model-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q.question_text,
        role: state.config.role.name,
        difficulty: state.config.difficulty
      })
    });

    if (response.ok) {
      const data = await response.json();
      state.aiAnswers[idx] = data.model_answer;
      renderAIAnswer(data.model_answer);
      showToast('AI model answer generated! ✨', 'success');
    } else {
      throw new Error('API error');
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ai-response-panel" style="border-color:rgba(248,113,113,0.3);">
        <div class="ai-response-header" style="color:var(--danger);">
          ⚠️ Could not generate AI answer
        </div>
        <div class="ai-response-body" style="color:var(--text-secondary);">
          Make sure the backend server is running and the Groq API key is configured in the .env file.
        </div>
      </div>
    `;
    showToast('Could not generate AI answer — check server connection', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = originalHtml;
}

function renderAIAnswer(answer) {
  const container = document.getElementById('aiResponseContainer');
  container.innerHTML = `
    <div class="ai-response-panel">
      <div class="ai-response-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-1.54A2.5 2.5 0 0 1 9.5 2z"/>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-1.54A2.5 2.5 0 0 0 14.5 2z"/>
        </svg>
        AI Model Answer
        <button onclick="document.getElementById('aiResponseContainer').innerHTML=''" style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;" title="Close">✕</button>
      </div>
      <div class="ai-response-body">${escapeHtml(answer)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  if (state.mode === 'api') {
    try {
      const token = localStorage.getItem('nexthire_token');
      await fetch(`/api/interview/end/${state.sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error calling end interview API:', err);
    }
  }

  // For local mode, build local results and store them
  if (state.mode === 'local' || String(state.sessionId).startsWith('local-')) {
    const localResults = buildLocalResults();
    sessionStorage.setItem('nexthire_local_results', JSON.stringify(localResults));
  }

  // Store session ID so dashboard can load results
  sessionStorage.setItem('nexthire_session_id', String(state.sessionId));
  window.location.href = 'dashboard.html';
}

// Build local results for dashboard when server is offline
function buildLocalResults() {
  const answered = state.answers.filter(a => a && a.trim());
  const totalQuestions = state.questions.length;
  const answeredCount = answered.length;
  const skippedCount = totalQuestions - answeredCount;

  // Generate mock scores for local mode
  const questions = state.questions.map((q, i) => {
    const hasAnswer = state.answers[i] && state.answers[i].trim();
    const answerLen = hasAnswer ? state.answers[i].length : 0;
    // Simple heuristic scoring based on answer length
    const baseScore = hasAnswer ? Math.min(10, Math.max(3, Math.round(answerLen / 30))) : 0;
    const correctness = hasAnswer ? Math.min(100, Math.max(30, answerLen / 2)) : 0;
    const depth = hasAnswer ? Math.min(100, Math.max(20, answerLen / 3)) : 0;
    const clarity = hasAnswer ? Math.min(100, Math.max(30, answerLen / 2.5)) : 0;

    return {
      id: q.id,
      question_number: q.question_number,
      question_text: q.question_text,
      user_answer: state.answers[i] || '(Skipped)',
      score: hasAnswer ? baseScore : 0,
      correctness: Math.round(correctness),
      depth: Math.round(depth),
      clarity: Math.round(clarity),
      feedback: hasAnswer
        ? 'Your answer has been recorded. Connect to the server for detailed AI feedback.'
        : 'No feedback available.',
      improvement: hasAnswer
        ? 'For more accurate evaluation, run the interview with the backend server connected.'
        : 'No suggestions available.'
    };
  });

  const answeredQs = questions.filter(q => q.user_answer !== '(Skipped)');
  const avgScore = answeredQs.length
    ? answeredQs.reduce((s, q) => s + q.score, 0) / answeredQs.length
    : 0;
  const totalScore = Math.round(avgScore * 10);

  const avgCorrectness = answeredQs.length ? answeredQs.reduce((s, q) => s + q.correctness, 0) / answeredQs.length : 0;
  const avgDepth = answeredQs.length ? answeredQs.reduce((s, q) => s + q.depth, 0) / answeredQs.length : 0;
  const avgClarity = answeredQs.length ? answeredQs.reduce((s, q) => s + q.clarity, 0) / answeredQs.length : 0;

  return {
    session: {
      id: state.sessionId,
      role: state.config.role.name,
      difficulty: state.config.difficulty,
      question_count: totalQuestions,
      total_score: totalScore,
      status: 'completed',
      started_at: state.config.startedAt || new Date().toISOString(),
      completed_at: new Date().toISOString()
    },
    avg_correctness: Math.round(avgCorrectness),
    avg_depth: Math.round(avgDepth),
    avg_clarity: Math.round(avgClarity),
    answered_count: answeredCount,
    skipped_count: skippedCount,
    questions: questions
  };
}

document.addEventListener('DOMContentLoaded', initInterview);
