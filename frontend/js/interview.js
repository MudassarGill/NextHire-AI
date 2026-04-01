// ========== Interview Room — Voice Mode + Text Mode + AI Answer ==========
// Features: Auto Voice Interview, Avatar States, Speech Synthesis, Speech Recognition

// ========================
// STATE MANAGEMENT
// ========================
let state = {
  sessionId: null,
  config: null,
  currentIndex: 0,
  questions: [],     // [{id, question_number, question_text}]
  answers: [],       // string per question index
  scores: [],        // store scores per question for local mode
  startTime: null,
  timerInterval: null,
  isLoading: false,
  aiAnswers: {},     // cache AI answers per question index
  mode: 'api'        // 'api' or 'local'
};

// ========================
// VOICE STATE
// ========================
let voiceState = {
  autoMode: false,           // Whether auto voice flow is enabled
  isSpeaking: false,         // TTS is currently speaking
  isListening: false,        // STT is currently listening
  isProcessing: false,       // Answer is being submitted/evaluated
  recognition: null,         // SpeechRecognition instance
  synthesis: window.speechSynthesis,
  silenceTimer: null,        // Timer to detect silence
  silenceDelay: 2500,        // ms of silence before stopping (2.5s)
  interimTranscript: '',     // Interim speech results
  finalTranscript: '',       // Final speech results
  speechSupported: false,    // Is SpeechRecognition supported?
  synthSupported: false,     // Is SpeechSynthesis supported?
  micPermission: null,       // 'granted', 'denied', or null
  autoFlowActive: false,     // Is auto flow currently running?
  currentUtterance: null     // Current SpeechSynthesisUtterance
};

// ========================
// INITIALIZATION
// ========================

/**
 * Initialize the interview room.
 * Sets up state from session config, checks voice capabilities, loads first question.
 */
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

  // Initialize voice capabilities
  initVoiceCapabilities();

  // Load the first question
  loadQuestion();
  startTimer();
}

/**
 * Check browser support for SpeechSynthesis and SpeechRecognition.
 * Show fallback notices if unsupported.
 */
function initVoiceCapabilities() {
  // Check SpeechSynthesis support
  voiceState.synthSupported = ('speechSynthesis' in window);

  // Check SpeechRecognition support (Chrome uses webkitSpeechRecognition)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceState.speechSupported = !!SpeechRecognition;

  if (voiceState.speechSupported) {
    // Create recognition instance
    voiceState.recognition = new SpeechRecognition();
    voiceState.recognition.continuous = true;
    voiceState.recognition.interimResults = true;
    voiceState.recognition.lang = 'en-US';
    voiceState.recognition.maxAlternatives = 1;

    // Bind recognition event handlers
    voiceState.recognition.onresult = handleRecognitionResult;
    voiceState.recognition.onerror = handleRecognitionError;
    voiceState.recognition.onend = handleRecognitionEnd;
    voiceState.recognition.onstart = handleRecognitionStart;
  }

  // Show fallback notice if recognition is not supported
  if (!voiceState.speechSupported) {
    showFallbackNotice('Voice recognition not supported in this browser. Please use text input.');
  }

  // If synthesis not supported, disable replay button
  if (!voiceState.synthSupported) {
    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
      replayBtn.disabled = true;
      replayBtn.title = 'Speech synthesis not supported';
      replayBtn.style.opacity = '0.4';
    }
  }
}

// ========================
// QUESTION LOADING
// ========================

/**
 * Load the current question into the UI.
 * In auto mode, triggers the full voice flow automatically.
 */
