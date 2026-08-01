// ─── Widget Settings Tab ───────────────────────────────────────────────────────
// Manages the Widget tab in the main SPA.
// All settings share localStorage keys (w_*) with /widget and /widget/settings.

const WT_DEFAULTS = {
  // Web /widget display settings
  ccy:          "USD",   // USD | BRL | EUR
  chg:          "pct",   // pct | val | both
  cols:         "2",     // 1 | 2
  rows:         "1",     // 1 | 2  (lines per asset)
  fontSize:     "md",    // sm | md | lg
  bold:         false,
  showCcy:      true,
  showHeader:   true,
  autoSort:     false,
  showRefresh:  false,
  showControls: true,
  showTrades:   false,   // show trade positions below watchlist
  showAlerts:   false,   // show price alerts below watchlist
  // Android / home-screen widget settings
  size:         "sm",    // sm | md | lg
  theme:        "dark",  // dark | light | purple-dark | auto | custom
  customBg:     "#0f0f14", // hex used when theme=custom
  bgOpacity:    "100",   // 0–100
  refresh:      "15",    // minutes
  showChg:      true,
  showIcon:     true,
  assets:       ""       // comma-separated selected symbols
};

function wtLoad() {
  const c = {};
  for (const [k, def] of Object.entries(WT_DEFAULTS)) {
    const raw = localStorage.getItem("w_" + k);
    if (raw === null) c[k] = def;
    else if (typeof def === "boolean") c[k] = raw === "1";
    else c[k] = raw;
  }
  return c;
}

function wtSave(cfg) {
  for (const [k, v] of Object.entries(cfg)) {
    localStorage.setItem("w_" + k, typeof v === "boolean" ? (v ? "1" : "0") : v);
  }
  // Persist to server so CryptoAIO.exe and CryptoAIOWidget.exe share the same settings
  fetch("/api/widget/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cfg)
  }).catch(() => {});
}

let wtCfg = Object.assign({}, WT_DEFAULTS);

// Called by pill buttons
function wSet(key, val) {
  wtCfg[key] = val;
  wtSave(wtCfg);
  wtApplyUI();
  wltRender();
  if (key === "refresh") wltScheduleRefresh();
}

// Called by toggle switches
function wToggle(key) {
  wtCfg[key] = !wtCfg[key];
  wtSave(wtCfg);
  wtApplyUI();
  wltRender();
}

// Toggle all assets on/off (ALL chip)
function wToggleAllAssets() {
  const allMode = !wtCfg.assets;
  if (allMode) {
    // Currently ALL → deselect everything
    const allSyms = [...document.querySelectorAll(".wgt-asset-chip[data-sym]")]
      .map(c => c.dataset.sym);
    // Store all syms but mark none active by using a sentinel that matches nothing
    wtCfg.assets = allSyms.length ? "__none__" : "";
  } else {
    // Not ALL → activate all
    wtCfg.assets = "";
  }
  wtSave(wtCfg);
  _wRefreshChips();
  wltRender();
}

// Toggle an individual asset chip on/off
function wToggleAsset(sym) {
  const allMode = !wtCfg.assets;
  const allSyms = [...document.querySelectorAll(".wgt-asset-chip[data-sym]")]
    .map(c => c.dataset.sym);

  let selected;
  if (allMode) {
    // Exit ALL mode: keep everything except this one
    selected = allSyms.filter(s => s !== sym);
  } else {
    // Filter out sentinel before working with the list
    selected = wtCfg.assets.split(",").filter(s => s && s !== "__none__");
    const idx = selected.indexOf(sym);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(sym);
    // If user re-selected everything manually, snap back to ALL mode
    if (selected.length >= allSyms.length) selected = [];
  }
  wtCfg.assets = selected.join(",");
  wtSave(wtCfg);
  _wRefreshChips();
  wltRender();
}

// Refresh chip active states without rebuilding DOM
function _wRefreshChips() {
  const allMode  = !wtCfg.assets;
  const selected = allMode ? [] : wtCfg.assets.split(",").filter(Boolean);
  const allChip  = document.querySelector(".wgt-asset-chip-all");
  if (allChip) allChip.classList.toggle("active", allMode);
  document.querySelectorAll(".wgt-asset-chip[data-sym]").forEach(chip => {
    chip.classList.toggle("active", allMode || selected.includes(chip.dataset.sym));
  });
}

// Save button feedback
function wSaveConfig() {
  wtSave(wtCfg);
  const btn = document.querySelector(".wgt-save-btn");
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = "Saved ✓";
  btn.style.opacity = "0.8";
  setTimeout(() => { btn.textContent = orig; btn.style.opacity = ""; }, 1500);
}

