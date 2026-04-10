// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ── API helper ─────────────────────────────────────────────────────────────
async function callAPI(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function showError(el, msg) {
  el.classList.remove('hidden');
  el.innerHTML = `<div class="error-msg">❌ ${msg}</div>`;
}

// ── Render helpers ─────────────────────────────────────────────────────────
function renderLabel(text) {
  return `<div class="result-label">${text}</div>`;
}

function renderIssues(issues) {
  if (!issues.length) return '';
  const icons = { error: '🚨', warning: '⚠️', info: 'ℹ️' };
  const items = issues.map((i) =>
    `<li class="issue ${i.severity}"><span class="issue-icon">${icons[i.severity] ?? 'ℹ️'}</span>${i.message}</li>`
  ).join('');
  return renderLabel('問題清單') + `<ul class="issues">${items}</ul>`;
}

function renderSuggestions(suggestions) {
  if (!suggestions.length) return '';
  const items = suggestions.map((s) => `<li>${s}</li>`).join('');
  return renderLabel('改善建議') + `<ul class="suggestions">${items}</ul>`;
}

function renderTags(tags) {
  if (!tags?.length) return '';
  return `<div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>`;
}

function renderStats(stats) {
  const items = stats.map(({ label, value }) =>
    `<div class="stat"><strong>${value}</strong>${label}</div>`
  ).join('');
  return `<div class="stats">${items}</div>`;
}

function gradeClass(grade) { return `grade grade-${grade}`; }

// ── Create Post ─────────────────────────────────────────────────────────────
document.getElementById('form-create-post').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const result = document.getElementById('result-create-post');
  const fd = new FormData(e.target);

  const body = { topic: fd.get('topic'), template: fd.get('template') };
  if (fd.get('title')) body.title = fd.get('title');
  if (fd.get('wordCountTarget')) body.wordCountTarget = parseInt(fd.get('wordCountTarget'));

  btn.textContent = '生成中…'; btn.classList.add('loading'); btn.disabled = true;

  const json = await callAPI('/api/create-post', body).catch((err) => ({ ok: false, error: err.message }));

  btn.textContent = '生成文章骨架'; btn.classList.remove('loading'); btn.disabled = false;

  if (!json.ok) return showError(result, json.error);

  const d = json.data;
  const sections = d.sections.map((s) =>
    `<li class="section-item"><div class="h2">📌 ${s.heading}</div></li>`
  ).join('');

  result.classList.remove('hidden');
  result.innerHTML = `
    <h3>${d.title}</h3>
    <div class="slug-row">🔗 /${d.slug}</div>
    ${renderTags(d.tags)}
    ${renderStats([
      { label: '目標字數', value: d.wordCountTarget.toLocaleString() },
      { label: '章節數', value: d.sections.length },
      { label: '模板', value: d.template },
    ])}
    ${renderLabel('Meta 描述')}
    <p style="font-size:.9rem;color:var(--muted);margin-bottom:.5rem">${d.metaDescription}</p>
    ${renderLabel('章節結構')}
    <ul class="sections">${sections}</ul>
  `;
});

// ── Outline ─────────────────────────────────────────────────────────────────
document.getElementById('form-outline').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const result = document.getElementById('result-outline');
  const fd = new FormData(e.target);

  const body = { topic: fd.get('topic') };
  const rawSections = fd.get('sections').trim();
  if (rawSections) body.sections = rawSections.split('\n').map((s) => s.trim()).filter(Boolean);
  if (fd.get('subPointsPerSection')) body.subPointsPerSection = parseInt(fd.get('subPointsPerSection'));

  btn.textContent = '生成中…'; btn.classList.add('loading'); btn.disabled = true;

  const json = await callAPI('/api/outline-content', body).catch((err) => ({ ok: false, error: err.message }));

  btn.textContent = '生成大綱'; btn.classList.remove('loading'); btn.disabled = false;

  if (!json.ok) return showError(result, json.error);

  const d = json.data;
  const items = d.outline.map((item) => {
    const children = item.children?.length
      ? `<div class="h3">${item.children.map((c) => `<span>↳ ${c.heading}</span>`).join('')}</div>`
      : '';
    return `<li class="section-item"><div class="h2">📌 ${item.heading}</div>${children}</li>`;
  }).join('');

  result.classList.remove('hidden');
  result.innerHTML = `
    <h3>${d.title}</h3>
    ${renderStats([
      { label: '主題', value: d.topic },
      { label: '章節數', value: d.outline.length },
      { label: '大綱深度', value: `H${d.depth + 1}` },
    ])}
    ${renderLabel('大綱結構')}
    <ul class="sections">${items}</ul>
  `;
});