function loadQuestion() {
  const idx = state.currentIndex;
  const total = state.questions.length;
  const q = state.questions[idx];

  // Update progress and question text
  document.getElementById('questionLabel').textContent = `Question ${idx + 1} of ${total}`;
  document.getElementById('progressBar').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('questionText').textContent = q.question_text;
  document.getElementById('answerInput').value = state.answers[idx] || '';
  document.getElementById('infoProgress').textContent = `${idx + 1}/${total}`;
  document.getElementById('infoAnswered').textContent = state.answers.filter(a => a && a.trim()).length;

  document.getElementById('prevBtn').disabled = idx === 0;

  // Clear evaluation result and AI answer
  const evalContainer = document.getElementById('evalResultContainer');
  if (evalContainer) evalContainer.innerHTML = '';

  const aiContainer = document.getElementById('aiResponseContainer');
  if (aiContainer) {
    if (state.aiAnswers[idx]) {
      renderAIAnswer(state.aiAnswers[idx]);
    } else {
      aiContainer.innerHTML = '';
    }
  }

  // Update submit button text
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

  // Reset voice state for new question
  resetVoiceState();

  // If auto mode is ON, start the voice flow
  if (voiceState.autoMode) {
    setTimeout(() => handleAutoFlow(), 600);
  }
}

// ========================
// VOICE: TEXT-TO-SPEECH (TTS)
// ========================

/**
 * Speak the current question text using browser SpeechSynthesis API.
 * Updates avatar and status to "speaking" state.
 * Returns a Promise that resolves when speech ends.
 */
function speakQuestion(text) {
  return new Promise((resolve, reject) => {
    if (!voiceState.synthSupported) {
      resolve(); // Silently skip if not supported
      return;
    }

    // Cancel any ongoing speech
    voiceState.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;   // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Try to pick a natural-sounding voice
    const voices = voiceState.synthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || voices.find(v =>
      v.lang.startsWith('en') && v.localService === false
    ) || voices.find(v =>
      v.lang.startsWith('en')
    );
    if (preferred) utterance.voice = preferred;

    voiceState.currentUtterance = utterance;

    // Set speaking state
    utterance.onstart = () => {
      voiceState.isSpeaking = true;
      setAvatarState('speaking');
      setVoiceStatus('speaking', 'AI Speaking...');
      setSoundWaveState('active', '');
    };

    utterance.onend = () => {
      voiceState.isSpeaking = false;
      voiceState.currentUtterance = null;
      setAvatarState('');
      setVoiceStatus('', 'Ready');
      setSoundWaveState('', '');
      resolve();
    };

    utterance.onerror = (e) => {
      voiceState.isSpeaking = false;
      voiceState.currentUtterance = null;
      setAvatarState('');
      setVoiceStatus('', 'Ready');
      setSoundWaveState('', '');
      if (e.error !== 'interrupted') {
        console.warn('Speech synthesis error:', e.error);
      }
      resolve(); // Resolve even on error to keep flow going
    };

    voiceState.synthesis.speak(utterance);
  });
}

/**
 * Replay the current question using SpeechSynthesis.
 * Available as a manual control button.
 */
function replayQuestion() {
  if (voiceState.isSpeaking) {
    voiceState.synthesis.cancel();
    return;
  }
  if (voiceState.isListening) {
    stopListening();
  }
  const q = state.questions[state.currentIndex];
  speakQuestion(q.question_text);
}

// ========================
// VOICE: SPEECH-TO-TEXT (STT)
// ========================

/**
 * Start listening for user voice input via Web Speech API.
 * Updates avatar and status to "listening" state.
 * Populates the answer textarea in real-time with transcript.
 */
function startListening() {
  if (!voiceState.speechSupported) {
    showFallbackNotice('Voice recognition not supported. Please type your answer.');
    return;
  }

  if (voiceState.isListening) return;

  // Cancel any ongoing speech first
  if (voiceState.isSpeaking) {
    voiceState.synthesis.cancel();
  }

  // Reset transcripts
  voiceState.interimTranscript = '';
  voiceState.finalTranscript = document.getElementById('answerInput').value || '';

  try {
    voiceState.recognition.start();
  } catch (e) {
    // Recognition may already be started
    console.warn('Recognition start error:', e);
  }
}

/**
 * Stop listening and finalize the transcript.
 */