// ── Sync UI controls to current config ────────────────────────────────────────
function wtApplyUI() {
  // Inline pill groups (wgt-card-row-pills) — new settings
  [
    ["wt-ccy",      "ccy"],
    ["wt-chg",      "chg"],
    ["wt-cols",     "cols"],
    ["wt-rows",     "rows"],
    ["wt-fontSize", "fontSize"],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.v === String(wtCfg[key]))
    );
  });

  // Standalone pill groups (wgt-pills-group) — legacy settings
  [
    ["wt-size",    "size"],
    ["wt-theme",   "theme"],
    ["wt-refresh", "refresh"],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelectorAll(".wgt-pill").forEach(b =>
      b.classList.toggle("active", b.dataset.v === String(wtCfg[key]))
    );
  });

  // Opacity slider
  const opSlider = document.getElementById("wt-bgOpacity");
  if (opSlider) {
    opSlider.value = wtCfg.bgOpacity ?? "100";
    const opVal = document.getElementById("wt-opacity-val");
    if (opVal) opVal.textContent = opSlider.value + "%";
  }

  // Apply theme + opacity to the live preview box
  const liveBox = document.querySelector(".wgt-live-box");
  if (liveBox) {
    let resolved = wtCfg.theme;
    if (resolved === "auto") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    const isLight    = resolved === "light";
    const isPurple   = resolved === "purple-dark";
    const isCustom   = wtCfg.theme === "custom";
    const alpha = (Math.max(0, Math.min(100, parseInt(wtCfg.bgOpacity ?? "100"))) / 100).toFixed(2);

    liveBox.classList.toggle("wgt-live-light",  isLight);
    liveBox.classList.toggle("wgt-live-purple", isPurple);

    if (isCustom) {
      const hex = wtCfg.customBg || "#0f0f14";
      const rgb = _cpHexToRgb(hex);
      liveBox.style.background = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : `rgba(15,15,20,${alpha})`;
    } else if (isLight) {
      liveBox.style.background = `rgba(244,244,248,${alpha})`;
    } else if (isPurple) {
      liveBox.style.background = `rgba(26,10,46,${alpha})`;
    } else {
      liveBox.style.background = `rgba(15,15,20,${alpha})`;
    }
  }

  // Show/hide custom color picker panel
  const pickerPanel = document.getElementById("wgt-color-picker-panel");
  if (pickerPanel) {
    const show = wtCfg.theme === "custom";
    pickerPanel.style.display = show ? "flex" : "none";
    if (show) _cpInit();
  }

  // Toggle checkboxes
  [
    ["wt-bold",         "bold"],
    ["wt-showCcy",      "showCcy"],
    ["wt-showChg",      "showChg"],
    ["wt-showIcon",     "showIcon"],
    ["wt-showHeader",   "showHeader"],
    ["wt-autoSort",     "autoSort"],
    ["wt-showRefresh",  "showRefresh"],
    ["wt-showControls", "showControls"],
    ["wt-showTrades",   "showTrades"],
    ["wt-showAlerts",   "showAlerts"],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!wtCfg[key];
  });

  // Asset chips — delegate to _wRefreshChips() so ALL mode is handled correctly
  _wRefreshChips();
}

// ── Live preview (wpc card) ────────────────────────────────────────────────────
const WT_RATES = { USD: 1, BRL: 5.70, EUR: 0.92 };
const WT_SYM   = { USD: "$", BRL: "R$", EUR: "€" };

function _wFmtP(usd) {
  const p   = usd * (WT_RATES[wtCfg.ccy] || 1);
  const sym = wtCfg.showCcy ? WT_SYM[wtCfg.ccy] : "";
  if (p >= 10000) return sym + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)     return sym + p.toFixed(2);
  return sym + p.toFixed(4);
}

function _wFmtC(usd, pct) {
  if (wtCfg.chg === "pct") {
    const s = pct >= 0 ? "+" : "";
    return { text: s + pct.toFixed(2) + "%", up: pct >= 0 };
  } else {
    const prev = usd / (1 + pct / 100);
    const abs  = (usd - prev) * (WT_RATES[wtCfg.ccy] || 1);
    const sym  = wtCfg.showCcy ? WT_SYM[wtCfg.ccy] : "";
    return { text: (abs >= 0 ? "+" : "-") + sym + Math.abs(abs).toFixed(2), up: abs >= 0 };
  }
}

function wtUpdatePreview() {
  const card = document.getElementById("widget-preview-card");
  if (!card) return;

  // Theme
  card.classList.toggle("wpc-light", wtCfg.theme === "light");

  // Clock
  const timeEl = document.getElementById("wpc-time");
  if (timeEl) {
    const now = new Date();
    timeEl.textContent =
      now.getHours().toString().padStart(2, "0") + ":" +
      now.getMinutes().toString().padStart(2, "0");
    timeEl.style.display = wtCfg.showHeader ? "" : "none";
  }

  // Font size & weight on rows
  const fs = { sm: "10.5px", md: "12px", lg: "14px" }[wtCfg.fontSize] || "12px";
  const fw = wtCfg.bold ? "700" : "400";
  document.querySelectorAll(".wpc-row .wpc-price, .wpc-row .wpc-chg").forEach(el => {
    el.style.fontWeight = fw;
  });
  document.querySelectorAll(".wpc-row").forEach(r => r.style.fontSize = fs);

  // Prices
  const p1El = document.getElementById("wpv-p1");
  const c1El = document.getElementById("wpv-c1");
  const p2El = document.getElementById("wpv-p2");
  const c2El = document.getElementById("wpv-c2");

  if (p1El) p1El.textContent = _wFmtP(64000);
  if (p2El) p2El.textContent = _wFmtP(3200);

  if (c1El) {
    const { text, up } = _wFmtC(64000, 1.8);
    c1El.textContent = text;
    c1El.className   = "wpc-chg " + (up ? "wpc-up" : "wpc-dn");
    c1El.style.display = wtCfg.showChg ? "" : "none";
  }
  if (c2El) {
    const { text, up } = _wFmtC(3200, -0.5);
    c2El.textContent = text;
    c2El.className   = "wpc-chg " + (up ? "wpc-up" : "wpc-dn");
    c2El.style.display = wtCfg.showChg ? "" : "none";
  }
}

