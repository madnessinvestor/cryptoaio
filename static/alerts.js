// ─── Price Alerts ──────────────────────────────────────────────────────────────

let alertsData = [];
const ALERT_INTERVAL = 30000;
let _selectedRepeat = 0;

// ─── Repeat chip selector ─────────────────────────────────────────────────────
function selectRepeat(btn) {
  document.querySelectorAll(".alert-repeat-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  _selectedRepeat = parseInt(btn.dataset.val, 10) || 0;
}

// ─── Audio unlock (browsers block AudioContext until first user gesture) ───────
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  if (_audioCtx && _audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}
// Unlock on first user gesture so the sound works immediately when alert fires
["click","touchstart","keydown"].forEach(ev =>
  document.addEventListener(ev, () => _getAudioCtx(), { once: false, passive: true })
);

// ─── Init ─────────────────────────────────────────────────────────────────────

async function initAlerts() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/static/sw.js").catch(() => {});
  }
  await loadAlerts();
  renderSoundGrid();
  setInterval(checkAlerts, ALERT_INTERVAL);
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadAlerts() {
  try {
    const r = await fetch("/api/alerts");
    alertsData = await r.json();
  } catch(e) {
    alertsData = [];
  }
  renderAlertsList();
  updateBellBadge();
  if (typeof renderDetailAlerts === "function") renderDetailAlerts();
  if (typeof updateCardAlertBadges === "function") updateCardAlertBadges();
}

// ─── Submit new alert ─────────────────────────────────────────────────────────

async function submitAlert() {
  const ticker  = document.getElementById("alert-ticker").value.trim().toUpperCase();
  const target  = parseFloat(document.getElementById("alert-target").value);
  const dir     = document.getElementById("alert-direction").value;
  const errEl   = document.getElementById("alert-error");

  errEl.classList.add("hidden");
  if (!ticker)                { errEl.textContent = t("alert_err_ticker"); errEl.classList.remove("hidden"); return; }
  if (!target || target <= 0) { errEl.textContent = t("alert_err_price");  errEl.classList.remove("hidden"); return; }

  await fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, target, direction: dir, repeat_interval: _selectedRepeat })
  });

  document.getElementById("alert-ticker").value = "";
  document.getElementById("alert-target").value = "";
  // Reset repeat chip to "1x"
  document.querySelectorAll(".alert-repeat-chip").forEach(c => c.classList.remove("active"));
  const firstChip = document.querySelector(".alert-repeat-chip");
  if (firstChip) firstChip.classList.add("active");
  _selectedRepeat = 0;

  await loadAlerts();

  // Ask permission non-blocking — show soft warning if denied
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(r => {
      if (r === "denied") {
        errEl.textContent = t("alert_err_perm");
        errEl.classList.remove("hidden");
      }
    });
  }
}

// ─── Delete / Reset ───────────────────────────────────────────────────────────

async function deleteAlertById(id) {
  await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  await loadAlerts();
}

async function resetAlertById(id) {
  await fetch(`/api/alerts/${id}/reset`, { method: "POST" });
  await loadAlerts();
}

// ─── Notification permission ──────────────────────────────────────────────────

async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

// ─── Check alerts (runs every 30 s) ──────────────────────────────────────────

function _alertIsReadyToCheck(a) {
  // One-time alerts already triggered: skip
  if (a.triggered) return false;
  const interval = a.repeat_interval || 0;
  // Never fired yet: always check
  if (!a.last_fired_at) return true;
  // Repeating: only check after enough time has passed since last fire
  const nowSec = Date.now() / 1000;
  return nowSec - a.last_fired_at >= interval;
}

async function checkAlerts() {
  const toCheck = alertsData.filter(_alertIsReadyToCheck);
  if (!toCheck.length) return;

  let priceMap = {};
  try {
    const r = await fetch("/api/assets");
    const assets = await r.json();
    for (const a of assets) {
      if (a.price != null) priceMap[a.symbol.toUpperCase()] = a.price;
    }
  } catch(e) { return; }

  for (const alert of toCheck) {
    const price = priceMap[alert.ticker.toUpperCase()];
    if (price == null) continue;
    const fired = alert.direction === "above" ? price >= alert.target : price <= alert.target;
    if (fired) await fireAlert(alert, price);
  }
}

