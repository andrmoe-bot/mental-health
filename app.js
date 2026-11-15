const app = document.querySelector('#app');
const login = document.querySelector('#login');
const view = document.querySelector('#view');
const status = document.querySelector('#status');
let page = 'home';
let entries = [];

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
const today = () => new Date().toISOString().slice(0, 10);

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') showLogin();
    throw new Error(result.error || 'Request failed');
  }
  return result;
}

function showLogin() {
  app.hidden = true;
  login.hidden = false;
  document.querySelector('#login-error').textContent = '';
  document.querySelector('#password').focus();
}

async function refresh() { entries = await api('/api/entries'); }

function go(next) {
  page = next;
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === next) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  status.textContent = '';
  render();
}

function rows(items) {
  if (!items.length) return '<p>No entries yet.</p>';
  return `<ul class="entry-list">${items.map(item => `<li><button data-entry="${escapeHTML(item.id)}"><span class="entry-title">${escapeHTML(item.title)}</span><small>${item.kind === 'thought' ? 'Thought record' : 'Activity plan'}</small><time>${date(item.created_at)}</time></button></li>`).join('')}</ul>`;
}

function field(label, name, options = {}) {
  const id = `f-${name}`;
  const type = options.type || 'textarea';
  let input;
  if (type === 'textarea') input = `<textarea id="${id}" name="${name}" placeholder="${options.placeholder || ''}"></textarea>`;
  else if (type === 'select') input = `<select id="${id}" name="${name}">${options.values.map(value => `<option>${value}</option>`).join('')}</select>`;
  else if (type === 'range') input = `<div class="range"><input id="${id}" name="${name}" type="range" min="0" max="100" value="${options.value}"><output for="${id}">${options.value}%</output></div>`;
  else input = `<input id="${id}" name="${name}" type="${type}" ${options.value ? `value="${options.value}"` : ''} ${options.required ? 'required' : ''}>`;
  return `<div class="field"><label for="${id}">${label}</label>${input}</div>`;
}

function source(name, file) {
  return `<p class="source">Adapted from Robert Fulton’s <a href="/sources/${file}" target="_blank">${name} (original PDF)</a>, CC BY-SA 4.0. <a href="/CONTENT_LICENSE.md" target="_blank">Attribution</a>.</p>`;
}

function thoughtForm() {
  return `<h1>Thought record</h1><form class="exercise" data-kind="thought">
    ${field('Situation', 'situation')}
    ${field('Emotion before', 'emotionBefore', { type: 'text' })}
    ${field('Strength (%)', 'strengthBefore', { type: 'range', value: 60 })}
    ${field('Thought', 'thought')}
    ${field('Evidence for', 'evidenceFor')}
    ${field('Evidence against', 'evidenceAgainst')}
    ${field('Balanced thought', 'balancedThought')}
    ${field('Emotion after', 'emotionAfter', { type: 'text' })}
    ${field('Strength now (%)', 'strengthAfter', { type: 'range', value: 40 })}
    <button>Save</button>
    ${source('Thought Record', 'Thought-Record.pdf')}
  </form>`;
}

function activityForm() {
  return `<h1>Activity plan</h1><form class="exercise" data-kind="activity">
    ${field('Date', 'date', { type: 'date', value: today(), required: true })}
    ${field('Time', 'time', { type: 'select', values: ['Morning', 'Afternoon', 'Evening', 'Any time'] })}
    ${field('Activity', 'activity', { required: true })}
    ${field('Focus', 'quality', { type: 'select', values: ['Enjoyment', 'Achievement', 'Connection', 'A bit of each', 'Other'] })}
    ${field('Possible barrier', 'barrier', { type: 'text' })}
    ${field('Reflection', 'reflection')}
    <button>Save</button>
    ${source('Activity Diary', 'Activity-Diary.pdf')}
  </form>`;
}