// ── Sanitise a symbol ─────────────────────────────────────────────────────────
const WT_SYM_RE = /[^A-Z0-9._\-]/g;
function wtSanitiseSym(raw) {
  return String(raw).toUpperCase().replace(WT_SYM_RE, "").slice(0, 20);
}

// ── Load watchlist assets as selectable chips ─────────────────────────────────
function wLoadAssets() {
  const container = document.getElementById("wgt-asset-chips");
  if (!container) return;

  fetch("/api/assets")
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(data => {
      const assets   = Array.isArray(data) ? data : (data.assets || []);
      const allMode  = !wtCfg.assets;
      const selected = allMode ? [] : wtCfg.assets.split(",").filter(Boolean);

      while (container.firstChild) container.removeChild(container.firstChild);

      if (!assets.length) {
        const msg = document.createElement("span");
        msg.className   = "wgt-asset-empty";
        msg.textContent = t("wgt_no_assets");
        container.appendChild(msg);
        return;
      }

      // ALL chip
      const allBtn = document.createElement("button");
      allBtn.className  = "wgt-asset-chip wgt-asset-chip-all" + (allMode ? " active" : "");
      allBtn.textContent = t("wgt_all_assets");
      allBtn.addEventListener("click", wToggleAllAssets);
      container.appendChild(allBtn);

      assets.forEach(a => {
        const sym = wtSanitiseSym(a.symbol || a.ticker || a.id || String(a));
        if (!sym) return;
        const btn = document.createElement("button");
        btn.className   = "wgt-asset-chip" + (allMode || selected.includes(sym) ? " active" : "");
        btn.dataset.sym = sym;
        btn.textContent = sym;
        btn.addEventListener("click", () => wToggleAsset(sym));
        container.appendChild(btn);
      });
    })
    .catch(() => {
      while (container.firstChild) container.removeChild(container.firstChild);
      const msg = document.createElement("span");
      msg.className   = "wgt-asset-empty";
      msg.textContent = "Could not load assets";
      container.appendChild(msg);
    });
}

// ── Custom Color Picker ───────────────────────────────────────────────────────
// HSB color picker: SB canvas + hue slider
let _cpH = 220, _cpS = 0.7, _cpB = 0.15; // current hue/sat/bri
let _cpDraggingSB = false, _cpDraggingHue = false;

