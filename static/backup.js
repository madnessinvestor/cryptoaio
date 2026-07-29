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

// ─── Share Report ─────────────────────────────────────────────────────────────
// Combined Watchlist + Dashboard + Trade report in the same visual style
// as exportDashboard() and exportTrades().

async function shareReport() {
  // ── 1. Pre-load all section data in parallel ────────────────────────────────
  _backupSetStatus("loading", _bgt("rpt_share_loading"));
  try {
    const [assetsRes, portfolioRes, walletsRes, manualRes] = await Promise.all([
      fetch("/api/assets"),
      fetch("/api/portfolio"),
      fetch("/api/dashboard/wallets"),
      fetch("/api/dashboard/manual"),
    ]);
    if (assetsRes.ok)    cachedAssets    = await assetsRes.json();
    if (portfolioRes.ok) cachedPortfolio = await portfolioRes.json();
    if (walletsRes.ok)   dashWallets     = await walletsRes.json();
    if (manualRes.ok)    dashManual      = await manualRes.json();
  } catch (e) {
    console.warn("[shareReport] pre-load error", e);
    // Proceed with whatever data is already in memory
  }
  _backupSetStatus("", "");

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const ts  = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const rate   = (typeof getRate  === "function") ? getRate()  : 1;
  const sym    = (typeof currSym  === "function") ? currSym()  : "$";
  const cnyName = sym === "R$" ? "BRL" : sym === "€" ? "EUR" : "USD";

  // ── shared helpers ──────────────────────────────────────────────────────────
  function fv(usd) {
    if (usd == null || isNaN(usd)) return "—";
    const v = Number(usd) * rate;
    const abs = Math.abs(v), neg = v < 0;
    let s;
    if (abs >= 1e6)       s = sym + (abs/1e6).toFixed(2) + "M";
    else if (abs >= 1e3)  s = sym + abs.toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2});
    else if (abs >= 1)    s = sym + abs.toFixed(2);
    else if (abs >= 1e-6) s = sym + abs.toFixed(6);
    else                  s = sym + abs.toPrecision(4);
    return neg ? "-" + s : s;
  }
  function fUsd(usd) {   // always USD (dashboard section)
    if (usd == null || isNaN(usd)) return "—";
    const abs = Math.abs(Number(usd)), neg = Number(usd) < 0;
    let s;
    if (abs >= 1e6)       s = "$" + (abs/1e6).toFixed(2) + "M";
    else if (abs >= 1e3)  s = "$" + abs.toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2});
    else if (abs >= 1)    s = "$" + abs.toFixed(2);
    else if (abs >= 0.0001) s = "$" + abs.toFixed(6);
    else                  s = "$" + abs.toPrecision(3);
    return neg ? "-" + s : s;
  }
  function fq(n) {
    const abs = Math.abs(Number(n));
    if (abs >= 1e3)  return Number(n).toLocaleString("en-US", {maximumFractionDigits:4});
    if (abs >= 1)    return Number(n).toFixed(6);
    if (abs >= 1e-5) return Number(n).toFixed(8);
    return Number(n).toPrecision(4);
  }
  function fQty(v) {
    if (v == null || isNaN(v)) return "—";
    const n = Number(v);
    if (n >= 1000) return n.toLocaleString("en-US", {maximumFractionDigits:2});
    if (n >= 1)    return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    return n.toPrecision(3);
  }
  function fp(v) {
    if (v == null || isNaN(v)) return "—";
    const sign = Number(v) >= 0 ? "+" : "";
    return sign + Number(v).toFixed(2) + "%";
  }
  function fPct(v) {
    if (v == null || isNaN(v)) return "—";
    return (Number(v) >= 0 ? "+" : "") + Number(v).toFixed(2) + "%";
  }
  function pnlCls(v) {
    if (!v || isNaN(v) || v === 0) return "neu";
    return Number(v) > 0 ? "pos" : "neg";
  }
  function esc(s) {
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── CSS (shared with existing reports) ─────────────────────────────────────
  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           font-size: 11px; color: #1a1a2e; background: #fff; padding: 28px 32px; }
    .report-header { display:flex; align-items:center; justify-content:space-between;
      border-bottom:2px solid #00c27c; padding-bottom:14px; margin-bottom:20px; }
    .report-logo { font-size:20px; font-weight:900; letter-spacing:0.04em; color:#00c27c; }
    .report-meta { text-align:right; color:#666; font-size:10px; line-height:1.7; }
    .section-wrap { margin-bottom: 36px; }
    .section-title { font-size:12px; font-weight:800; text-transform:uppercase;
      letter-spacing:0.06em; color:#00a060;
      border-bottom:1px solid #e0e0e0; padding-bottom:5px; margin-bottom:12px; margin-top:28px; }
    .section-title:first-child { margin-top:0; }
    .summary-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
    .sum-card { background:#f5f7fa; border-radius:8px; padding:12px 14px; border-left:3px solid #00c27c; }
    .sum-card.grand     { background:#e8faf3; border-color:#00a060; }
    .sum-card.grand-pos { background:#e8faf3; border-color:#059669; }
    .sum-card.grand-neg { background:#fff0f0; border-color:#dc2626; }
    .sum-label { font-size:9px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.07em; color:#888; margin-bottom:4px; }
    .sum-val { font-size:16px; font-weight:800; color:#1a1a2e; font-variant-numeric:tabular-nums; }
    .sum-sub { font-size:11px; font-weight:600; margin-top:2px; }
    .div-export-wrap { display:flex; align-items:flex-start; gap:24px; margin-bottom:20px; }
    .div-table { width:auto; min-width:260px; }
    .wallet-block { border:1px solid #e8e8e8; border-radius:8px;
      margin-bottom:16px; overflow:hidden; page-break-inside:avoid; }
    .wallet-header { display:flex; align-items:center; justify-content:space-between;
      background:#f8f9fc; padding:9px 14px; border-bottom:1px solid #e8e8e8; }
    .wallet-title-row { display:flex; flex-direction:column; gap:2px; }
    .wallet-label { font-weight:700; font-size:12px; color:#1a1a2e; }
    .wallet-addr  { font-family:monospace; font-size:9px; color:#999; }
    .wallet-total { font-size:14px; font-weight:800; color:#1a1a2e; white-space:nowrap; }
    .sub-label { font-size:9px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.06em; color:#888; padding:8px 14px 4px;
      background:#fafafa; border-bottom:1px solid #f0f0f0; }
    .token-block { border:1px solid #e8e8e8; border-radius:8px;
      margin-bottom:16px; overflow:hidden; page-break-inside:avoid; }
    .token-header { background:#f8f9fc; padding:10px 14px;
      border-bottom:1px solid #e8e8e8; display:flex; flex-direction:column; gap:6px; }
    .token-title-row { display:flex; align-items:baseline; gap:10px; }
    .token-ticker { font-size:14px; font-weight:800; color:#1a1a2e; }
    .token-meta   { font-size:9px; color:#888; }
    .token-totals { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .tsum-item  { display:flex; align-items:baseline; gap:4px; }
    .tsum-label { font-size:9px; color:#aaa; text-transform:uppercase; letter-spacing:0.05em; }
    .tsum-val   { font-size:12px; font-weight:700; color:#1a1a2e; }
    .tsum-pct   { font-size:10px; font-weight:600; }
    .tsum-sep   { color:#ddd; }
    table { width:100%; border-collapse:collapse; }
    table + .sub-label, table + table { border-top:1px solid #f0f0f0; }
    th { background:#f5f7fa; font-size:9px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.05em; color:#666; padding:5px 10px; text-align:left;
      border-bottom:1px solid #e8e8e8; }
    td { padding:5px 10px; border-bottom:1px solid #f5f5f5; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tfoot td { background:#f8f9fc; font-size:10px;
      border-top:1px solid #e0e0e0; border-bottom:none; padding:6px 10px; }
    .r    { text-align:right; }
    .mono { font-family:'Courier New',monospace; }
    .bold { font-weight:700; }
    .dim  { color:#888; }
    .small { font-size:9px; }
    .subtot-label { color:#666; font-size:9px; text-transform:uppercase; letter-spacing:0.05em; }
    .subtot { color:#1a1a2e; }
    .pos { color:#059669; }
    .neg { color:#dc2626; }
    .neu { color:#888; }
    .type-badge { display:inline-block; font-size:8px; font-weight:700;
      padding:2px 6px; border-radius:3px; white-space:nowrap; }
    .badge-buy  { background:rgba(5,150,105,0.12); color:#059669; border:1px solid rgba(5,150,105,0.25); }
    .badge-sell { background:rgba(220,38,38,0.10); color:#dc2626; border:1px solid rgba(220,38,38,0.20); }
    .net-badge { display:inline-block; font-size:8px; font-weight:700;
      padding:2px 5px; border-radius:3px;
      background:color-mix(in srgb,var(--nc) 15%,transparent);
      color:color-mix(in srgb,var(--nc) 70%,#000);
      border:1px solid color-mix(in srgb,var(--nc) 30%,transparent); white-space:nowrap; }
    .empty-note { color:#aaa; font-size:10px; padding:10px 14px; font-style:italic; }
    .chg-up  { color:#059669; font-weight:600; }
    .chg-dn  { color:#dc2626; font-weight:600; }
    .chg-neu { color:#888; }
    .report-footer { margin-top:28px; padding-top:10px;
      border-top:1px solid #e0e0e0; font-size:9px; color:#bbb; text-align:center; }
    @media print {
      @page { margin:0; size:A4; }
      body { padding:14mm 12mm; font-size:10px; }
      .wallet-block, .token-block { page-break-inside:avoid; }
      .no-print { display:none !important; }
    }
  `;

  let body = "";

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — WATCHLIST
  // ════════════════════════════════════════════════════════════════════════════
  const wlAssets = (typeof cachedAssets !== "undefined") ? cachedAssets : [];

  body += `<div class="section-title">${_bgt("rpt_share_section_wl")}</div>`;

  if (wlAssets.length) {
    body += `<table>
      <thead><tr>
        <th>${_bgt("rpt_col_asset")}</th>
        <th>${_bgt("rpt_col_type")}</th>
        <th>${_bgt("rpt_col_source")}</th>
        <th class="r">${_bgt("rpt_col_price")} (${cnyName})</th>
        <th class="r">${_bgt("rpt_col_change24h")}</th>
      </tr></thead>
      <tbody>`;

    for (const a of wlAssets) {
      const price = a.price != null ? (Number(a.price) * rate) : null;
      const chg   = a.change24h;
      let priceStr = "—";
      if (price != null && !isNaN(price)) {
        const abs = Math.abs(price);
        if (abs >= 1e3)     priceStr = sym + abs.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
        else if (abs >= 1)  priceStr = sym + abs.toFixed(2);
        else if (abs >= 0.0001) priceStr = sym + abs.toFixed(6);
        else                priceStr = sym + abs.toPrecision(4);
      }
      let chgStr = "—", chgCls = "chg-neu";
      if (chg != null && !isNaN(chg)) {
        chgStr = (Number(chg) >= 0 ? "▲ +" : "▼ ") + Number(chg).toFixed(2) + "%";
        chgCls = Number(chg) > 0 ? "chg-up" : Number(chg) < 0 ? "chg-dn" : "chg-neu";
      }
      body += `<tr>
        <td><strong>${esc(a.symbol||"")}</strong></td>
        <td class="dim">${esc(a.type||"crypto")}</td>
        <td class="dim small">${esc(a.source||a.exchange||"")}</td>
        <td class="r mono">${priceStr}</td>
        <td class="r mono ${chgCls}">${chgStr}</td>
      </tr>`;
    }
    body += `</tbody></table>`;
  } else {
    body += `<p class="empty-note">${_bgt("rpt_share_wl_empty")}</p>`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  const dWallets = (typeof dashWallets !== "undefined") ? dashWallets : [];
  const dManual  = (typeof dashManual  !== "undefined") ? dashManual  : [];

  const totalWalletUsd = dWallets.reduce((s, w) =>
    s + (w.tokens||[]).reduce((a,tk) => a + (tk.value_usd||0), 0)
      + (w.defi  ||[]).reduce((a,d)  => a + (d.net_usd  ||0), 0)
      + (w.perps ||[]).reduce((a,p)  => a + (p.net_usd  ||0), 0), 0);
  const totalManualUsd = dManual.reduce((s,a) => s + (a.balance||0)*(a.price_usd||0), 0);
  const grandDashTotal = totalWalletUsd + totalManualUsd;

  body += `<div class="section-title" style="margin-top:36px">${_bgt("rpt_share_section_dash")}</div>`;

  if (dWallets.length || dManual.length) {
    // Summary cards
    body += `<div class="summary-grid">
      <div class="sum-card"><div class="sum-label">${_bgt("rpt_total_onchain")}</div><div class="sum-val">${fUsd(totalWalletUsd)}</div></div>
      <div class="sum-card"><div class="sum-label">${_bgt("rpt_total_manual")}</div><div class="sum-val">${fUsd(totalManualUsd)}</div></div>
      <div class="sum-card grand"><div class="sum-label">${_bgt("rpt_grand_total")}</div><div class="sum-val">${fUsd(grandDashTotal)}</div></div>
    </div>`;

    // Diversification donut
    if (typeof _buildDivData === "function") {
      const divItems = _buildDivData();
      if (divItems.length >= 2) {
        const PIE_COLORS = ["#00c27c","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16","#6366f1"];
        const Rpie = 90, rpie = 50, GAP = divItems.length > 1 ? 1.5 : 0;
        let svgPaths = "", angle = 0;
        divItems.forEach((item, i) => {
          const sweep = item.pct / 100 * 360;
          const start = angle + GAP / 2;
          const end   = angle + sweep - GAP / 2;
          angle += sweep;
          const path = _svgDonutArc(Rpie, rpie, start, end);
          svgPaths += `<path d="${path}" fill="${PIE_COLORS[i % PIE_COLORS.length]}"/>`;
        });
        let divRows = "";
        divItems.forEach((item, i) => {
          const color = PIE_COLORS[i % PIE_COLORS.length];
          divRows += `<tr>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};vertical-align:middle"></span></td>
            <td><strong>${esc(item.sym)}</strong></td>
            <td class="r mono">${fUsd(item.val)}</td>
            <td class="r mono">${item.pct.toFixed(1)}%</td>
          </tr>`;
        });
        body += `<div class="div-export-wrap">
          <svg viewBox="-100 -100 200 200" width="170" height="170" xmlns="http://www.w3.org/2000/svg">
            ${svgPaths}
            <text x="0" y="-7" text-anchor="middle" style="font-size:8px;fill:#888;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${_bgt("rpt_grand_total")}</text>
            <text x="0" y="11" text-anchor="middle" style="font-size:13px;fill:#1a1a2e;font-weight:800">${fUsd(grandDashTotal)}</text>
          </svg>
          <table class="div-table">
            <thead><tr><th></th><th>${_bgt("rpt_col_asset")}</th><th class="r">${_bgt("rpt_col_value")}</th><th class="r">${_bgt("rpt_col_allocation")}</th></tr></thead>
            <tbody>${divRows}</tbody>
          </table>
        </div>`;
      }
    }

    // On-chain wallets
    if (dWallets.length) {
      body += `<div class="sub-label" style="background:transparent;padding:0 0 6px;border:none;font-size:10px">${_bgt("rpt_share_onchain_wallets")}</div>`;
      for (const w of dWallets) {
        const tokens = (w.tokens||[]).slice().sort((a,b) => (b.value_usd||0)-(a.value_usd||0));
        const defi   = w.defi  || [];
        const perps  = w.perps || [];
        const label  = esc(w.label || (typeof shortAddr === "function" ? shortAddr(w.address) : w.address));
        const addr   = esc(w.address || "");
        const tokUsd  = tokens.reduce((s,tk) => s+(tk.value_usd||0), 0);
        const defiUsd = defi.reduce((s,d) => s+(d.net_usd||0), 0);
        const prpUsd  = perps.reduce((s,p) => s+(p.net_usd||0), 0);
        const walTotal = tokUsd + defiUsd + prpUsd;

        body += `<div class="wallet-block">
          <div class="wallet-header">
            <div class="wallet-title-row">
              <span class="wallet-label">${label}</span>
              <span class="wallet-addr">${addr}</span>
            </div>
            <span class="wallet-total">${fUsd(walTotal)}</span>
          </div>`;

        if (tokens.length) {
          body += `<div class="sub-label">Tokens</div>
            <table><thead><tr>
              <th>${_bgt("rpt_col_symbol")}</th><th>${_bgt("rpt_col_name")}</th><th>${_bgt("rpt_col_network")}</th>
              <th class="r">${_bgt("rpt_col_quantity")}</th><th class="r">${_bgt("rpt_col_price")}</th><th class="r">${_bgt("rpt_col_value")}</th>
            </tr></thead><tbody>`;
          for (const tk of tokens) {
            const cm = (typeof chainMeta === "function") ? chainMeta(tk.network) : {name:tk.network||"",color:"#888"};
            body += `<tr>
              <td><strong>${esc(tk.symbol||"")}</strong></td>
              <td class="dim">${esc(tk.name||"")}</td>
              <td><span class="net-badge" style="--nc:${cm.color}">${esc(cm.name||tk.network||"")}</span></td>
              <td class="r mono">${fQty(tk.balance)}</td>
              <td class="r mono">${fUsd(tk.price_usd)}</td>
              <td class="r mono bold">${fUsd(tk.value_usd)}</td>
            </tr>`;
          }
          body += `</tbody><tfoot><tr>
            <td colspan="5" class="r subtot-label">${_bgt("rpt_subtotal_tokens")}</td>
            <td class="r mono bold subtot">${fUsd(tokUsd)}</td>
          </tr></tfoot></table>`;
        }

        if (defi.length) {
          body += `<div class="sub-label">DeFi</div>
            <table><thead><tr>
              <th>${_bgt("rpt_col_protocol")}</th><th>${_bgt("rpt_col_type")}</th><th>${_bgt("rpt_col_network")}</th><th>${_bgt("rpt_col_position")}</th>
              <th class="r">${_bgt("rpt_col_net_value")}</th><th class="r">${_bgt("rpt_col_debt")}</th>
            </tr></thead><tbody>`;
          for (const d of defi) {
            const cm  = (typeof chainMeta === "function") ? chainMeta(d.network) : {name:d.network||"",color:"#888"};
            const allT = [...(d.supply_tokens||[]),(d.reward_tokens||[])];
            const pos  = allT.length ? allT.map(tk=>`${fQty(tk.balance)} ${esc(tk.symbol)}`).join(" + ") : esc(d.description||"");
            body += `<tr>
              <td><strong>${esc(d.protocol||"")}</strong></td>
              <td class="dim">${esc(d.type||"")}</td>
              <td><span class="net-badge" style="--nc:${cm.color}">${esc(cm.name||d.network||"")}</span></td>
              <td class="mono small">${pos}</td>
              <td class="r mono bold">${fUsd(d.net_usd)}</td>
              <td class="r mono ${pnlCls(-(d.debt_usd||0))}">${d.debt_usd>0 ? fUsd(d.debt_usd) : "—"}</td>
            </tr>`;
          }
          body += `</tbody><tfoot><tr>
            <td colspan="4" class="r subtot-label">${_bgt("rpt_subtotal_defi")}</td>
            <td class="r mono bold subtot">${fUsd(defiUsd)}</td><td></td>
          </tr></tfoot></table>`;
        }

        if (perps.length) {
          body += `<div class="sub-label">${_bgt("rpt_perps_futures")}</div>
            <table><thead><tr>
              <th>${_bgt("rpt_col_protocol")}</th><th>${_bgt("rpt_col_type")}</th><th>${_bgt("rpt_col_network")}</th><th>${_bgt("rpt_col_description")}</th><th class="r">${_bgt("rpt_col_net_value")}</th>
            </tr></thead><tbody>`;
          for (const p of perps) {
            const cm = (typeof chainMeta === "function") ? chainMeta(p.network) : {name:p.network||"",color:"#888"};
            body += `<tr>
              <td><strong>${esc(p.protocol||"")}</strong></td>
              <td class="dim">${esc(p.type||"")}</td>
              <td><span class="net-badge" style="--nc:${cm.color}">${esc(cm.name||p.network||"")}</span></td>
              <td class="dim">${esc(p.description||"")}</td>
              <td class="r mono bold">${fUsd(p.net_usd)}</td>
            </tr>`;
          }
          body += `</tbody><tfoot><tr>
            <td colspan="4" class="r subtot-label">${_bgt("rpt_subtotal_perps")}</td>
            <td class="r mono bold subtot">${fUsd(prpUsd)}</td>
          </tr></tfoot></table>`;
        }

        if (!tokens.length && !defi.length && !perps.length) {
          body += `<p class="empty-note">${_bgt("rpt_no_wallet_data")}</p>`;
        }
        body += `</div>`; // wallet-block
      }
    }

    // Manual assets
    if (dManual.length) {
      body += `<div class="sub-label" style="background:transparent;padding:6px 0;border:none;font-size:10px;margin-top:8px">${_bgt("rpt_manual_section")}</div>
        <table><thead><tr>
          <th>${_bgt("rpt_col_symbol")}</th><th>${_bgt("rpt_col_source")}</th><th class="r">${_bgt("rpt_col_quantity")}</th>
          <th class="r">${_bgt("rpt_col_avg_paid")}</th><th class="r">${_bgt("rpt_col_cur_price")}</th>
          <th class="r">${_bgt("rpt_col_value")}</th><th class="r">${_bgt("rpt_col_invested")}</th>
          <th class="r">${_bgt("rpt_col_pnl")}</th><th class="r">${_bgt("rpt_col_pnl_pct")}</th><th>${_bgt("rpt_col_date_purchase")}</th>
        </tr></thead><tbody>`;
      for (const a of dManual) {
        const bal = a.balance||0, price = a.price_usd||0, invest = a.investment||0;
        const curVal  = bal * price;
        const avgPaid = (bal>0 && invest>0) ? invest/bal : null;
        const pnl     = invest>0 ? curVal-invest : null;
        const pnlPct  = (pnl!==null && invest>0) ? (pnl/invest*100) : null;
        const date    = a.purchase_date ? a.purchase_date.replace("T"," ").slice(0,16) : "—";
        body += `<tr>
          <td><strong>${esc(a.symbol||"")}</strong></td>
          <td class="dim">${esc(a.source||"")}</td>
          <td class="r mono">${fQty(bal)}</td>
          <td class="r mono">${avgPaid!=null ? fUsd(avgPaid) : "—"}</td>
          <td class="r mono">${price>0 ? fUsd(price) : "—"}</td>
          <td class="r mono bold">${fUsd(curVal)}</td>
          <td class="r mono">${invest>0 ? fUsd(invest) : "—"}</td>
          <td class="r mono ${pnlCls(pnl)}">${pnl!==null ? fUsd(pnl) : "—"}</td>
          <td class="r mono ${pnlCls(pnlPct)}">${pnlPct!==null ? fPct(pnlPct) : "—"}</td>
          <td class="dim small">${esc(date)}</td>
        </tr>`;
      }
      body += `</tbody><tfoot><tr>
        <td colspan="5" class="r subtot-label">${_bgt("rpt_total_manual_foot")}</td>
        <td class="r mono bold subtot">${fUsd(totalManualUsd)}</td>
        <td colspan="4"></td>
      </tr></tfoot></table>`;
    }

    if (!dWallets.length && !dManual.length) {
      body += `<p class="empty-note">${_bgt("rpt_share_dash_empty")}</p>`;
    }
  } else {
    body += `<p class="empty-note">${_bgt("rpt_share_dash_empty")}</p>`;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — TRADE / PORTFOLIO
  // ════════════════════════════════════════════════════════════════════════════
  const portfolio = (typeof cachedPortfolio !== "undefined") ? cachedPortfolio : [];

  body += `<div class="section-title" style="margin-top:36px">${_bgt("rpt_share_section_trade")}</div>`;

  if (portfolio.length && typeof calcToken === "function") {
    let grandInv = 0, grandVal = 0;
    const calcs = portfolio.map(tok => {
      const c = calcToken(tok);
      grandInv += c.total_invested;
      grandVal += c.cur_value;
      return { tok, c };
    });
    const grandPnl    = grandVal - grandInv;
    const grandPnlPct = grandInv > 0 ? (grandPnl / grandInv) * 100 : 0;

    // Summary cards
    body += `<div class="summary-grid">
      <div class="sum-card"><div class="sum-label">${_bgt("rpt_total_invested")}</div><div class="sum-val">${fv(grandInv)}</div></div>
      <div class="sum-card"><div class="sum-label">${_bgt("rpt_cur_value_card")}</div><div class="sum-val">${fv(grandVal)}</div></div>
      <div class="sum-card ${pnlCls(grandPnl)==="pos"?"grand-pos":pnlCls(grandPnl)==="neg"?"grand-neg":"grand"}">
        <div class="sum-label">${_bgt("rpt_pnl_total_label")}</div>
        <div class="sum-val ${pnlCls(grandPnl)}">${fv(grandPnl)}</div>
        <div class="sum-sub ${pnlCls(grandPnlPct)}">${fp(grandPnlPct)}</div>
      </div>
    </div>`;

    // Summary table per asset
    body += `<div class="sub-label" style="background:transparent;padding:0 0 6px;border:none;font-size:10px">${_bgt("rpt_summary_asset")}</div>
      <table><thead><tr>
        <th>${_bgt("rpt_col_ticker")}</th>
        <th class="r">${_bgt("rpt_col_total_qty")}</th><th class="r">${_bgt("rpt_col_avg_paid")}</th><th class="r">${_bgt("rpt_col_cur_price")}</th>
        <th class="r">${_bgt("rpt_col_invested")}</th><th class="r">${_bgt("rpt_col_cur_value")}</th>
        <th class="r">${_bgt("rpt_col_pnl")}</th><th class="r">${_bgt("rpt_col_pnl_pct")}</th>
      </tr></thead><tbody>`;
    for (const { tok, c } of calcs) {
      const hasCur = tok.current_price != null;
      body += `<tr>
        <td><strong>${esc(tok.ticker)}</strong></td>
        <td class="r mono">${fq(c.total_qty)}</td>
        <td class="r mono">${fv(c.avg_price)}</td>
        <td class="r mono">${hasCur ? fv(tok.current_price) : "—"}</td>
        <td class="r mono">${fv(c.total_invested)}</td>
        <td class="r mono bold">${hasCur ? fv(c.cur_value) : "—"}</td>
        <td class="r mono bold ${pnlCls(c.pnl)}">${hasCur ? fv(c.pnl) : "—"}</td>
        <td class="r mono ${pnlCls(c.pnl_pct)}">${hasCur ? fp(c.pnl_pct) : "—"}</td>
      </tr>`;
    }
    body += `</tbody><tfoot><tr>
      <td><strong>TOTAL</strong></td><td colspan="3"></td>
      <td class="r mono bold subtot">${fv(grandInv)}</td>
      <td class="r mono bold subtot">${fv(grandVal)}</td>
      <td class="r mono bold subtot ${pnlCls(grandPnl)}">${fv(grandPnl)}</td>
      <td class="r mono ${pnlCls(grandPnlPct)}">${fp(grandPnlPct)}</td>
    </tr></tfoot></table>`;

    // Detail per asset
    body += `<div class="sub-label" style="background:transparent;padding:10px 0 6px;border:none;font-size:10px">${_bgt("rpt_trade_detail")}</div>`;
    for (const { tok, c } of calcs) {
      const curPrice = tok.current_price;
      const hasCur   = curPrice != null;
      const trades   = (tok.trades||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
      if (!trades.length) continue;

      body += `<div class="token-block">
        <div class="token-header">
          <div class="token-title-row">
            <span class="token-ticker">${esc(tok.ticker)}</span>
            <span class="token-meta">${fq(c.total_qty)} ${_bgt("rpt_units")} · ${_bgt("rpt_share_avg_abbr")} ${fv(c.avg_price)} · ${_bgt("rpt_share_cur_abbr")} ${hasCur ? fv(curPrice) : "—"}</span>
          </div>
          <div class="token-totals">
            <span class="tsum-item"><span class="tsum-label">${_bgt("rpt_col_invested")}</span><span class="tsum-val">${fv(c.total_invested)}</span></span>
            <span class="tsum-sep">·</span>
            <span class="tsum-item"><span class="tsum-label">${_bgt("rpt_col_value")}</span><span class="tsum-val">${hasCur ? fv(c.cur_value) : "—"}</span></span>
            <span class="tsum-sep">·</span>
            <span class="tsum-item"><span class="tsum-label">${_bgt("rpt_col_pnl")}</span><span class="tsum-val ${pnlCls(c.pnl)}">${hasCur ? fv(c.pnl) : "—"}</span><span class="tsum-pct ${pnlCls(c.pnl_pct)}">${hasCur ? fp(c.pnl_pct) : ""}</span></span>
          </div>
        </div>
        <table><thead><tr>
          <th>${_bgt("rpt_col_date")}</th><th>${_bgt("rpt_col_type")}</th>
          <th class="r">${_bgt("rpt_col_qty")}</th><th class="r">${_bgt("rpt_col_price_paid")}</th><th class="r">${_bgt("rpt_col_total_paid")}</th>
          <th class="r">${_bgt("rpt_col_cur_val_trade")}</th><th class="r">${_bgt("rpt_col_pnl_trade")}</th><th class="r">${_bgt("rpt_col_pnl_pct")}</th>
        </tr></thead><tbody>`;

      for (const tr of trades) {
        const isSell    = tr.qty < 0;
        const absQty    = Math.abs(tr.qty);
        const totalPaid = absQty * tr.price_paid;
        let tradeVal = "—", tradePnl = "—", tradePct = "—", tradePnlCls = "neu";
        if (!isSell && hasCur) {
          const cv  = absQty * curPrice;
          const pnl = cv - totalPaid;
          const pp  = totalPaid > 0 ? (pnl / totalPaid) * 100 : 0;
          tradeVal    = fv(cv);
          tradePnl    = fv(pnl);
          tradePct    = fp(pp);
          tradePnlCls = pnlCls(pnl);
        }
        body += `<tr>
          <td class="mono small">${esc(tr.date||"—")}</td>
          <td><span class="type-badge ${isSell?"badge-sell":"badge-buy"}">${isSell ? _bgt("rpt_badge_sell") : _bgt("rpt_badge_buy")}</span></td>
          <td class="r mono">${fq(absQty)}</td>
          <td class="r mono">${fv(tr.price_paid)}</td>
          <td class="r mono bold">${fv(isSell ? -totalPaid : totalPaid)}</td>
          <td class="r mono">${tradeVal}</td>
          <td class="r mono bold ${tradePnlCls}">${tradePnl}</td>
          <td class="r mono ${tradePnlCls}">${tradePct}</td>
        </tr>`;
      }
      body += `</tbody></table></div>`;
    }
  } else {
    body += `<p class="empty-note">${_bgt("rpt_share_trade_empty")}</p>`;
  }

  // ── assemble full document ──────────────────────────────────────────────────
  const lang = (typeof currentLang !== "undefined") ? currentLang : "pt";
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${_bgt("rpt_share_doc_title")}</title>
  <style>${css}</style>
</head>
<body>
  <div class="report-header">
    <div class="report-logo">CRYPTOAIO</div>
    <div class="report-meta">
      <div><strong>${_bgt("rpt_share_heading_full")} · ${cnyName}</strong></div>
      <div>${_bgt("rpt_generated_on")} ${ts}</div>
    </div>
  </div>

  ${body}

  <div class="report-footer">${_bgt("rpt_generated_by")} · ${ts} · ${_bgt("rpt_values_in")} ${cnyName}</div>

  <div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:8px">
    <button onclick="window.print()" style="background:#00c27c;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">${_bgt("rpt_save_pdf")}</button>
    <button onclick="try{window.parent.document.getElementById('share-report-overlay').remove()}catch(e){window.close()}" style="background:#eee;color:#555;border:none;border-radius:8px;padding:10px 16px;font-size:13px;cursor:pointer">✕ ${_bgt("rpt_close")}</button>
  </div>
</body>
</html>`;

  // Render report in an in-page fullscreen overlay (avoids popup blockers)
  const existing = document.getElementById("share-report-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "share-report-overlay";
  overlay.style.cssText = [
    "position:fixed","top:0","left:0","width:100%","height:100%",
    "background:#fff","z-index:99999","display:flex","flex-direction:column"
  ].join(";");

  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.cssText = "flex:1;border:none;width:100%;height:100%";
  iframe.onload = () => URL.revokeObjectURL(url);

  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  _backupSetStatus("", "");
}

// ─── Factory Reset ────────────────────────────────────────────────────────────

function factoryResetConfirm() {
  if (!confirm(_bgt("factory_reset_confirm"))) return;
  factoryReset();
}

async function factoryReset() {
  const el = document.getElementById("factory-reset-status");
  const setStatus = (type, msg) => {
    if (!el) return;
    el.className = "gist-status" + (type === "ok" ? " gist-status-ok" : type === "error" ? " gist-status-error" : "");
    el.textContent = msg;
  };

  setStatus("loading", _bgt("factory_reset_running"));

  try {
    // 1. Wipe server-side data files
    const r = await fetch("/api/data/reset", { method: "POST" });
    if (!r.ok) throw new Error("server reset failed");

    // 2. Wipe client-side localStorage (Mad AI, Gist, Widget, columns)
    const keysToRemove = [
      "madai_keys", "madai_active",
      "cryptoaio_gist_token", "cryptoaio_gist_id",
      "trackerColumns",
    ];
    // Remove all widget keys (w_*)
    Object.keys(localStorage)
      .filter(k => k.startsWith("w_"))
      .forEach(k => localStorage.removeItem(k));
    keysToRemove.forEach(k => localStorage.removeItem(k));

    setStatus("ok", _bgt("factory_reset_ok"));
    setTimeout(() => location.reload(), 1400);
  } catch (e) {
    console.error("[factoryReset]", e);
    setStatus("error", _bgt("factory_reset_err"));
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