function stopListening() {
  if (!voiceState.isListening) return;

  clearTimeout(voiceState.silenceTimer);
  voiceState.silenceTimer = null;

  try {
    voiceState.recognition.stop();
  } catch (e) {
    console.warn('Recognition stop error:', e);
  }

  voiceState.isListening = false;
  setAvatarState('');
  setVoiceStatus('', 'Ready');
  setSoundWaveState('', '');
  setMicButtonState(false);
  setTranscriptLive(false);
}

/**
 * Handle speech recognition results.
 * Updates textarea with interim and final transcripts.
 * Resets silence timer on each result.
 */
function handleRecognitionResult(event) {
  let interim = '';
  let final = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      final += transcript + ' ';
    } else {
      interim += transcript;
    }
  }

  if (final) {
    voiceState.finalTranscript += final;
  }
  voiceState.interimTranscript = interim;

  // Update the textarea with combined transcript
  const textarea = document.getElementById('answerInput');
  textarea.value = voiceState.finalTranscript + interim;
  updateCharCount();

  // Reset silence timer — user is still speaking
  resetSilenceTimer();
}

/**
 * Handle recognition errors.
 * Gracefully falls back to text input on permission denied.
 */
function handleRecognitionError(event) {
  console.warn('Speech recognition error:', event.error);

  switch (event.error) {
    case 'not-allowed':
    case 'service-not-allowed':
      voiceState.micPermission = 'denied';
      showFallbackNotice('Microphone permission denied. Please type your answer manually.');
      stopListening();
      break;
    case 'no-speech':
      // No speech detected — happens in silence, can ignore in auto mode
      if (!voiceState.autoFlowActive) {
        showToast('No speech detected. Please try again.', 'info');
      }
      break;
    case 'aborted':
      // User or system aborted — handled by onend
      break;
    default:
      showToast('Voice recognition error. You can type your answer instead.', 'error');
      break;
  }
}

/**
 * Handle recognition ending.
 * In auto mode, if we have a transcript, proceed to submit.
 */
function handleRecognitionEnd() {
  const wasListening = voiceState.isListening;
  voiceState.isListening = false;
  setAvatarState('');
  setVoiceStatus('', 'Ready');
  setSoundWaveState('', '');
  setMicButtonState(false);
  setTranscriptLive(false);

  // Finalize the answer from transcript
  const answer = (voiceState.finalTranscript + voiceState.interimTranscript).trim();
  if (answer) {
    document.getElementById('answerInput').value = answer;
    state.answers[state.currentIndex] = answer;
    updateCharCount();
  }

  // If auto flow is active and we have an answer, submit it
  if (voiceState.autoFlowActive && wasListening && answer) {
    setTimeout(() => autoSubmitAnswer(), 500);
  }
}

/**
 * Handle recognition starting.
 */
function handleRecognitionStart() {
  voiceState.isListening = true;
  voiceState.micPermission = 'granted';
  setAvatarState('listening');
  setVoiceStatus('listening', 'Listening...');
  setSoundWaveState('active', 'listening');
  setMicButtonState(true);
  setTranscriptLive(true);

  // Start silence detection
  resetSilenceTimer();
}

/**
 * Reset the silence detection timer.
 * When no speech is detected for silenceDelay ms, stop listening.
 */
function resetSilenceTimer() {
  clearTimeout(voiceState.silenceTimer);
  voiceState.silenceTimer = setTimeout(() => {
    if (voiceState.isListening) {
      stopListening();
    }
  }, voiceState.silenceDelay);
}

// ========================
// AUTO VOICE FLOW
// ========================

/**
 * Handle the complete auto voice interview flow:
 * 1. Speak question (TTS)
 * 2. Wait 1-2 seconds
 * 3. Start listening (STT)
 * 4. Detect silence → stop listening
 * 5. Submit answer → show evaluation
 * 6. Move to next question
 */
