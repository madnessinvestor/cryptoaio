// ─── GitHub Gist Sync ─────────────────────────────────────────────────────────

const GIST_TOKEN_KEY = 'cryptoaio_gist_token';
const GIST_ID_KEY    = 'cryptoaio_gist_id';

// API prefixes that should trigger an auto-sync when written
const _GIST_WATCH = [
  '/api/assets',
  '/api/portfolio',
  '/api/dashboard/wallets',
  '/api/dashboard/manual',
];

// Substrings that suppress auto-sync even on matching prefixes
const _GIST_SKIP = ['/api/gist/', '/refresh', '/snapshot'];

let _gistSyncTimer  = null;
const _origFetch    = window.fetch.bind(window);

// ── Intercept fetch — trigger debounced sync on data-writing calls ─────────────
(function _patchFetch() {
  window.fetch = function (url, opts) {
    const promise = _origFetch(url, opts || {});
    const method  = ((opts && opts.method) || 'GET').toUpperCase();
    const urlStr  = typeof url === 'string' ? url : String(url);

    if (method !== 'GET') {
      const watched = _GIST_WATCH.some(p => urlStr.startsWith(p));
      const skipped = _GIST_SKIP.some(s => urlStr.includes(s));
      if (watched && !skipped) {
        promise.then(r => { if (r && r.ok) _gistScheduleAutoSync(); }).catch(() => {});
      }
    }
    return promise;
  };
})();

// ── Auto-sync (debounced 3 s after last write) ─────────────────────────────────
function _gistScheduleAutoSync() {
  if (!localStorage.getItem(GIST_TOKEN_KEY)) return;
  clearTimeout(_gistSyncTimer);
  _gistSetStatus('pending', _gt('set_gist_auto_pending'));
  _gistSyncTimer = setTimeout(_gistDoSync, 3000);
}

async function _gistDoSync() {
  const token  = localStorage.getItem(GIST_TOKEN_KEY) || '';
  const gistId = localStorage.getItem(GIST_ID_KEY)    || '';
  if (!token) return;
  _gistSetStatus('loading', _gt('set_gist_sending'));
  try {
    const r = await _origFetch('/api/gist/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, gist_id: gistId }),
    });
    const d = await r.json();
    if (d.ok) {
      localStorage.setItem(GIST_ID_KEY, d.gist_id);
      _gistSetStatus('ok', `☁️ ${_gt('set_gist_synced')}`);
    } else {
      _gistSetStatus('error', d.error || _gt('set_gist_err_generic'));
    }
  } catch {
    _gistSetStatus('error', _gt('set_gist_err_conn'));
  }
}

// ── Manual backup (button) ─────────────────────────────────────────────────────
async function gistBackup() {
  const token  = localStorage.getItem(GIST_TOKEN_KEY) || '';
  const gistId = localStorage.getItem(GIST_ID_KEY)    || '';
  if (!token) { _gistSetStatus('error', _gt('set_gist_err_no_token')); return; }
  clearTimeout(_gistSyncTimer);
  _gistSetStatus('loading', _gt('set_gist_sending'));
  try {
    const r = await _origFetch('/api/gist/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, gist_id: gistId }),
    });
    const d = await r.json();
    if (d.ok) {
      localStorage.setItem(GIST_ID_KEY, d.gist_id);
      _gistSetStatus('ok', `✅ ${_gt('set_gist_backup_ok')} ${d.gist_id.slice(0, 8)}…`);
    } else {
      _gistSetStatus('error', d.error || _gt('set_gist_err_generic'));
    }
  } catch {
    _gistSetStatus('error', _gt('set_gist_err_conn'));
  }
}

// ── Restore (button) ──────────────────────────────────────────────────────────
async function gistRestore() {
  const token  = localStorage.getItem(GIST_TOKEN_KEY) || '';
  const gistId = localStorage.getItem(GIST_ID_KEY)    || '';
  if (!token)  { _gistSetStatus('error', _gt('set_gist_err_no_token')); return; }
  if (!gistId) { _gistSetStatus('error', _gt('set_gist_err_no_gist'));  return; }
  if (!confirm(_gt('set_gist_confirm_restore'))) return;
  _gistSetStatus('loading', _gt('set_gist_restoring'));
  try {
    const r = await _origFetch('/api/gist/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, gist_id: gistId }),
    });
    const d = await r.json();
    if (d.ok) {
      _gistSetStatus('ok', `✅ ${_gt('set_gist_restore_ok')}`);
      setTimeout(() => location.reload(), 1500);
    } else {
      _gistSetStatus('error', d.error || _gt('set_gist_err_generic'));
    }
  } catch {
    _gistSetStatus('error', _gt('set_gist_err_conn'));
  }
}

// ── Token save (button) ───────────────────────────────────────────────────────
function gistSaveToken() {
  const token = (document.getElementById('gist-token-input')?.value || '').trim();
  if (!token) { _gistSetStatus('error', _gt('set_gist_err_no_token')); return; }
  localStorage.setItem(GIST_TOKEN_KEY, token);
  _gistSetStatus('ok', _gt('set_gist_token_saved'));
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function gistInit() {
  const token = localStorage.getItem(GIST_TOKEN_KEY) || '';
  const el    = document.getElementById('gist-token-input');
  if (el && token) el.value = token;
  _gistUpdateStatus();
}

function _gistUpdateStatus() {
  const gistId = localStorage.getItem(GIST_ID_KEY) || '';
  if (gistId) _gistSetStatus('info', `Gist: ${gistId.slice(0, 8)}…`);
  else        _gistSetStatus('info', '');
}

function _gistSetStatus(type, msg) {
  const el = document.getElementById('gist-status');
  if (!el) return;
  el.className   = 'gist-status gist-status-' + type;
  el.textContent = msg;
  if (type === 'loading' || type === 'pending') return;
  clearTimeout(el._t);
  if (type !== 'info') el._t = setTimeout(_gistUpdateStatus, 5000);
}

function _gt(key) {
  try { return (TRANSLATIONS[currentLang || 'pt'] || {})[key] || key; } catch { return key; }
}

document.addEventListener('DOMContentLoaded', gistInit);