function _cpHsvToRgb(h, s, v) {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i];
  return { r: Math.round(m[0]*255), g: Math.round(m[1]*255), b: Math.round(m[2]*255) };
}
function _cpRgbToHex(r, g, b) {
  return "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
}
function _cpHexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
}
function _cpHexToHsb(hex) {
  const rgb = _cpHexToRgb(hex); if (!rgb) return;
  const r = rgb.r/255, g = rgb.g/255, b = rgb.b/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0;
  if (d) {
    if (max===r) h = ((g-b)/d + 6) % 6;
    else if (max===g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  _cpH = h; _cpS = max ? d/max : 0; _cpB = max;
}

function _cpDrawSB() {
  const c = document.getElementById("wgt-cp-sb"); if (!c) return;
  const ctx = c.getContext("2d"), W = c.width, H = c.height;
  // Base hue
  const [hr,hg,hb] = (() => { const {r,g,b}=_cpHsvToRgb(_cpH,1,1); return [r,g,b]; })();
  ctx.clearRect(0,0,W,H);
  const gH = ctx.createLinearGradient(0,0,W,0);
  gH.addColorStop(0, "#fff"); gH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
  ctx.fillStyle = gH; ctx.fillRect(0,0,W,H);
  const gV = ctx.createLinearGradient(0,0,0,H);
  gV.addColorStop(0, "rgba(0,0,0,0)"); gV.addColorStop(1, "#000");
  ctx.fillStyle = gV; ctx.fillRect(0,0,W,H);
  // Cursor
  const cx = _cpS * W, cy = (1 - _cpB) * H;
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.stroke();
}

function _cpDrawHue() {
  const c = document.getElementById("wgt-cp-hue"); if (!c) return;
  const ctx = c.getContext("2d"), W = c.width, H = c.height;
  const g = ctx.createLinearGradient(0,0,W,0);
  for (let i=0; i<=360; i+=30) g.addColorStop(i/360, `hsl(${i},100%,50%)`);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  // Cursor
  const cx = (_cpH / 360) * W;
  ctx.beginPath(); ctx.arc(cx, H/2, H/2 - 1, 0, Math.PI*2);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, H/2, H/2 - 3, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
}

function _cpApply() {
  const rgb = _cpHsvToRgb(_cpH, _cpS, _cpB);
  const hex = _cpRgbToHex(rgb.r, rgb.g, rgb.b);
  wtCfg.customBg = hex;
  wtSave(wtCfg);
  const swatch = document.getElementById("wgt-cp-swatch");
  const hexIn  = document.getElementById("wgt-cp-hex");
  if (swatch) swatch.style.background = hex;
  if (hexIn && document.activeElement !== hexIn) hexIn.value = hex;
  // Apply to live box immediately
  const liveBox = document.querySelector(".wgt-live-box");
  if (liveBox && wtCfg.theme === "custom") {
    const alpha = (Math.max(0,Math.min(100,parseInt(wtCfg.bgOpacity??"100")))/100).toFixed(2);
    liveBox.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }
  _cpDrawSB(); _cpDrawHue();
}

function _cpPosSB(e) {
  const c = document.getElementById("wgt-cp-sb"); if (!c) return;
  const r = c.getBoundingClientRect();
  const px = (e.touches ? e.touches[0].clientX : e.clientX);
  const py = (e.touches ? e.touches[0].clientY : e.clientY);
  _cpS = Math.max(0, Math.min(1, (px - r.left) / r.width));
  _cpB = Math.max(0, Math.min(1, 1 - (py - r.top) / r.height));
  _cpApply();
}
function _cpPosHue(e) {
  const c = document.getElementById("wgt-cp-hue"); if (!c) return;
  const r = c.getBoundingClientRect();
  const px = (e.touches ? e.touches[0].clientX : e.clientX);
  _cpH = Math.max(0, Math.min(360, ((px - r.left) / r.width) * 360));
  _cpApply();
}

function _cpInit() {
  const sb  = document.getElementById("wgt-cp-sb");
  const hue = document.getElementById("wgt-cp-hue");
  if (!sb || !hue || sb._cpBound) return;
  sb._cpBound = true;

  // Restore saved color
  if (wtCfg.customBg) _cpHexToHsb(wtCfg.customBg);

  // SB events
  sb.addEventListener("mousedown",  e => { _cpDraggingSB=true; _cpPosSB(e); e.preventDefault(); });
  sb.addEventListener("touchstart", e => { _cpDraggingSB=true; _cpPosSB(e); e.preventDefault(); }, {passive:false});
  // Hue events
  hue.addEventListener("mousedown",  e => { _cpDraggingHue=true; _cpPosHue(e); e.preventDefault(); });
  hue.addEventListener("touchstart", e => { _cpDraggingHue=true; _cpPosHue(e); e.preventDefault(); }, {passive:false});

  window.addEventListener("mousemove", e => {
    if (_cpDraggingSB)  _cpPosSB(e);
    if (_cpDraggingHue) _cpPosHue(e);
  });
  window.addEventListener("touchmove", e => {
    if (_cpDraggingSB)  { _cpPosSB(e); e.preventDefault(); }
    if (_cpDraggingHue) { _cpPosHue(e); e.preventDefault(); }
  }, {passive:false});
  window.addEventListener("mouseup",  () => { _cpDraggingSB=false; _cpDraggingHue=false; });
  window.addEventListener("touchend", () => { _cpDraggingSB=false; _cpDraggingHue=false; });

  // Hex input
  const hexIn = document.getElementById("wgt-cp-hex");
  if (hexIn) {
    hexIn.addEventListener("input", () => {
      const v = hexIn.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) { _cpHexToHsb(v); _cpApply(); }
    });
    hexIn.addEventListener("change", () => {
      const v = hexIn.value.trim();
      const full = /^[0-9a-f]{6}$/i.test(v) ? "#"+v : v;
      if (/^#[0-9a-f]{6}$/i.test(full)) { hexIn.value=full; _cpHexToHsb(full); _cpApply(); }
    });
  }

  _cpApply();
}

// ── Phone mockup status-bar clock ────────────────────────────────────────────
function _updatePhoneClock() {
  const el = document.getElementById("wgt-phone-clock");
  if (!el) return;
  const now = new Date();
  el.textContent = now.getHours().toString().padStart(2,"0") + ":" + now.getMinutes().toString().padStart(2,"0");
}

// ── Sync settings from server (bridges localStorage gap between separate exes) ─
async function _wtSyncFromServer() {
  try {
    const res  = await fetch("/api/widget/settings");
    const data = await res.json();
    if (!data || typeof data !== "object" || !Object.keys(data).length) return;
    let changed = false;
    for (const [k, v] of Object.entries(data)) {
      if (!(k in WT_DEFAULTS)) continue;
      const newVal = typeof WT_DEFAULTS[k] === "boolean" ? (v ? "1" : "0") : String(v);
      if (localStorage.getItem("w_" + k) !== newVal) {
        localStorage.setItem("w_" + k, newVal);
        changed = true;
      }
    }
    if (changed) {
      wtCfg = wtLoad();
      wtApplyUI();
      wltRender();
    }
  } catch (e) {}
}

// ── Entry point called by switchTab('widget') ─────────────────────────────────
function widgetOnEnter() {
  wtCfg = wtLoad();
  wtApplyUI();
  wLoadAssets();
  wltLoad();
  wltScheduleRefresh();
  _updatePhoneClock();
  if (!window._phoneClockTimer) {
    window._phoneClockTimer = setInterval(_updatePhoneClock, 30000);
  }
  _wtSyncFromServer(); // pull latest settings from server (syncs between exes)
}

function wltScheduleRefresh() {
  if (wltTimer) clearInterval(wltTimer);
  const mins = parseInt(wtCfg.refresh, 10) || 15;
  wltTimer = setInterval(wltLoad, mins * 60 * 1000);
}

// ─── Live Widget (Widget tab inline display) ──────────────────────────────────
// Mirrors /widget rendering but operates on #wlt-* elements inside the SPA.

const WLT_FS_MAP  = { sm: "10.5px", md: "12px", lg: "14px" };
const WLT_CCY_SYM = { USD: "$", BRL: "R$", EUR: "€" };
let wltRates    = { BRL: 5.70, EUR: 0.92 };
let wltLastData = [];
let wltAlertMap = {};
let wltTimer    = null;

function wltCcyRate() {
  return { USD: 1, BRL: wltRates.BRL, EUR: wltRates.EUR }[wtCfg.ccy] || 1;
}

function wltFmtPrice(usdP) {
  if (usdP == null) return "—";
  const p   = usdP * wltCcyRate();
  const sym = wtCfg.showCcy ? WLT_CCY_SYM[wtCfg.ccy] : "";
  const a   = Math.abs(p);
  if (a >= 10000) return sym + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (a >= 1)     return sym + p.toFixed(2);
  if (a >= 0.01)  return sym + p.toFixed(4);
  return sym + p.toPrecision(3);
}

function _wltPct(pct) {
  if (pct == null) return { text: "—", cls: "wlt-neu" };
  const s   = pct >= 0 ? "+" : "";
  const cls = pct > 0.005 ? "wlt-pos" : pct < -0.005 ? "wlt-neg" : "wlt-neu";
  return { text: s + pct.toFixed(2) + "%", cls };
}

function _wltVal(usdP, pct) {
  if (usdP == null || pct == null) return { text: "—", cls: "wlt-neu" };
  const prev = usdP / (1 + pct / 100);
  const abs  = (usdP - prev) * wltCcyRate();
  const sym  = wtCfg.showCcy ? WLT_CCY_SYM[wtCfg.ccy] : "";
  const s    = abs >= 0 ? "+" : "-";
  const cls  = abs > 0.000005 ? "wlt-pos" : abs < -0.000005 ? "wlt-neg" : "wlt-neu";
  const a    = Math.abs(abs);
  let num;
  if (a >= 100)       num = a.toFixed(2);
  else if (a >= 1)    num = a.toFixed(2);
  else if (a >= 0.01) num = a.toFixed(4);
  else                num = a.toPrecision(2);
  return { text: s + sym + num, cls };
}

function wltFmtChg(usdP, pct) {
  if (!wtCfg.showChg) return { text: "", cls: "wlt-neu" };
  if (wtCfg.chg === "pct")  return _wltPct(pct);
  if (wtCfg.chg === "val")  return _wltVal(usdP, pct);
  if (wtCfg.chg === "both") {
    const p = _wltPct(pct);
    const v = _wltVal(usdP, pct);
    return { text: v.text + " (" + p.text + ")", cls: p.cls };
  }
  return _wltPct(pct);
}

function wltEsc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wltCellsHtml(a, fs) {
  if (!a) return `<span class="wlt-ticker"></span><span class="wlt-price"></span><span class="wlt-chg"></span>`;
  const { text: chg, cls } = wltFmtChg(a.price, a.change24h);
  const fw  = wtCfg.bold ? "font-weight:700;" : "";
  const fss = `font-size:${fs};`;
  const rawSym = a.symbol || "";
  const symTrunc = rawSym.length > 12 ? rawSym.slice(0, 9) + "…" : rawSym;
  const sym   = wltEsc(symTrunc);
  const price = wltEsc(wltFmtPrice(a.price));
  const _FOREX_FLAG = { USD:'us', EUR:'eu', BRL:'br', GBP:'gb', JPY:'jp', CHF:'ch', AUD:'au', CAD:'ca' };
  function _forexIconUrl(s) {
    if (s.length !== 6) return null;
    const cc = _FOREX_FLAG[s.slice(0,3).toUpperCase()];
    return cc ? `https://flagcdn.com/48x36/${cc}.png` : null;
  }
  const _symUp = rawSym.toUpperCase();
  const _forexUrl = _forexIconUrl(_symUp);
  const iconHtml = wtCfg.showIcon
    ? (_forexUrl
        ? `<img class="wlt-icon" src="${_forexUrl}" alt="" onerror="this.style.visibility='hidden';this.style.width='0'">`
        : `<img class="wlt-icon" src="/static/icons/tokens/${wltEsc(_symUp)}.png" alt="" onerror="this.style.visibility='hidden';this.style.width='0'">`)
    : "";
  return iconHtml +
         `<span class="wlt-ticker" style="${fss}${fw}">${sym}</span>` +
         `<span class="wlt-price"  style="${fss}${fw}">${price}</span>` +
         `<span class="wlt-chg ${cls}" style="${fss}${fw}">${wltEsc(chg)}</span>`;
}

function wltApplyLayout() {
  const topbar     = document.getElementById("wlt-topbar");
  const header     = document.getElementById("wlt-header");
  const controls   = document.getElementById("wlt-controls");
  const refreshBtn = document.getElementById("wlt-refresh-btn");
  const c1         = document.getElementById("wlt-c1");
  const c2         = document.getElementById("wlt-c2");
  const valBtn     = document.getElementById("wlt-chg-val-btn");
  if (!topbar) return;

  const is2Row = wtCfg.rows === "2" || wtCfg.showAlerts;

  topbar.style.display    = (wtCfg.showHeader || wtCfg.showControls) ? "" : "none";
  if (header)     header.style.display     = wtCfg.showHeader   ? "" : "none";
  if (refreshBtn) refreshBtn.style.display = wtCfg.showRefresh  ? "" : "none";
  if (controls)   controls.style.display   = wtCfg.showControls ? "" : "none";

  // 2-row mode: columns switch to flex so each asset block occupies 2 lines.
  // 1-row mode: restore CSS grid (icon | ticker | price | chg).
  // Use inline styles explicitly so the layout always applies regardless of CSS specificity.
  const gridCols = wtCfg.showIcon
    ? "max-content 1fr max-content max-content"
    : "1fr max-content max-content";
  document.querySelectorAll(".wgt-live-col").forEach(col => {
    col.classList.toggle("wlt-2row-mode", is2Row);
    if (!is2Row) {
      col.style.display              = "grid";
      col.style.flexDirection        = "";
      col.style.gridTemplateColumns  = gridCols;
    } else {
      col.style.display              = "flex";
      col.style.flexDirection        = "column";
      col.style.gridTemplateColumns  = "";
    }
  });

  // c2/c3/c4 visibility — applied AFTER the loop so it overrides the display set above
  const _nCols = parseInt(wtCfg.cols) || 2;
  const _colShow = is2Row ? "flex" : "grid";
  const c3 = document.getElementById("wlt-c3");
  const c4 = document.getElementById("wlt-c4");
  if (c2) c2.style.display = _nCols >= 2 ? _colShow : "none";
  if (c3) c3.style.display = _nCols >= 3 ? _colShow : "none";
  if (c4) c4.style.display = _nCols >= 4 ? _colShow : "none";

  document.querySelectorAll("#wlt-ccy-group .wgt-live-pill").forEach(b =>
    b.classList.toggle("active", b.dataset.ccy === wtCfg.ccy));
  document.querySelectorAll("#wlt-chg-group .wgt-live-pill").forEach(b =>
    b.classList.toggle("active", b.dataset.chg === wtCfg.chg));
  if (valBtn) valBtn.textContent = "±" + (wtCfg.showCcy ? WLT_CCY_SYM[wtCfg.ccy] : "$");
}

function wltRender() {
  wltApplyLayout();
  let data = [...wltLastData];

  // Filter to selected assets (chips), preserving chip order
  const selected = wtCfg.assets ? wtCfg.assets.split(",").filter(Boolean) : [];
  if (selected.length) {
    data = data.filter(a => selected.includes((a.symbol || "").toUpperCase()));
    data.sort((a, b) =>
      selected.indexOf((a.symbol || "").toUpperCase()) -
      selected.indexOf((b.symbol || "").toUpperCase())
    );
  }

  if (wtCfg.autoSort) data.sort((a, b) => (b.change24h || 0) - (a.change24h || 0));

  const fs = WLT_FS_MAP[wtCfg.fontSize] || "12px";
  const cellFn = (wtCfg.rows === "2" || wtCfg.showAlerts) ? wltAsset2RowHtml : wltCellsHtml;

  const nCols = parseInt(wtCfg.cols) || 2;
  const chunkSize = Math.ceil(data.length / nCols);
  ["wlt-c1", "wlt-c2", "wlt-c3", "wlt-c4"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const chunk = i < nCols ? data.slice(i * chunkSize, (i + 1) * chunkSize) : [];
    el.innerHTML = chunk.map(a => cellFn(a, fs)).join("");
  });

  wltRenderTrades();
}

// ── 2-row-per-asset renderer ──────────────────────────────────────────────────
// Each asset gets two lines:
//   Line 1: [icon] TICKER   $PRICE   [±VALUE if chg=both]
//   Line 2:  (right-aligned) [+%  if chg=both | ±CHG if pct/val]
function wltAsset2RowHtml(a, fs) {
  if (!a) return "";
  const fw     = wtCfg.bold ? "font-weight:700;" : "";
  const fss    = `font-size:${fs};`;
  const rawSym = a.symbol || "";
  const symTrunc = rawSym.length > 12 ? rawSym.slice(0, 9) + "…" : rawSym;
  const sym    = wltEsc(symTrunc);
  const price  = wltEsc(wltFmtPrice(a.price));

  // Active alerts for this ticker
  const tickerAlerts = wltAlertMap[rawSym.toUpperCase()] || [];
  const activeAlerts = tickerAlerts.filter(al => !al.triggered);

  // Icon
  const _FOREX_FLAG = { USD:'us', EUR:'eu', BRL:'br', GBP:'gb', JPY:'jp', CHF:'ch', AUD:'au', CAD:'ca' };
  const _symUp = rawSym.toUpperCase();
  const _cc = _symUp.length === 6 ? _FOREX_FLAG[_symUp.slice(0, 3)] : null;
  const _forexUrl = _cc ? `https://flagcdn.com/48x36/${_cc}.png` : null;
  const iconHtml = wtCfg.showIcon
    ? (_forexUrl
        ? `<img class="wlt-icon" src="${_forexUrl}" alt="" onerror="this.style.visibility='hidden';this.style.width='0'">`
        : `<img class="wlt-icon" src="/static/icons/tokens/${wltEsc(_symUp)}.png" alt="" onerror="this.style.visibility='hidden';this.style.width='0'">`)
    : "";

  // Line 1 / line 2 content
  let topChg = "";
  let botChg  = "";
  let botCls  = "";   // extra class on .wlt-2r-bot when showing alert row

  let alertRows = "";

  if (wtCfg.showAlerts) {
    // showAlerts mode: change on line 1; one alert row per alert (sequential, gray)
    if (wtCfg.showChg) {
      const { text, cls } = wltFmtChg(a.price, a.change24h);
      if (text) topChg = `<span class="wlt-chg ${cls}" style="${fss}${fw}">${wltEsc(text)}</span>`;
    }
    if (activeAlerts.length) {
      const ccyRate2 = wltCcyRate();
      const ccySym2  = wtCfg.showCcy ? (WLT_CCY_SYM[wtCfg.ccy] || "$") : "";
      alertRows = activeAlerts.map(al => {
        const arrow = al.direction === "above" ? "▲" : "▼";
        const tgt  = al.target * ccyRate2;
        const tgtStr = tgt >= 1000
          ? ccySym2 + tgt.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})
          : tgt >= 1      ? ccySym2 + tgt.toFixed(2)
          : tgt >= 0.0001 ? ccySym2 + tgt.toFixed(4)
          : ccySym2 + tgt.toPrecision(3);
        const bellSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
        return `<div class="wlt-alert-row" style="${fss}">${bellSvg}${arrow} ${wltEsc(tgtStr)}</div>`;
      }).join("");
    }
  } else {
    // Normal 2-row change: "both" → value on line 1, % on line 2; pct/val → chg on line 2 only
    if (wtCfg.showChg) {
      if (wtCfg.chg === "both") {
        const v = _wltVal(a.price, a.change24h);
        const p = _wltPct(a.change24h);
        topChg = `<span class="wlt-chg ${v.cls}" style="${fss}${fw}">${wltEsc(v.text)}</span>`;
        botChg = `<span class="wlt-chg ${p.cls}" style="${fss}${fw}">${wltEsc(p.text)}</span>`;
      } else {
        const { text, cls } = wltFmtChg(a.price, a.change24h);
        botChg = `<span class="wlt-chg ${cls}" style="${fss}${fw}">${wltEsc(text)}</span>`;
      }
    }
  }

  return `<div class="wlt-asset-2r">
    <div class="wlt-2r-top" style="${fss}">
      ${iconHtml}
      <span class="wlt-ticker" style="${fss}${fw}">${sym}</span>
      <span class="wlt-price"  style="${fss}${fw}">${price}</span>
      ${topChg}
    </div>
    ${alertRows || `<div class="wlt-2r-bot">${botChg}</div>`}
  </div>`;
}