async function handleAutoFlow() {
  if (!voiceState.autoMode) return;
  if (state.isLoading) return;

  voiceState.autoFlowActive = true;

  const q = state.questions[state.currentIndex];

  // Step 1: Speak the question
  if (voiceState.synthSupported) {
    await speakQuestion(q.question_text);
  }

  // Step 2: Wait 1.5 seconds before starting to listen
  await delay(1500);

  // Check if auto mode was turned off during the wait
  if (!voiceState.autoMode) {
    voiceState.autoFlowActive = false;
    return;
  }

  // Step 3: Start listening (STT handles the rest via events)
  // Check if mic permission available
  if (voiceState.micPermission === 'denied') {
    voiceState.autoFlowActive = false;
    showFallbackNotice('Mic permission denied. Please type your answer and submit manually.');
    return;
  }

  if (voiceState.speechSupported) {
    startListening();
    // The rest of the flow continues in handleRecognitionEnd → autoSubmitAnswer
  } else {
    voiceState.autoFlowActive = false;
    showFallbackNotice('Speech recognition not supported. Please type your answer.');
  }
}

/**
 * Auto submit the answer after voice recording completes.
 * Shows evaluation results, then moves to next question.
 */
async function autoSubmitAnswer() {
  const answer = document.getElementById('answerInput').value.trim();
  if (!answer) {
    voiceState.autoFlowActive = false;
    showToast('No answer detected. Please try again or type your answer.', 'info');
    return;
  }

  // Set processing state
  setAvatarState('processing');
  setVoiceStatus('processing', 'Processing...');

  state.isLoading = true;
  state.answers[state.currentIndex] = answer;

  const q = state.questions[state.currentIndex];
  const token = localStorage.getItem('nexthire_token');
  let evalResult = null;

  // Submit to API and get evaluation
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
        evalResult = await response.json();
        state.scores[state.currentIndex] = evalResult;
      }
    } catch (err) {
      console.error('Evaluation API error:', err);
    }
  }

  state.isLoading = false;
  setAvatarState('');
  setVoiceStatus('', 'Ready');

  // Show evaluation result
  if (evalResult) {
    showEvalResult(evalResult);
    const scoreEmoji = evalResult.score >= 7 ? '🌟' : evalResult.score >= 4 ? '👍' : '📚';
    showToast(`${scoreEmoji} Score: ${evalResult.score}/10`, evalResult.score >= 4 ? 'success' : 'info');

    // Wait for user to see the result, then move on
    await delay(4000);
  } else {
    showToast('Answer saved! ✓', 'success');
    await delay(1500);
  }

  // Check if auto mode still active
  if (!voiceState.autoMode) {
    voiceState.autoFlowActive = false;
    return;
  }

  // Move to next question or finish
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    loadQuestion(); // loadQuestion will trigger handleAutoFlow again
  } else {
    voiceState.autoFlowActive = false;
    await finishInterview();
  }
}

/**
 * Show detailed evaluation results in the eval container.
 */
function showEvalResult(result) {
  const container = document.getElementById('evalResultContainer');
  if (!container) return;

  const scoreClass = result.score >= 7 ? 'high' : result.score >= 4 ? 'mid' : 'low';

  container.innerHTML = `
    <div class="eval-result-panel">
      <div class="eval-result-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Evaluation Result
      </div>
      <div class="eval-score-big ${scoreClass}">${result.score}/10</div>
      <div class="eval-metrics">
        <div class="eval-metric">
          <div class="eval-metric-value">${result.correctness || '—'}%</div>
          <div class="eval-metric-label">Correctness</div>
        </div>
        <div class="eval-metric">
          <div class="eval-metric-value">${result.depth || '—'}%</div>
          <div class="eval-metric-label">Depth</div>
        </div>
        <div class="eval-metric">
          <div class="eval-metric-value">${result.clarity || '—'}%</div>
          <div class="eval-metric-label">Clarity</div>
        </div>
      </div>
      <div class="eval-feedback-section">
        <div class="eval-feedback-title">💬 Feedback</div>
        <div class="eval-feedback-text">${escapeHtml(result.feedback || 'No feedback available.')}</div>
      </div>
      <div class="eval-feedback-section">
        <div class="eval-feedback-title">🚀 Improvement Tips</div>
        <div class="eval-feedback-text">${escapeHtml(result.improvement || 'No suggestions available.')}</div>
      </div>
    </div>
  `;
}

