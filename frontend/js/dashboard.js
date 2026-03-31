// ========== Dashboard Logic ==========

function initDashboard() {
  const resultStr = sessionStorage.getItem('nexthire_last_result');
  if (!resultStr) {
    showToast('No results found. Start an interview first.', 'error');
    setTimeout(() => window.location.href = 'select-role.html', 1500);
    return;
  }

  const result = JSON.parse(resultStr);
  const results = result.results;
  const totalScore = result.totalScore;

  // Subtitle
  document.getElementById('dashboardSubtitle').textContent = 
    `${result.role.name} • ${result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1)} • ${formatDuration(result.duration)}`;

  // Score circle animation
  setTimeout(() => {
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 80; // r=80
    const offset = circumference - (totalScore / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Color based on score
    if (totalScore >= 70) circle.style.stroke = '#10B981';
    else if (totalScore >= 40) circle.style.stroke = '#F59E0B';
    else circle.style.stroke = '#EF4444';
  }, 300);

  // Score number animation
  animateNumber('totalScore', 0, totalScore, 1500);

  // Grade
  const grade = totalScore >= 90 ? 'Excellent! 🌟' : totalScore >= 70 ? 'Great Job! 👏' : totalScore >= 50 ? 'Good Effort 👍' : totalScore >= 30 ? 'Keep Practicing 💪' : 'Needs Improvement 📚';
  document.getElementById('scoreGrade').textContent = grade;

  // Metrics
  const avgCorrectness = Math.round(results.reduce((s, r) => s + r.correctness, 0) / results.length);
  const avgDepth = Math.round(results.reduce((s, r) => s + r.depth, 0) / results.length);
  const avgClarity = Math.round(results.reduce((s, r) => s + r.clarity, 0) / results.length);

  setTimeout(() => {
    document.getElementById('correctnessBar').style.width = avgCorrectness + '%';
    document.getElementById('correctnessVal').textContent = avgCorrectness + '%';
    document.getElementById('depthBar').style.width = avgDepth + '%';
    document.getElementById('depthVal').textContent = avgDepth + '%';
    document.getElementById('clarityBar').style.width = avgClarity + '%';
    document.getElementById('clarityVal').textContent = avgClarity + '%';
  }, 500);

  // Summary cards
  const answered = results.filter(r => r.answer !== '(Skipped)').length;
  const skipped = results.length - answered;
  const avgScoreVal = (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1);
  
  document.getElementById('answeredCount').textContent = answered;
  document.getElementById('skippedCount').textContent = skipped;
  document.getElementById('avgScore').textContent = avgScoreVal + '/10';

  // Strengths & Weaknesses
  const swDiv = document.getElementById('strengthsWeaknesses');
  const metrics = [
    { name: 'Correctness', val: avgCorrectness },
    { name: 'Depth', val: avgDepth },
    { name: 'Clarity', val: avgClarity }
  ].sort((a, b) => b.val - a.val);

  swDiv.innerHTML = `
    <div style="margin-bottom:12px;">
      <span style="color:var(--success); font-weight:600;">Strongest:</span> ${metrics[0].name} (${metrics[0].val}%)
    </div>
    <div>
      <span style="color:var(--warning); font-weight:600;">Needs Work:</span> ${metrics[2].name} (${metrics[2].val}%)
    </div>
  `;

  // Q&A Accordion
  const accordion = document.getElementById('qaAccordion');
  accordion.innerHTML = results.map((r, i) => {
    const scoreClass = r.score >= 7 ? 'high' : r.score >= 4 ? 'mid' : 'low';
    return `
      <div class="glass-card qa-item" id="qa-${i}">
        <div class="qa-header" onclick="toggleQA(${i})">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Q${i + 1}: ${r.question}</div>
          </div>
          <span class="qa-score ${scoreClass}">${r.score}/10</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; transition:transform 0.3s;"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="qa-body">
          <div style="margin-top:16px;">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px; font-weight:600;">YOUR ANSWER</div>
            <div style="font-size:0.9rem; color:var(--text-secondary); padding:12px; background:var(--surface); border-radius:var(--radius-sm); margin-bottom:16px; white-space:pre-wrap;">${r.answer}</div>
            
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px; font-weight:600;">💬 AI FEEDBACK</div>
            <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:12px;">${r.feedback}</div>
            
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px; font-weight:600;">🎯 IMPROVEMENT TIPS</div>
            <div style="font-size:0.9rem; color:var(--secondary);">${r.improvement}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleQA(index) {
  const item = document.getElementById(`qa-${index}`);
  item.classList.toggle('open');
}

function animateNumber(elementId, start, end, duration) {
  const el = document.getElementById(elementId);
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

document.addEventListener('DOMContentLoaded', initDashboard);
