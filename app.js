const view = document.querySelector('#view');
const app = document.querySelector('#app');
const authScreen = document.querySelector('#auth-screen');
const toastEl = document.querySelector('#toast');
const topDate = document.querySelector('#top-date');
let activeView = 'home';
let entries = [];
let toastTimer;

const monthDay = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const stampDate = (value) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') showAuth();
    throw new Error(payload.error || 'Something went wrong. Please try again.');
  }
  return payload;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function showAuth() {
  app.hidden = true;
  authScreen.hidden = false;
  document.querySelector('#password').focus();
}

async function enterApp() {
  authScreen.hidden = true;
  app.hidden = false;
  topDate.textContent = longDate.format(new Date());
  await refreshEntries();
  render();
}

async function refreshEntries() {
  entries = await api('/api/entries');
}

function navigate(next) {
  activeView = next;
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === next));
  render();
  view.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pageHeading(eyebrow, title, subtitle, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subheading">${subtitle}</p></div>${action}</div>`;
}

function entryRows(items) {
  if (!items.length) return '<div class="empty-state">Your saved reflections will appear here.</div>';
  return `<div class="entry-list">${items.map((entry) => `<button class="entry-row" data-open-entry="${escapeHTML(entry.id)}"><span class="entry-type-dot ${entry.kind === 'activity' ? 'activity' : ''}"></span><span class="entry-row-main"><strong>${escapeHTML(entry.title)}</strong><span>${entry.kind === 'thought' ? 'Thought record' : 'Activity plan'}</span></span><time>${stampDate(entry.created_at)}</time><span class="muted" aria-hidden="true">→</span></button>`).join('')}</div>`;
}

function renderHome() {
  const recent = entries.slice(0, 3);
  const thisMonth = entries.filter((item) => new Date(item.created_at).getMonth() === new Date().getMonth() && new Date(item.created_at).getFullYear() === new Date().getFullYear()).length;
  return `${pageHeading('A MOMENT FOR YOU', 'Good to see you.', `It’s ${monthDay.format(new Date())}. Start wherever you are today.`)}
    <section class="hero">
      <div class="hero-card"><div><p class="eyebrow">A GENTLE PLACE TO BEGIN</p><h2>You don’t have to solve everything at once.</h2><p>Take a little time to notice what’s on your mind, and choose one next step that feels manageable.</p></div><button class="button" data-go="thought">Open a thought record <span aria-hidden="true">→</span></button></div>
      <div class="quote-card"><span class="quote-mark">“</span><blockquote>Small steps count, especially on the days they feel small.</blockquote><p>A reminder for today</p></div>
    </section>
    <div class="stats-row"><div class="stat-card"><span>Reflections saved</span><strong>${entries.length}</strong><small>Across all your sessions</small></div><div class="stat-card"><span>Added this month</span><strong>${thisMonth}</strong><small>At your own pace</small></div><div class="stat-card"><span>Your data</span><strong>Private</strong><small>Stored on your server</small></div></div>
    <div class="section-header"><h2>Choose a tool</h2></div>
    <section class="tool-grid"><article class="tool-card"><span class="tool-icon thought">◌</span><div><h3>Thought record</h3><p>Look at a difficult thought from a few different angles and find a more balanced view.</p><button data-go="thought">Start a reflection →</button></div></article><article class="tool-card"><span class="tool-icon activity">↗</span><div><h3>Activity plan</h3><p>Plan one activity that could bring a sense of achievement, enjoyment, or connection.</p><button data-go="activity">Plan an activity →</button></div></article></section>
    <div class="section-header"><h2>Recent entries</h2><button class="text-button" data-go="journal">View journal →</button></div>
    ${entryRows(recent)}`;
}