// ── Trades section renderer ───────────────────────────────────────────────────
let wltPortfolioData = [];

function wltRenderTrades() {
  const divider = document.getElementById("wlt-trades-divider");
  const section = document.getElementById("wlt-trades");
  if (!divider || !section) return;

  if (!wtCfg.showTrades) {
    divider.style.display = "none";
    section.style.display = "none";
    return;
  }

  divider.style.display = "";
  section.style.display = "";

  const tokens = wltPortfolioData;
  if (!tokens.length) {
    section.innerHTML = `<div class="wlt-trade-empty">${t('wgt_no_positions')}</div>`;
    return;
  }

  const ccyRate = wltCcyRate();
  const ccySym  = wtCfg.showCcy ? WLT_CCY_SYM[wtCfg.ccy] : "";
  const fs      = WLT_FS_MAP[wtCfg.fontSize] || "12px";
  const fw      = wtCfg.bold ? "font-weight:700;" : "";

  function fmtV(usd) {
    const v = usd * ccyRate;
    const a = Math.abs(v);
    if (a >= 10000) return ccySym + v.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
    if (a >= 1)     return ccySym + v.toFixed(2);
    if (a >= 0.01)  return ccySym + v.toFixed(4);
    return ccySym + v.toPrecision(3);
  }

  const rows = tokens.map(tok => {
    const sym    = wltEsc((tok.ticker || "").toUpperCase());
    const trades = tok.trades || [];
    const curP   = tok.current_price;

    // Compute position
    let totalQty = 0, totalCost = 0;
    for (const tr of trades) {
      const q = parseFloat(tr.qty) || 0;
      const p = parseFloat(tr.price_paid) || 0;
      totalQty  += q;
      totalCost += q * p;
    }
    const avgPrice  = totalQty ? totalCost / totalQty : 0;
    const curVal    = curP != null ? totalQty * curP : null;
    const pnlUsd    = curP != null ? (curP - avgPrice) * totalQty : null;
    const pnlPct    = avgPrice > 0 && curP != null ? (curP - avgPrice) / avgPrice * 100 : null;
    const curValStr = curVal != null ? fmtV(curVal) : "—";

    let pnlValStr = "—", pnlPctStr = "", pnlCls = "wlt-neu";
    if (pnlUsd != null) {
      const pnlC = pnlUsd * ccyRate;
      const s    = pnlC >= 0 ? "+" : "-";
      const a    = Math.abs(pnlC);
      const num  = a >= 100 ? a.toFixed(2) : a >= 1 ? a.toFixed(2) : a.toFixed(4);
      pnlValStr = s + ccySym + num;
      pnlCls    = pnlC > 0.00001 ? "wlt-pos" : pnlC < -0.00001 ? "wlt-neg" : "wlt-neu";
    }
    if (pnlPct != null) {
      const sp = pnlPct >= 0 ? "+" : "";
      pnlPctStr = sp + pnlPct.toFixed(2) + "%";
    }

    const qtyStr = totalQty !== 0
      ? (Math.abs(totalQty) >= 1 ? totalQty.toFixed(4).replace(/\.?0+$/, "") : totalQty.toPrecision(4)) + " un"
      : "0";

    return `<div class="wlt-trade-item" style="font-size:${fs}">
      <div class="wlt-trade-top">
        <span class="wlt-trade-ticker" style="${fw}">${sym}</span>
        <span class="wlt-trade-val"    style="${fw}">${wltEsc(curValStr)}</span>
        <span class="wlt-trade-pnl-val ${pnlCls}">${wltEsc(pnlValStr)}</span>
      </div>
      <div class="wlt-trade-bot">
        <span class="wlt-trade-qty">${wltEsc(qtyStr)}</span>
        <span class="wlt-trade-pnl-pct ${pnlCls}">${wltEsc(pnlPctStr)}</span>
      </div>
    </div>`;
  });

  section.innerHTML = rows.join("");
}

