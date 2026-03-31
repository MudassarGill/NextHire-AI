// ========== Role Selection — API first, local fallback ==========

const ROLE_ICONS = {
  'ml-engineer':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  'data-scientist':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  'frontend-dev':  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  'backend-dev':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  'fullstack-dev': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  'devops':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  'data-analyst':  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>`,
  'ai-researcher': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-1.54A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-1.54A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
  'ui-ux':         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  'mobile-dev':    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  'cloud-architect':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
  'cybersecurity': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};

const ROLES = [
  { id: 'ml-engineer',    name: 'Machine Learning Engineer', color: 'purple', category: 'data',        description: 'Build and deploy ML models, feature engineering, and model optimization.',  difficulty: 'hard'   },
  { id: 'data-scientist', name: 'Data Scientist',            color: 'cyan',   category: 'data',        description: 'Statistical analysis, data visualization, and predictive modeling.',        difficulty: 'medium' },
  { id: 'frontend-dev',   name: 'Frontend Developer',        color: 'pink',   category: 'engineering', description: 'Build responsive UIs with HTML, CSS, JavaScript, React, or Vue.',           difficulty: 'medium' },
  { id: 'backend-dev',    name: 'Backend Developer',         color: 'green',  category: 'engineering', description: 'Server-side development, APIs, databases, and system design.',              difficulty: 'hard'   },
  { id: 'fullstack-dev',  name: 'Full Stack Developer',      color: 'purple', category: 'engineering', description: 'End-to-end web development combining frontend and backend skills.',         difficulty: 'hard'   },
  { id: 'devops',         name: 'DevOps Engineer',           color: 'cyan',   category: 'engineering', description: 'CI/CD, cloud infrastructure, Docker, Kubernetes, and automation.',          difficulty: 'hard'   },
  { id: 'data-analyst',   name: 'Data Analyst',              color: 'green',  category: 'data',        description: 'Data cleaning, SQL, Excel, dashboards, and business intelligence.',         difficulty: 'easy'   },
  { id: 'ai-researcher',  name: 'AI Research Scientist',     color: 'pink',   category: 'data',        description: 'Deep learning, NLP, computer vision, and research methodologies.',          difficulty: 'hard'   },
  { id: 'ui-ux',          name: 'UI/UX Designer',            color: 'cyan',   category: 'design',      description: 'User research, wireframing, prototyping, and design systems.',              difficulty: 'medium' },
  { id: 'mobile-dev',     name: 'Mobile Developer',          color: 'purple', category: 'engineering', description: 'iOS/Android development, React Native, and Flutter.',                      difficulty: 'medium' },
  { id: 'cloud-architect',name: 'Cloud Architect',           color: 'cyan',   category: 'engineering', description: 'AWS, Azure, GCP architecture, microservices, and scalability.',             difficulty: 'hard'   },
  { id: 'cybersecurity',  name: 'Cybersecurity Analyst',     color: 'pink',   category: 'engineering', description: 'Network security, penetration testing, and security protocols.',            difficulty: 'hard'   },
];

// ---- Local mock question bank (fallback when server is offline) ----
const MOCK_QUESTIONS_DB = {
  'ml-engineer': [
    'Explain the bias-variance tradeoff in machine learning.',
    'What is gradient descent and how does it work?',
    'Describe the difference between L1 and L2 regularization.',
    'How would you handle imbalanced datasets?',
    'Explain the concept of cross-validation and its types.',
    'What is the difference between bagging and boosting?',
    'Describe how a Random Forest algorithm works.',
    'What are hyperparameters and how do you tune them?',
    'Explain the concept of feature engineering.',
    'What is transfer learning and when would you use it?',
    'How does backpropagation work in neural networks?',
    'What is the vanishing gradient problem?',
    'Explain precision, recall, and F1-score.',
    'What is a ROC curve and AUC?',
    'Describe the architecture of a Convolutional Neural Network.',
  ],
  'data-scientist': [
    'What is the Central Limit Theorem and why is it important?',
    'Explain the difference between supervised and unsupervised learning.',
    'How would you handle missing data in a dataset?',
    'What is p-value and how do you interpret it?',
    'Explain the concept of A/B testing.',
    'What is the difference between correlation and causation?',
    'Describe the steps in a typical data science project.',
    'What is dimensionality reduction? Name some techniques.',
    'Explain how k-means clustering works.',
    'What is overfitting and how do you prevent it?',
    'Explain the difference between Type I and Type II errors.',
    'What is a confusion matrix?',
    'How do you evaluate a regression model?',
    'What is feature selection and why is it important?',
    'Describe the difference between parametric and non-parametric models.',
  ],
  'frontend-dev': [
    'What is the difference between == and === in JavaScript?',
    'Explain the CSS Box Model.',
    'What are closures in JavaScript?',
    'Describe the virtual DOM and how React uses it.',
    'What is responsive design and how do you implement it?',
    'Explain event delegation in JavaScript.',
    'What is the difference between let, const, and var?',
    'How does CSS Flexbox work?',
    'What are Web Components?',
    'Explain the concept of Progressive Web Apps (PWAs).',
    'What is the difference between cookies, localStorage, and sessionStorage?',
    'Explain CSS Grid layout.',
    'What is CORS and how do you handle it?',
    'Describe the JavaScript event loop.',
    'What are React hooks? Explain useState and useEffect.',
  ],
  'backend-dev': [
    'What is RESTful API design? Explain its principles.',
    'Describe the difference between SQL and NoSQL databases.',
    'What is middleware in web frameworks?',
    'Explain database indexing and its benefits.',
    'What are microservices and how do they differ from monoliths?',
    'Describe OAuth 2.0 authentication flow.',
    'What is caching and what strategies do you know?',
    'Explain the concept of database normalization.',
    'What is a message queue and when would you use one?',
    'Describe the SOLID principles.',
    'What is rate limiting and how would you implement it?',
    'Explain the difference between horizontal and vertical scaling.',
    'What are database transactions and ACID properties?',
    'How do you handle API versioning?',
    'What is GraphQL and how does it differ from REST?',
  ],
};

function getDefaultQuestions() {
  return [
    'Tell me about your experience and background in this field.',
    'What are the key technical skills needed for this role?',
    'Describe a challenging project you have worked on.',
    'How do you stay updated with the latest trends in your field?',
    'What is your approach to debugging and problem-solving?',
    'How do you handle tight deadlines and competing priorities?',
    'Describe your experience with version control and team collaboration.',
    'What tools and technologies are you most proficient with?',
    'How do you ensure quality in your work?',
    'Describe a time you had to quickly learn a new technology.',
    'How do you approach system design for scalability?',
    'What motivates you in your technical career?',
    'How do you handle code reviews and constructive feedback?',
    'Describe your biggest technical achievement so far.',
    'What are you currently learning or exploring in your field?',
  ];
}

function getLocalQuestions(roleId, count) {
  const pool = MOCK_QUESTIONS_DB[roleId] || getDefaultQuestions();
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((q, i) => ({ id: -(i + 1), question_number: i + 1, question_text: q }));
}

// ---------------------------------------------------------------

let selectedRole = null;
let activeFilter = 'all';

function renderRoles(filter = 'all', search = '') {
  const grid = document.getElementById('rolesGrid');
  if (!grid) return;

  let filtered = ROLES;
  if (filter !== 'all') filtered = filtered.filter(r => r.category === filter);
  if (search) filtered = filtered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><h3>No roles found</h3><p>Try a different search or filter.</p></div>';
    return;
  }

  grid.innerHTML = filtered.map((role, i) => `
    <div class="glass-card role-card animate-fade-in delay-${Math.min(i + 1, 5)} ${selectedRole?.id === role.id ? 'selected' : ''}"
         onclick="selectRole('${role.id}')" id="role-${role.id}">
      <div class="role-icon-wrap feature-icon ${role.color}">${ROLE_ICONS[role.id] || ''}</div>
      <h3>${role.name}</h3>
      <p>${role.description}</p>
      <div class="role-meta">
        <span class="role-badge ${role.difficulty}">${role.difficulty.charAt(0).toUpperCase() + role.difficulty.slice(1)}</span>
      </div>
    </div>
  `).join('');
}

function selectRole(roleId) {
  selectedRole = ROLES.find(r => r.id === roleId);
  renderRoles(activeFilter, document.getElementById('roleSearch')?.value || '');

  const panel  = document.getElementById('configPanel');
  const nameEl = document.getElementById('selectedRoleName');
  if (panel && nameEl && selectedRole) {
    panel.style.display = 'flex';
    nameEl.textContent  = selectedRole.name;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function startInterview() {
  if (!selectedRole) { showToast('Please select a role first!', 'error'); return; }

  const difficulty    = document.getElementById('difficultySelect').value;
  const questionCount = parseInt(document.getElementById('questionCount').value, 10);
  const token         = localStorage.getItem('nexthire_token') || '';

  const btn = document.getElementById('startInterviewBtn');
  btn.disabled   = true;
  btn.innerHTML  = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;flex-shrink:0;"></span> Generating Questions...`;

  // ---- Try real API (only when token is a real JWT, not local-) ----
  if (token && !token.startsWith('local-')) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('/api/interview/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ role: selectedRole.name, difficulty, question_count: questionCount }),
        signal:  controller.signal
      });
      clearTimeout(t);

      if (response.ok) {
        const data = await response.json();
        const config = {
          role: selectedRole, difficulty,
          questionCount: data.question_count,
          sessionId: data.session_id,
          questions: data.questions,
          startedAt: new Date().toISOString(),
          mode: 'api'
        };
        sessionStorage.setItem('nexthire_interview_config', JSON.stringify(config));
        window.location.href = 'interview.html';
        return;
      }

      // Server returned an error (e.g. 422 validation) — show it
      let errDetail = 'Could not start interview via API';
      try { const err = await response.json(); errDetail = err.detail || errDetail; } catch (_) {}
      showToast(errDetail + ' — switching to demo mode', 'info');

    } catch (_) {
      // Network error or timeout — fall through to local mode
    }
  }

  // ---- Local / Offline fallback ----
  showToast('Running in demo mode (server offline)', 'info');
  const questions = getLocalQuestions(selectedRole.id, questionCount);
  const config = {
    role: selectedRole, difficulty,
    questionCount: questions.length,
    sessionId: 'local-' + Date.now(),
    questions,
    startedAt: new Date().toISOString(),
    mode: 'local'
  };
  sessionStorage.setItem('nexthire_interview_config', JSON.stringify(config));
  window.location.href = 'interview.html';
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  renderRoles();

  document.getElementById('roleSearch')?.addEventListener('input', e => {
    renderRoles(activeFilter, e.target.value);
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderRoles(activeFilter, document.getElementById('roleSearch')?.value || '');
    });
  });
});