function renderThoughtForm() {
  return `${pageHeading('THOUGHT RECORD', 'Make space to reflect.', 'Notice the thought, look at the evidence, and consider a more balanced perspective.', '<button class="button ghost" data-go="home">← Back</button>')}
    <form id="thought-form" class="form-card">
      <div class="form-intro">Thoughts can feel convincing in the moment. This exercise helps you test one thought and consider a more accurate, balanced alternative. You can skip any field.</div>
      <div class="fields-grid">
        <div class="field full-width"><label for="situation">What was happening?</label><textarea id="situation" name="situation" placeholder="Describe the situation, briefly…"></textarea></div>
        <div class="field"><label for="emotion-before">Emotion <span class="hint">before</span></label><input id="emotion-before" name="emotionBefore" placeholder="e.g. worried, disappointed"></div>
        <div class="field"><label for="strength-before">How strong was it? <span class="hint">0–100%</span></label><div class="range-wrap"><input id="strength-before" name="strengthBefore" type="range" min="0" max="100" value="60"><output class="range-value" for="strength-before">60%</output></div></div>
        <div class="field full-width"><label for="thought">What went through your mind?</label><textarea id="thought" name="thought" placeholder="Write the thought as it appeared…"></textarea></div>
        <div class="field"><label for="evidence-for">Evidence that supports the thought</label><textarea id="evidence-for" name="evidenceFor" placeholder="What facts seem to support it?"></textarea></div>
        <div class="field"><label for="evidence-against">Evidence that doesn't support it</label><textarea id="evidence-against" name="evidenceAgainst" placeholder="What facts might you be overlooking?"></textarea></div>
        <div class="field full-width"><label for="balanced-thought">A more balanced thought</label><textarea id="balanced-thought" name="balancedThought" placeholder="What would be a fairer, more complete way to see this?"></textarea></div>
        <div class="field"><label for="emotion-after">Emotion <span class="hint">now</span></label><input id="emotion-after" name="emotionAfter" placeholder="e.g. calmer, still unsure"></div>
        <div class="field"><label for="strength-after">How strong is it now? <span class="hint">0–100%</span></label><div class="range-wrap"><input id="strength-after" name="strengthAfter" type="range" min="0" max="100" value="40"><output class="range-value" for="strength-after">40%</output></div></div>
      </div>
      <hr class="form-divider"><div class="form-actions"><p class="form-note">You can save an unfinished reflection and come back to it.</p><button class="button primary" type="submit">Save reflection <span aria-hidden="true">→</span></button></div>
      <p class="source-note">Adapted from Robert Fulton’s <a href="https://www.progresspsychotherapy.com/tools/" target="_blank" rel="noreferrer">Thought Record</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Adapted for this app; see <a href="/CONTENT_LICENSE.md" target="_blank">content attribution</a>.</p>
    </form>`;
}

function renderActivityForm() {
  return `${pageHeading('ACTIVITY PLAN', 'Make room for something good.', 'Choose one manageable activity and make a little space for it.', '<button class="button ghost" data-go="home">← Back</button>')}
    <form id="activity-form" class="form-card">
      <div class="form-intro">Activities can bring different kinds of satisfaction: a sense of achievement, enjoyment, or connection with others. Choose what feels useful to you.</div>
      <div class="fields-grid">
        <div class="field"><label for="activity-date">When?</label><input id="activity-date" name="date" type="date" value="${today()}" required></div>
        <div class="field"><label for="activity-time">Time of day</label><select id="activity-time" name="time"><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Any time</option></select></div>
        <div class="field full-width"><label for="activity">What would you like to do?</label><textarea id="activity" name="activity" placeholder="Choose something small and specific…" required></textarea></div>
        <div class="field"><label for="activity-quality">What would you like it to bring?</label><select id="activity-quality" name="quality"><option>Enjoyment</option><option>A sense of achievement</option><option>Connection with someone</option><option>A bit of each</option><option>Something else</option></select></div>
        <div class="field"><label for="activity-barrier">What might get in the way?</label><input id="activity-barrier" name="barrier" placeholder="Optional — and one way around it"></div>
        <div class="field full-width"><label for="activity-note">Afterwards, how did it go? <span class="hint">Optional for now</span></label><textarea id="activity-note" name="reflection" placeholder="You can return to this later in your journal…"></textarea></div>
      </div>
      <hr class="form-divider"><div class="form-actions"><p class="form-note">A small, realistic plan is enough.</p><button class="button primary" type="submit">Save activity plan <span aria-hidden="true">→</span></button></div>
      <p class="source-note">Adapted from Robert Fulton’s <a href="https://www.progresspsychotherapy.com/tools/" target="_blank" rel="noreferrer">Activity Diary</a>, licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Adapted for this app; see <a href="/CONTENT_LICENSE.md" target="_blank">content attribution</a>.</p>
    </form>`;
}

function renderJournal() {
  return `${pageHeading('YOUR JOURNAL', 'Your reflections.', 'A private record of the things you have noticed and tried.', '<button class="button secondary" data-go="settings">Data & settings</button>')}
    ${entries.length ? entryRows(entries) : '<div class="empty-state">Nothing here yet. When you save a reflection or activity plan, it will appear here.</div>'}`;
}

function detailCells(entry) {
  const labels = entry.kind === 'thought'
    ? [['Situation', 'situation'], ['Thought', 'thought'], ['Emotion before', 'emotionBefore'], ['Strength before', 'strengthBefore', '%'], ['Evidence for', 'evidenceFor'], ['Evidence against', 'evidenceAgainst'], ['Balanced thought', 'balancedThought'], ['Emotion now', 'emotionAfter'], ['Strength now', 'strengthAfter', '%']]
    : [['Activity', 'activity'], ['When', 'date'], ['Time', 'time'], ['What you wanted from it', 'quality'], ['Possible barrier', 'barrier'], ['Reflection', 'reflection']];
  return labels.map(([label, key, suffix]) => {
    const value = entry.body[key];
    if (value === undefined || value === null || value === '') return '';
    const display = suffix ? `${value}${suffix}` : value;
    return `<div class="detail-cell ${['situation', 'thought', 'evidenceFor', 'evidenceAgainst', 'balancedThought', 'activity', 'reflection'].includes(key) ? 'full-width' : ''}"><small>${label}</small><p>${escapeHTML(display)}</p></div>`;
  }).join('');
}