// ========================
// UI STATE HELPERS
// ========================

/**
 * Set the avatar container's visual state.
 * @param {'speaking'|'listening'|'processing'|''} avatarState
 */
function setAvatarState(avatarState) {
  const container = document.getElementById('avatarContainer');
  if (!container) return;
  container.className = 'avatar-container' + (avatarState ? ` ${avatarState}` : '');
}

/**
 * Set the voice status indicator.
 * @param {'speaking'|'listening'|'processing'|''} statusClass
 * @param {string} text
 */
function setVoiceStatus(statusClass, text) {
  const el = document.getElementById('voiceStatus');
  const textEl = document.getElementById('voiceStatusText');
  if (!el || !textEl) return;
  el.className = 'voice-status' + (statusClass ? ` ${statusClass}` : '');
  textEl.textContent = text;
}

/**
 * Set the sound wave visualizer state.
 * @param {'active'|''} waveClass
 * @param {'listening'|''} colorClass
 */
function setSoundWaveState(waveClass, colorClass) {
  const el = document.getElementById('soundWave');
  if (!el) return;
  let cls = 'sound-wave';
  if (waveClass) cls += ` ${waveClass}`;
  if (colorClass) cls += ` ${colorClass}`;
  el.className = cls;
}

/**
 * Set the mic button active state.
 */
function setMicButtonState(active) {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  if (active) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

/**
 * Show or hide the live transcript indicator.
 */
function setTranscriptLive(active) {
  const el = document.getElementById('transcriptLive');
  if (!el) return;
  if (active) {
    el.classList.add('active');
  } else {
    el.classList.remove('active');
  }
}

/**
 * Show a fallback notice for voice issues.
 */
function showFallbackNotice(message) {
  const notice = document.getElementById('voiceFallbackNotice');
  const msgEl = document.getElementById('fallbackMessage');
  if (!notice || !msgEl) return;
  msgEl.textContent = message;
  notice.style.display = 'flex';
}

/**
 * Hide the fallback notice.
 */
function hideFallbackNotice() {
  const notice = document.getElementById('voiceFallbackNotice');
  if (notice) notice.style.display = 'none';
}

/**
 * Reset voice state between questions.
 */
function resetVoiceState() {
  if (voiceState.isListening) stopListening();
  if (voiceState.isSpeaking) voiceState.synthesis.cancel();
  clearTimeout(voiceState.silenceTimer);
  voiceState.isSpeaking = false;
  voiceState.isListening = false;
  voiceState.isProcessing = false;
  voiceState.interimTranscript = '';
  voiceState.finalTranscript = '';
  voiceState.autoFlowActive = false;
  setAvatarState('');
  setVoiceStatus('', 'Ready');
  setSoundWaveState('', '');
  setMicButtonState(false);
  setTranscriptLive(false);
  hideFallbackNotice();
}

// ========================
// UI CONTROLS
// ========================

/**
 * Toggle auto voice mode ON/OFF.
 */
function toggleAutoMode() {
  voiceState.autoMode = !voiceState.autoMode;

  const toggle = document.getElementById('autoToggleSwitch');
  const label = document.getElementById('autoToggleLabel');

  if (voiceState.autoMode) {
    toggle.classList.add('active');
    label.classList.add('active');
    label.textContent = 'Auto Mode ON';
    showToast('🎤 Auto Voice Mode activated!', 'success');

    // If not already in a flow, start one for the current question
    if (!voiceState.autoFlowActive && !state.isLoading) {
      handleAutoFlow();
    }
  } else {
    toggle.classList.remove('active');
    label.classList.remove('active');
    label.textContent = 'Auto Mode';
    showToast('Auto Voice Mode deactivated', 'info');

    // Stop any ongoing voice activity
    voiceState.autoFlowActive = false;
    if (voiceState.isSpeaking) voiceState.synthesis.cancel();
    if (voiceState.isListening) stopListening();
    resetVoiceState();
  }
}

/**
 * Toggle mic manually (outside of auto mode).
 */
function toggleMic() {
  if (voiceState.isListening) {
    stopListening();
  } else {
    // Stop speaking if AI is talking
    if (voiceState.isSpeaking) {
      voiceState.synthesis.cancel();
    }
    startListening();
  }
}

// ========================
// ANSWER SUBMISSION (Manual)
// ========================

/**
 * Submit the current answer to the API for evaluation.
 * Works for both text and voice input.
 */
async function submitAnswer() {
  if (state.isLoading) return;

  // Stop any voice activity
  if (voiceState.isListening) stopListening();
  if (voiceState.isSpeaking) voiceState.synthesis.cancel();
  voiceState.autoFlowActive = false;

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

  // Set processing state on avatar
  setAvatarState('processing');
  setVoiceStatus('processing', 'Processing...');

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
        showEvalResult(result);
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
  setAvatarState('');
  setVoiceStatus('', 'Ready');

  // Advance or finish
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    loadQuestion();
  } else {
    await finishInterview();
  }
}