// ─── Alert sound system ───────────────────────────────────────────────────────

const ALERT_SOUNDS = [
  { id: 'classic',  labelKey: 'snd_classic',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>` },
  { id: 'ping',     labelKey: 'snd_ping',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4"/><path d="M17.7 6.3a8 8 0 0 1 0 11.4"/></svg>` },
  { id: 'duplo',    labelKey: 'snd_duplo',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>` },
  { id: 'triple',   labelKey: 'snd_triple',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="17" y="9" width="4" height="6" rx="1"/></svg>` },
  { id: 'sino',     labelKey: 'snd_sino',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>` },
  { id: 'laser',    labelKey: 'snd_laser',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
  { id: 'game',     labelKey: 'snd_game',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
  { id: 'piano',    labelKey: 'snd_piano',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="7" y1="5" x2="7" y2="14"/><line x1="12" y1="5" x2="12" y2="14"/><line x1="17" y1="5" x2="17" y2="14"/></svg>` },
  { id: 'foguete',  labelKey: 'snd_foguete',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>` },
  { id: 'alarme',   labelKey: 'snd_alarme',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
  { id: 'pulso',    labelKey: 'snd_pulso',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
  { id: 'bolha',    labelKey: 'snd_bolha',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="19.5" cy="8.5" r="1.5"/><circle cx="19.5" cy="15.5" r="1.5"/><circle cx="12" cy="20.5" r="1.5"/><circle cx="4.5" cy="15.5" r="1.5"/><circle cx="4.5" cy="8.5" r="1.5"/></svg>` },
  { id: 'electro',  labelKey: 'snd_electro',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>` },
  { id: 'cristal',  labelKey: 'snd_cristal',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>` },
  { id: 'grave',    labelKey: 'snd_grave',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/><path d="M5 19 2 22"/><path d="m19 19 3 3"/></svg>` },
  { id: 'agudo',    labelKey: 'snd_agudo',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 3 4 4-4 4"/><path d="M9 7H3"/><path d="m19 21-4-4 4-4"/><path d="M15 17h6"/><path d="M12 3v18"/></svg>` },
  { id: 'fanfarra', labelKey: 'snd_fanfarra',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"/><path d="M9 17V4l12-1v13"/><path d="M15 16a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"/></svg>` },
  { id: 'digital',  labelKey: 'snd_digital',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 7h.01"/><path d="M11 7h2"/><path d="M7 11h4"/><path d="M13 11h.01"/></svg>` },
  { id: 'radar',    labelKey: 'snd_radar',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>` },
  { id: 'mute',     labelKey: 'snd_mute',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>` },
  { id: 'custom',   labelKey: 'snd_custom', isCustom: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>` },
];

let _selectedSoundId = localStorage.getItem('alertSoundId') || 'classic';

// ─── Sound grid rendering & selection ─────────────────────────────────────────

function renderSoundGrid() {
  const grid = document.getElementById('alert-sound-grid');
  if (!grid) return;
  const hasCustom = !!localStorage.getItem('alertSoundCustom');
  grid.innerHTML = ALERT_SOUNDS.map(s => {
    const isActive = _selectedSoundId === s.id;
    const dot = (s.isCustom && hasCustom)
      ? '<span class="alert-sound-custom-dot"></span>' : '';
    return `<div class="alert-sound-item${isActive ? ' active' : ''}"
      onclick="selectAlertSound('${s.id}')" title="${t(s.labelKey)}">
      <div class="alert-sound-icon">${s.icon}</div>
      <span class="alert-sound-label">${t(s.labelKey)}</span>${dot}
    </div>`;
  }).join('');
}

function selectAlertSound(id) {
  const sound = ALERT_SOUNDS.find(s => s.id === id);
  if (!sound) return;
  if (sound.isCustom) {
    if (localStorage.getItem('alertSoundCustom')) {
      _selectedSoundId = 'custom';
      localStorage.setItem('alertSoundId', 'custom');
      renderSoundGrid();
      _playCustomSound();
    } else {
      _openCustomSoundPicker();
    }
    return;
  }
  _selectedSoundId = id;
  localStorage.setItem('alertSoundId', id);
  renderSoundGrid();
  if (id !== 'mute') playAlertSound();
}

function _openCustomSoundPicker() {
  let inp = document.getElementById('_asf-input');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = '_asf-input';
    inp.accept = 'audio/*'; inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', _alertLoadCustomSound);
  }
  inp.click();
}

function _alertLoadCustomSound(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    localStorage.setItem('alertSoundCustom', e.target.result);
    _selectedSoundId = 'custom';
    localStorage.setItem('alertSoundId', 'custom');
    renderSoundGrid();
    _playCustomSound();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function _playCustomSound() {
  const data = localStorage.getItem('alertSoundCustom');
  if (!data) return;
  try { const a = new Audio(data); a.volume = 0.7; a.play().catch(() => {}); } catch(e) {}
}

// ─── Synthesized sounds ───────────────────────────────────────────────────────

function _snd_classic(ctx) {
  [880, 1108, 1318, 1760].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.start(t); o.stop(t + 0.22);
  });
}
function _snd_ping(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 1200;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.start(t); o.stop(t + 0.55);
}
function _snd_duplo(ctx) {
  [0, 0.2].forEach(d => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 960;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.38, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.start(t); o.stop(t + 0.16);
  });
}
function _snd_triple(ctx) {
  [0, 0.17, 0.34].forEach(d => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 1000;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13); o.start(t); o.stop(t + 0.13);
  });
}
function _snd_sino(ctx) {
  [[523, 0.48], [1046, 0.24], [1568, 0.12], [2092, 0.06]].forEach(([freq, vol]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
    o.start(t); o.stop(t + 1.7);
  });
}
function _snd_laser(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.35);
  g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.start(t); o.stop(t + 0.35);
}
function _snd_game(ctx) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'square'; o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.07;
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.start(t); o.stop(t + 0.09);
  });
}
function _snd_piano(ctx) {
  [261, 329, 392].forEach(freq => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'triangle'; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    o.start(t); o.stop(t + 0.95);
  });
}
function _snd_foguete(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1800, t + 0.42);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.33, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42); o.start(t); o.stop(t + 0.42);
}
function _snd_alarme(ctx) {
  [0, 0.18, 0.36, 0.54].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'square';
    o.frequency.value = i % 2 === 0 ? 880 : 1109;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.start(t); o.stop(t + 0.16);
  });
}
function _snd_pulso(ctx) {
  [0, 0.28, 0.56, 0.84].forEach(d => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 440;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.start(t); o.stop(t + 0.22);
  });
}
function _snd_bolha(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.18);
  g.gain.setValueAtTime(0.38, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.start(t); o.stop(t + 0.18);
}
function _snd_electro(ctx) {
  [[440, 'sawtooth', 0, 0.28], [660, 'sawtooth', 0.17, 0.22]].forEach(([freq, type, d, vol]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.start(t); o.stop(t + 0.12);
  });
}
function _snd_cristal(ctx) {
  [[2093, 0.28, 0.85], [4186, 0.1, 0.5]].forEach(([freq, vol, dur]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur);
  });
}
function _snd_grave(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 75;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.65, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.65); o.start(t); o.stop(t + 0.65);
}
function _snd_agudo(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 2640;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.24, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.start(t); o.stop(t + 0.28);
}
function _snd_fanfarra(ctx) {
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'triangle'; o.frequency.value = freq;
    const t = ctx.currentTime + i * 0.09;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.start(t); o.stop(t + 0.22);
  });
}
function _snd_digital(ctx) {
  [0, 0.1, 0.2, 0.3].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'square';
    o.frequency.value = i % 2 === 0 ? 880 : 440;
    const t = ctx.currentTime + d;
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.start(t); o.stop(t + 0.08);
  });
}
function _snd_radar(ctx) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = 'sine';
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(820, t); o.frequency.linearRampToValueAtTime(755, t + 0.85);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.38, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.85); o.start(t); o.stop(t + 0.85);
}

const _SOUND_FNS = {
  classic: _snd_classic, ping: _snd_ping, duplo: _snd_duplo, triple: _snd_triple,
  sino: _snd_sino, laser: _snd_laser, game: _snd_game, piano: _snd_piano,
  foguete: _snd_foguete, alarme: _snd_alarme, pulso: _snd_pulso, bolha: _snd_bolha,
  electro: _snd_electro, cristal: _snd_cristal, grave: _snd_grave, agudo: _snd_agudo,
  fanfarra: _snd_fanfarra, digital: _snd_digital, radar: _snd_radar,
};

function playAlertSound() {
  if (_selectedSoundId === 'mute') return;
  if (_selectedSoundId === 'custom') { _playCustomSound(); return; }
  try {
    const ctx = _getAudioCtx();
    if (!ctx) return;
    const fn = _SOUND_FNS[_selectedSoundId];
    if (fn) fn(ctx);
  } catch(e) {}
}

// ─── In-app toast ─────────────────────────────────────────────────────────────

function showAlertToast(ticker, price, target, direction) {
  const arrow    = direction === "above" ? "🔺" : "🔻";
  const dirLabel = direction === "above" ? "subiu acima de" : "caiu abaixo de";

  const toast = document.createElement("div");
  toast.className = "alert-toast alert-toast-enter";
  toast.innerHTML = `
    <div class="alert-toast-icon">${arrow}</div>
    <div class="alert-toast-body">
      <div class="alert-toast-title">${ticker} ${dirLabel} ${formatUSD(target, true)}</div>
      <div class="alert-toast-sub">Preço atual: <strong>${formatUSD(price, true)}</strong></div>
    </div>
    <button class="alert-toast-close" onclick="this.closest('.alert-toast').remove()">✕</button>
  `;

  let container = document.getElementById("alert-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "alert-toast-container";
    document.body.appendChild(container);
  }
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("alert-toast-visible"));
  });

  // Auto-dismiss after 8 s
  setTimeout(() => {
    toast.classList.remove("alert-toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 8000);
}

// ─── System notification (desktop + Android PWA) ──────────────────────────────

async function _sendSystemNotification(title, body, tag) {
  // 1. Try via Service Worker (works on Android PWA + desktop)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (Notification.permission === "granted") {
        await reg.showNotification(title, {
          body,
          icon:     "/static/icons/icon-192.png",
          badge:    "/static/icons/icon-72.png",
          vibrate:  [200, 100, 200, 100, 200],
          tag,
          renotify: true,
          requireInteraction: false,
        });
        return;
      }
    } catch (e) {}
  }
  // 2. Fallback: direct Notification API (desktop browsers without SW)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/static/icons/icon-192.png",
        tag,
      });
    } catch (e) {}
  }
}

// ─── Fire alert ───────────────────────────────────────────────────────────────

async function fireAlert(alert, price) {
  await fetch(`/api/alerts/${alert.id}/trigger`, { method: "POST" });
  // One-time alerts become triggered; repeating alerts update last_fired_at locally
  if ((alert.repeat_interval || 0) === 0) {
    alert.triggered = true;
  } else {
    alert.last_fired_at = Date.now() / 1000;
  }
  renderAlertsList();
  updateBellBadge();
  playAlertSound();

  // Always show in-app toast (works in any context)
  showAlertToast(alert.ticker, price, alert.target, alert.direction);

  // Also send system notification (desktop / Android PWA)
  const arrow = alert.direction === "above" ? "🔺" : "🔻";
  const title = `CryptoAIO ${arrow} ${alert.ticker}`;
  const body  = `${alert.ticker} atingiu ${formatUSD(price, true)} — Alvo: ${formatUSD(alert.target, true)}`;
  await _sendSystemNotification(title, body, `alert-${alert.id}`);
}

// ─── Bell badge ───────────────────────────────────────────────────────────────

function updateBellBadge() {
  const badge = document.getElementById("alert-badge");
  if (!badge) return;
  const active = alertsData.filter(a => !a.triggered).length;
  if (active > 0) {
    badge.textContent = active;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// ─── Render list ──────────────────────────────────────────────────────────────

function _repeatLabel(interval) {
  if (!interval) return "";
  if (interval === 60)   return "↻ 1 min";
  if (interval === 300)  return "↻ 5 min";
  if (interval === 900)  return "↻ 15 min";
  if (interval === 1800) return "↻ 30 min";
  if (interval === 3600) return "↻ 60 min";
  return `↻ ${interval}s`;
}

function _nextFireLabel(a) {
  const interval = a.repeat_interval || 0;
  if (!interval || !a.last_fired_at) return "";
  const nextAt = a.last_fired_at + interval;
  const diffSec = Math.max(0, Math.round(nextAt - Date.now() / 1000));
  if (diffSec <= 0) return "";
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return m > 0 ? `próx. em ${m}m${s > 0 ? s + "s" : ""}` : `próx. em ${s}s`;
}

function renderAlertsList() {
  const el = document.getElementById("alerts-list");
  if (!el) return;

  if (!alertsData.length) {
    el.innerHTML = `<p class="alert-empty">${t("alert_empty")}</p>`;
    return;
  }

  el.innerHTML = alertsData.map(a => {
    const arrow     = a.direction === "above" ? "↑" : "↓";
    const dirLabel  = a.direction === "above" ? t("alert_above") : t("alert_below");
    const isRepeat  = (a.repeat_interval || 0) > 0;
    const cls       = a.triggered ? "alert-item triggered" : "alert-item active";
    const statusTxt = a.triggered ? t("alert_triggered") : t("alert_active_label");
    const repeatBadge = isRepeat
      ? `<span class="alert-repeat-badge">${_repeatLabel(a.repeat_interval)}</span>` : "";
    const nextLabel = isRepeat && !a.triggered ? _nextFireLabel(a) : "";
    const nextBadge = nextLabel
      ? `<span class="alert-next-label">${nextLabel}</span>` : "";

    return `<div class="${cls}">
      <div class="alert-item-info">
        <div class="alert-item-top">
          <span class="alert-item-ticker">${a.ticker}</span>
          ${repeatBadge}
        </div>
        <span class="alert-item-desc">${dirLabel} ${formatUSD(a.target, true)} ${arrow}</span>
        ${nextBadge}
      </div>
      <div class="alert-item-actions">
        <span class="alert-item-status">${statusTxt}</span>
        ${a.triggered
          ? `<button class="alert-btn reset" onclick="resetAlertById('${a.id}')" title="${t('alert_reset')}">↺</button>`
          : ""}
        <button class="alert-btn del" onclick="deleteAlertById('${a.id}')" title="${t('alert_delete')}">✕</button>
      </div>
    </div>`;
  }).join("");
}

// ─── Modal open / close ───────────────────────────────────────────────────────

function openAlertsModal() {
  loadAlerts();
  document.getElementById("alert-error").classList.add("hidden");

  // Populate ticker datalist from tracked assets
  if (typeof cachedAssets !== "undefined") {
    const dl = document.getElementById("alert-tickers-list");
    if (dl) {
      dl.innerHTML = cachedAssets.map(a => `<option value="${a.symbol}">`).join("");
    }
  }

  document.getElementById("alerts-modal").classList.remove("hidden");
}

function closeAlertsModal() {
  document.getElementById("alerts-modal").classList.add("hidden");
}

// ─── Kick off on load ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", initAlerts);