function renderEntry(entry) {
  if (!entry) { navigate('journal'); return; }
  view.innerHTML = `${pageHeading(entry.kind === 'thought' ? 'THOUGHT RECORD' : 'ACTIVITY PLAN', escapeHTML(entry.title), stampDate(entry.created_at), '<button class="button ghost" data-go="journal">← Journal</button>')}
    <section class="form-card"><div class="entry-detail-grid">${detailCells(entry)}</div><hr class="form-divider"><div class="form-actions"><p class="form-note">Saved to your private journal.</p><button class="button danger" data-delete-entry="${escapeHTML(entry.id)}">Delete entry</button></div></section>`;
}

function renderSettings() {
  return `${pageHeading('YOUR DATA', 'Data & settings.', 'Your journal lives in a SQLite database on this server. It is shared across your signed-in devices.', '<button class="button ghost" data-go="home">← Back</button>')}
    <div class="settings-grid"><section class="settings-card"><h2>Export a backup</h2><p>Download your entries as a JSON file. Keep the file somewhere private; it contains personal reflections.</p><div class="settings-actions"><button id="export-button" class="button secondary">Download my data ↓</button></div></section><section class="settings-card"><h2>Clear journal</h2><p>Delete every saved entry from this server. This cannot be undone.</p><div class="settings-actions"><button id="clear-button" class="button danger">Delete all entries</button></div></section></div>
    <p class="source-note">Sign-in sessions use an HttpOnly cookie. Journal entries are stored on the server, not in your browser. For sensitive information over LAN or VPN, serve the app through HTTPS. Keep a protected backup of the server’s <code>data/journal.sqlite3</code> database.</p>`;
}

function render() {
  if (activeView === 'thought') view.innerHTML = renderThoughtForm();
  else if (activeView === 'activity') view.innerHTML = renderActivityForm();
  else if (activeView === 'journal') view.innerHTML = renderJournal();
  else if (activeView === 'settings') view.innerHTML = renderSettings();
  else view.innerHTML = renderHome();
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const field = document.querySelector('#password');
  const error = document.querySelector('#login-error');
  error.textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: field.value }) });
    field.value = '';
    await enterApp();
  } catch (err) { error.textContent = err.message; }
});

document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.addEventListener('click', () => navigate(item.dataset.view)));
document.querySelector('#settings-button').addEventListener('click', () => navigate('settings'));
document.querySelector('#mobile-settings').addEventListener('click', () => navigate('settings'));
document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }); } catch (_) { /* Expired sessions are signed out below too. */ }
  showAuth();
});

view.addEventListener('click', async (event) => {
  const go = event.target.closest('[data-go]');
  if (go) { navigate(go.dataset.go); return; }
  const open = event.target.closest('[data-open-entry]');
  if (open) { renderEntry(entries.find((item) => item.id === open.dataset.openEntry)); return; }
  const remove = event.target.closest('[data-delete-entry]');
  if (remove && window.confirm('Delete this entry? This cannot be undone.')) {
    try { await api(`/api/entries/${encodeURIComponent(remove.dataset.deleteEntry)}`, { method: 'DELETE' }); await refreshEntries(); navigate('journal'); showToast('Entry deleted'); }
    catch (err) { showToast(err.message); }
  }
  if (event.target.closest('#export-button')) {
    try {
      const all = await api('/api/entries');
      const file = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: all }, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `stillpoint-journal-${today()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('Your backup is ready');
    } catch (err) { showToast(err.message); }
  }
  if (event.target.closest('#clear-button')) {
    if (!window.confirm('Permanently delete every journal entry from the server? This cannot be undone.')) return;
    try { await api('/api/entries/clear', { method: 'POST', body: '{}' }); entries = []; navigate('journal'); showToast('Journal cleared'); }
    catch (err) { showToast(err.message); }
  }
});

view.addEventListener('input', (event) => {
  if (event.target.matches('input[type="range"]')) {
    const output = view.querySelector(`output[for="${event.target.id}"]`);
    if (output) output.textContent = `${event.target.value}%`;
  }
});

view.addEventListener('submit', async (event) => {
  if (!event.target.matches('#thought-form, #activity-form')) return;
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  const isThought = form.id === 'thought-form';
  const title = isThought
    ? (values.thought?.trim() ? values.thought.trim().slice(0, 72) : 'Thought record')
    : (values.activity?.trim() ? values.activity.trim().slice(0, 72) : 'Activity plan');
  try {
    await api('/api/entries', { method: 'POST', body: JSON.stringify({ kind: isThought ? 'thought' : 'activity', title, body: values }) });
    await refreshEntries();
    navigate('journal');
    showToast('Saved to your journal');
  } catch (err) { showToast(err.message); }
});

(async function boot() {
  try {
    const session = await api('/api/session');
    if (session.authenticated) await enterApp();
    else showAuth();
  } catch (_) { showAuth(); }
})();