// ── Alerts section renderer ───────────────────────────────────────────────────
function wltRenderAlerts() {
  const divider = document.getElementById("wlt-alerts-divider");
  const section = document.getElementById("wlt-alerts");
  if (!divider || !section) return;

  if (!wtCfg.showAlerts) {
    divider.style.display = "none";
    section.style.display = "none";
    return;
  }

  divider.style.display = "";
  section.style.display = "";

  const fs = WLT_FS_MAP[wtCfg.fontSize] || "12px";
  const fw = wtCfg.bold ? "font-weight:700;" : "";

  // Collect only active (non-triggered) alerts
  const entries = [];
  for (const [ticker, alerts] of Object.entries(wltAlertMap)) {
    const active = alerts.filter(al => !al.triggered);
    for (const al of active) {
      const dirLabel = al.direction === "above" ? "▲" : "▼";
      const ccyRate  = wltCcyRate();
      const ccySym   = wtCfg.showCcy ? (WLT_CCY_SYM[wtCfg.ccy] || "$") : "";
      const target   = al.target * ccyRate;
      const tgtStr   = target >= 1000
        ? ccySym + target.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})
        : target >= 1 ? ccySym + target.toFixed(2)
        : target >= 0.0001 ? ccySym + target.toFixed(4)
        : ccySym + target.toPrecision(3);
      entries.push({ ticker, dirLabel, tgtStr, dir: al.direction });
    }
  }

  if (!entries.length) {
    section.innerHTML = `<div class="wlt-trade-empty">${t('wgt_no_alerts')}</div>`;
    return;
  }

  const rows = entries.map(e => {
    const cls = e.dir === "above" ? "wlt-pos" : "wlt-neg";
    return `<div class="wlt-trade-item" style="font-size:${fs}">
      <div class="wlt-trade-top">
        <span class="wlt-trade-ticker" style="${fw}">${wltEsc(e.ticker)}</span>
        <span class="wlt-trade-val ${cls}" style="${fw}">${wltEsc(e.dirLabel)} ${wltEsc(e.tgtStr)}</span>
      </div>
    </div>`;
  });

  section.innerHTML = rows.join("");
}

