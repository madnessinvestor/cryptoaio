// ─── GitHub Gist Sync ─────────────────────────────────────────────────────────

const GIST_TOKEN_KEY = 'cryptoaio_gist_token';
const GIST_ID_KEY    = 'cryptoaio_gist_id';

// Remove all whitespace from a stored token (handles paste-with-newline issues)
function _gistCleanToken(raw) { return (raw || '').replace(/\s+/g, ''); }

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
  const token  = _gistCleanToken(localStorage.getItem(GIST_TOKEN_KEY));
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
      _gistUpdateBadge();
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
  const token  = _gistCleanToken(localStorage.getItem(GIST_TOKEN_KEY));
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
      _gistUpdateBadge();
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
  const token  = _gistCleanToken(localStorage.getItem(GIST_TOKEN_KEY));
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
  const token = (document.getElementById('gist-token-input')?.value || '').replace(/\s+/g, '');
  if (!token) { _gistSetStatus('error', _gt('set_gist_err_no_token')); return; }
  localStorage.setItem(GIST_TOKEN_KEY, token);
  const inp = document.getElementById('gist-token-input');
  if (inp) inp.value = '';
  _gistRenderSaved();
  _gistSetStatus('ok', _gt('set_gist_token_saved'));
}

// ── Token delete ──────────────────────────────────────────────────────────────
function gistDeleteToken() {
  localStorage.removeItem(GIST_TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
  clearTimeout(_gistSyncTimer);
  _gistRenderSaved();
  _gistSetStatus('info', '');
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function gistInit() {
  _gistRenderSaved();
  _gistUpdateStatus();
}

// Renders the saved-token card (or clears it) and toggles the add form / data section
function _gistRenderSaved() {
  const token   = _gistCleanToken(localStorage.getItem(GIST_TOKEN_KEY));
  const gistId  = localStorage.getItem(GIST_ID_KEY)    || '';
  const wrap    = document.getElementById('gist-saved-token');
  const addForm = document.getElementById('gist-add-form');
  const dataSection = document.getElementById('gist-data-section');

  if (!wrap) return;

  if (token) {
    const masked  = token.slice(0, 6) + '••••••••••••••••';
    const gistLbl = gistId ? `Gist: ${gistId.slice(0, 8)}…` : 'Nenhum backup ainda';
    wrap.innerHTML = `
      <div class="ai-key-item active">
        <div class="ai-key-item-info">
          <span class="ai-key-item-prov">GitHub</span>
          <span class="ai-key-item-key">${masked}</span>
          <span class="ai-key-item-model">${gistLbl}</span>
        </div>
        <div class="ai-key-item-actions">
          <span class="ai-key-active-badge">Ativo</span>
          <button class="ai-key-delete-btn" onclick="gistDeleteToken()" title="Remover token">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>`;
    if (addForm)     addForm.style.display     = 'none';
    if (dataSection) dataSection.style.display = '';
  } else {
    wrap.innerHTML = '';
    if (addForm)     addForm.style.display     = '';
    if (dataSection) dataSection.style.display = 'none';
  }

  _gistUpdateBadge();
}

function _gistUpdateBadge() {
  const badge  = document.getElementById('gist-cfg-badge');
  if (!badge) return;
  const token  = localStorage.getItem(GIST_TOKEN_KEY) || '';
  const gistId = localStorage.getItem(GIST_ID_KEY)    || '';
  if (token && gistId) {
    badge.textContent = `Gist ${gistId.slice(0, 6)}…`;
    badge.className   = 'ai-cfg-badge';
  } else if (token) {
    badge.textContent = 'Token salvo';
    badge.className   = 'ai-cfg-badge';
  } else {
    badge.textContent = 'Sem token';
    badge.className   = 'ai-cfg-badge ai-cfg-badge-none';
  }
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