// ── SEO ─────────────────────────────────────────────────────────────────────
document.getElementById('form-seo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const result = document.getElementById('result-seo');
  const fd = new FormData(e.target);

  const body = {
    title: fd.get('title'),
    metaDescription: fd.get('metaDescription'),
    content: fd.get('content'),
  };
  if (fd.get('keyword')) body.keyword = fd.get('keyword');
  if (fd.get('tags')) body.tags = fd.get('tags').split(',').map((t) => t.trim()).filter(Boolean);

  btn.textContent = '分析中…'; btn.classList.add('loading'); btn.disabled = true;

  const json = await callAPI('/api/optimize-seo', body).catch((err) => ({ ok: false, error: err.message }));

  btn.textContent = '分析 SEO'; btn.classList.remove('loading'); btn.disabled = false;

  if (!json.ok) return showError(result, json.error);

  const d = json.data;
  const checks = Object.entries(d.checks).map(([k, v]) =>
    `<span class="tag" style="background:${v ? '#dcfce7' : '#fee2e2'};color:${v ? '#15803d' : '#b91c1c'}">${v ? '✅' : '❌'} ${k}</span>`
  ).join('');

  result.classList.remove('hidden');
  result.innerHTML = `
    <div class="score-badge">
      ${d.score}<span>/100</span>
      <span class="${gradeClass(d.grade)}">${d.grade}</span>
    </div>
    ${renderLabel('檢查項目')}
    <div class="tags" style="margin-bottom:.75rem">${checks}</div>
    ${renderIssues(d.issues)}
    ${renderSuggestions(d.suggestions)}
  `;
});

// ── Readability ──────────────────────────────────────────────────────────────
document.getElementById('form-readability').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const result = document.getElementById('result-readability');
  const fd = new FormData(e.target);

  const body = { content: fd.get('content'), target: fd.get('target') };

  btn.textContent = '分析中…'; btn.classList.add('loading'); btn.disabled = true;

  const json = await callAPI('/api/analyze-readability', body).catch((err) => ({ ok: false, error: err.message }));

  btn.textContent = '分析可讀性'; btn.classList.remove('loading'); btn.disabled = false;

  if (!json.ok) return showError(result, json.error);

  const d = json.data;
  const levelColor = { 'Very Easy': '#16a34a', 'Easy': '#2563eb', 'Fairly Easy': '#0891b2',
    'Standard': '#d97706', 'Fairly Difficult': '#ea580c', 'Difficult': '#dc2626', 'Very Difficult': '#7f1d1d' };
  const color = levelColor[d.level] ?? '#6b7280';

  result.classList.remove('hidden');
  result.innerHTML = `
    <div class="score-badge">
      ${d.fleschScore}
      <span style="font-size:1rem;font-weight:600;color:${color};background:${color}22;padding:.2rem .7rem;border-radius:20px">${d.level}</span>
    </div>
    ${renderStats([
      { label: '字數', value: d.wordCount.toLocaleString() },
      { label: '句子數', value: d.sentenceCount },
      { label: '平均句長（字）', value: d.avgSentenceLen },
      { label: '平均音節/字', value: d.avgSyllablesPerWord },
    ])}
    ${renderIssues(d.issues)}
    ${renderSuggestions(d.suggestions)}
  `;
});