async function wltLoad() {
  try {
    const fetches = [fetch("/api/assets"), fetch("/api/rates"), fetch("/api/alerts")];
    if (wtCfg.showTrades) fetches.push(fetch("/api/portfolio"));
    const [ra, rr, ral, rp] = await Promise.all(fetches);
    const data   = await ra.json();
    const rdata  = await rr.json();
    const alData = await ral.json().catch(() => []);
    if (rp) wltPortfolioData = await rp.json().catch(() => []);

    if (rdata.BRL) wltRates.BRL = rdata.BRL;
    if (rdata.EUR) wltRates.EUR = rdata.EUR;
    wltLastData = Array.isArray(data) ? data : [];
    wltAlertMap = {};
    for (const al of (Array.isArray(alData) ? alData : [])) {
      const k = (al.ticker || "").toUpperCase();
      if (!wltAlertMap[k]) wltAlertMap[k] = [];
      wltAlertMap[k].push(al);
    }

    const now = new Date();
    const hh  = now.getHours().toString().padStart(2, "0");
    const mm  = now.getMinutes().toString().padStart(2, "0");
    const txt = document.getElementById("wlt-text");
    if (txt) txt.textContent = t("refreshed_at") + " " + hh + ":" + mm;

    wltRender();
  } catch(e) {
    const txt = document.getElementById("wlt-text");
    if (txt) txt.textContent = t("error_load");
  }
}

// Quick-control handlers — sync both the live widget AND the settings pills below
function wltSetCcy(v) { wSet("ccy", v); }
function wltSetChg(v) { wSet("chg", v); }

// ── Backwards-compat aliases ──────────────────────────────────────────────────
function wsSet(key, val)      { wSet(key, val); }
function wsToggle(key)        { wToggle(key); }
function wsApplyUI()          { wtApplyUI(); }
function wsUpdatePreview()    { wtUpdatePreview(); }
function widgetUpdatePreview(){ wtUpdatePreview(); }
function widgetSaveConfig()   { wSaveConfig(); }