// ========================
// AI MODEL ANSWER
// ========================

/**
 * Fetch and display the AI-generated model answer.
 */
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

// ========================
// NAVIGATION
// ========================

/**
 * Skip without evaluating.
 */
function skipQuestion() {
  // Stop voice activity
  if (voiceState.isListening) stopListening();
  if (voiceState.isSpeaking) voiceState.synthesis.cancel();
  voiceState.autoFlowActive = false;

  state.answers[state.currentIndex] = '';
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    loadQuestion();
    showToast('Question skipped', 'info');
  } else {
    finishInterview();
  }
}

/**
 * Navigate to previous question.
 */
function prevQuestion() {
  // Stop voice activity
  if (voiceState.isListening) stopListening();
  if (voiceState.isSpeaking) voiceState.synthesis.cancel();
  voiceState.autoFlowActive = false;

  if (state.currentIndex > 0) {
    state.answers[state.currentIndex] = document.getElementById('answerInput').value.trim();
    state.currentIndex--;
    loadQuestion();
  }
}

// ========================
// UTILITIES
// ========================

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

/**
 * Promise-based delay utility.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function confirmEndInterview() {
  openModal('endModal');
}

/**
 * Called by the modal "End & View Results" button.
 */
async function endInterview() {
  closeModal('endModal');

  // Cleanup voice
  resetVoiceState();
  voiceState.autoMode = false;

  await finishInterview();
}

// ========================
// FINISH INTERVIEW
// ========================

/**
 * End session via API and go to dashboard.
 */
async function finishInterview() {
  clearInterval(state.timerInterval);

  // Cleanup voice
  resetVoiceState();

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

/**
 * Build local results for dashboard when server is offline.
 */
function buildLocalResults() {
  const answered = state.answers.filter(a => a && a.trim());
  const totalQuestions = state.questions.length;
  const answeredCount = answered.length;
  const skippedCount = totalQuestions - answeredCount;

  const questions = state.questions.map((q, i) => {
    const hasAnswer = state.answers[i] && state.answers[i].trim();
    const answerLen = hasAnswer ? state.answers[i].length : 0;
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

// ========================
// VOICE INIT: PRELOAD VOICES
// ========================

// Chrome loads voices asynchronously - ensure they're available
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices(); // Preload voices
  };
}

// ========================
// BOOT
// ========================
document.addEventListener('DOMContentLoaded', initInterview);