const thoughtLabels = {
  situation: 'Situation', emotionBefore: 'Emotion before', strengthBefore: 'Strength before', thought: 'Thought',
  evidenceFor: 'Evidence for', evidenceAgainst: 'Evidence against', balancedThought: 'Balanced thought',
  emotionAfter: 'Emotion after', strengthAfter: 'Strength now',
};
const activityLabels = { date: 'Date', time: 'Time', activity: 'Activity', quality: 'Focus', barrier: 'Possible barrier', reflection: 'Reflection' };

function render() {
  if (page === 'home') view.innerHTML = `<h1>Today</h1><div class="actions"><button data-go="thought">Thought record</button><button data-go="activity">Activity plan</button></div><h2>Recent</h2>${rows(entries.slice(0, 5))}`;
  else if (page === 'thought') view.innerHTML = thoughtForm();
  else if (page === 'activity') view.innerHTML = activityForm();
  else if (page === 'journal') view.innerHTML = `<h1>Journal</h1>${rows(entries)}`;
  else if (page === 'settings') view.innerHTML = `<h1>Data</h1><p>Entries are stored on this server.</p><div class="actions"><button id="export">Export JSON</button><button id="clear">Delete all entries</button></div>`;
}

function showEntry(entry) {
  if (!entry) return;
  const labels = entry.kind === 'thought' ? thoughtLabels : activityLabels;
  const content = Object.entries(labels).filter(([, key]) => entry.body[key]).map(([key, label]) => `<dt>${label}</dt><dd>${escapeHTML(entry.body[key])}${key.startsWith('strength') ? '%' : ''}</dd>`).join('');
  view.innerHTML = `<h1>${escapeHTML(entry.title)}</h1><p>${date(entry.created_at)}</p><dl>${content}</dl><button data-go="journal">Back</button> <button data-delete="${escapeHTML(entry.id)}">Delete</button>`;
}

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.querySelector('#password');
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: password.value }) });
    password.value = '';
    login.hidden = true;
    app.hidden = false;
    await refresh();
    go('home');
  } catch (error) { document.querySelector('#login-error').textContent = error.message; }
});

app.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');
  if (nav) { go(nav.dataset.view); return; }
  const destination = event.target.closest('[data-go]');
  if (destination) { go(destination.dataset.go); return; }
  const row = event.target.closest('[data-entry]');
  if (row) { showEntry(entries.find(item => item.id === row.dataset.entry)); return; }
  if (event.target.closest('#export')) {
    try {
      const data = await api('/api/entries');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      link.download = `cbt-journal-${today()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) { status.textContent = error.message; }
  }
  const remove = event.target.closest('[data-delete]');
  if (remove && confirm('Delete this entry?')) {
    try { await api(`/api/entries/${encodeURIComponent(remove.dataset.delete)}`, { method: 'DELETE' }); await refresh(); go('journal'); }
    catch (error) { status.textContent = error.message; }
  }
  if (event.target.closest('#clear') && confirm('Delete all entries?')) {
    try { await api('/api/entries/clear', { method: 'POST', body: '{}' }); await refresh(); go('settings'); }
    catch (error) { status.textContent = error.message; }
  }
});

view.addEventListener('input', event => {
  if (event.target.type === 'range') view.querySelector(`output[for="${event.target.id}"]`).textContent = `${event.target.value}%`;
});

view.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-kind]');
  if (!form) return;
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  const kind = form.dataset.kind;
  const title = (body.thought || body.activity || '').trim().slice(0, 72) || (kind === 'thought' ? 'Thought record' : 'Activity plan');
  try {
    await api('/api/entries', { method: 'POST', body: JSON.stringify({ kind, title, body }) });
    await refresh();
    go('journal');
  } catch (error) { status.textContent = error.message; }
});

document.querySelector('#logout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST', body: '{}' }); } catch (_) {}
  showLogin();
});

(async () => {
  try {
    const session = await api('/api/session');
    if (session.authenticated) {
      login.hidden = true;
      app.hidden = false;
      await refresh();
      go('home');
    } else showLogin();
  } catch (_) { showLogin(); }
})();
