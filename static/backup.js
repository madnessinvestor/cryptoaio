// ─── Export / Import Data ──────────────────────────────────────────────────────
// Handles full app backup: server-side JSON files + client localStorage keys.

async function exportAppData() {
  _backupSetStatus('loading', _bgt('bkp_exporting'));
  try {
    // Fetch server-side data bundle
    const r = await fetch('/api/data/export');
    if (!r.ok) throw new Error('export failed');
    const data = await r.json();

    // Attach client-side preferences & AI keys
    data.client = {
      madai_keys:     _bkpParseJSON(localStorage.getItem('madai_keys'),     {}),
      madai_active:   localStorage.getItem('madai_active')   || '',
      theme:          localStorage.getItem('theme')          || 'dark',
      currency:       localStorage.getItem('currency')       || 'USD',
      language:       localStorage.getItem('lang')           || 'pt',
      trackerColumns: parseInt(localStorage.getItem('trackerColumns') || '1'),
    };

    // Trigger browser download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `cryptoaio_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    _backupSetStatus('ok', _bgt('bkp_export_ok'));
  } catch (e) {
    console.error('[backup] export error', e);
    _backupSetStatus('error', _bgt('bkp_err_export'));
  }
}

function importAppDataPick() {
  document.getElementById('backup-import-input').click();
}

async function importAppData(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // allow re-picking the same file

  _backupSetStatus('loading', _bgt('bkp_reading'));
  try {
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch {
      _backupSetStatus('error', _bgt('bkp_err_invalid'));
      return;
    }

    if (data._app !== 'CryptoAIO') {
      _backupSetStatus('error', _bgt('bkp_err_invalid'));
      return;
    }

    if (!confirm(_bgt('bkp_confirm_import'))) {
      _backupSetStatus('', '');
      return;
    }

    _backupSetStatus('loading', _bgt('bkp_importing'));

    // Restore server-side data
    const r = await fetch('/api/data/import', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const result = await r.json();
    if (!result.ok) {
      _backupSetStatus('error', result.error || _bgt('bkp_err_import'));
      return;
    }

    // Restore client-side localStorage
    const c = data.client || {};
    if (c.madai_keys && typeof c.madai_keys === 'object')
      localStorage.setItem('madai_keys',     JSON.stringify(c.madai_keys));
    if (c.madai_active !== undefined && c.madai_active !== null)
      localStorage.setItem('madai_active',   String(c.madai_active));
    if (c.theme)
      localStorage.setItem('theme',          c.theme);
    if (c.currency)
      localStorage.setItem('currency',       c.currency);
    if (c.language)
      localStorage.setItem('lang',           c.language);
    if (c.trackerColumns)
      localStorage.setItem('trackerColumns', String(c.trackerColumns));

    _backupSetStatus('ok', _bgt('bkp_import_ok'));
    setTimeout(() => location.reload(), 1400);

  } catch (e) {
    console.error('[backup] import error', e);
    _backupSetStatus('error', _bgt('bkp_err_import'));
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _backupSetStatus(type, msg) {
  const el = document.getElementById('backup-status');
  if (!el) return;
  if (!msg) { el.textContent = ''; el.className = 'gist-status'; return; }
  el.className   = 'gist-status' + (type === 'ok' ? ' gist-status-ok' : type === 'error' ? ' gist-status-error' : '');
  el.textContent = msg;
}

function _bkpParseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

function _bgt(key) {
  try { return (TRANSLATIONS[currentLang || 'pt'] || {})[key] || key; } catch { return key; }
}
