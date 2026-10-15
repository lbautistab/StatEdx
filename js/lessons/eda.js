/* Muestra · clase 11, análisis exploratorio de datos */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;

  // ---------- datos simulados (semilla fija) ----------
  function rng(seed) {
    return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const R = rng(20241);
  const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 400;
  const PRICE = [], NOISE = [], NA_A = [];
  for (let i = 0; i < N; i++) {
    let p = Math.exp(Math.log(150) + 0.48 * gauss());
    if (i % 57 === 3) p = 750 + R() * 950;          // unas pocas mansiones
    PRICE.push(Math.max(35, Math.round(p)));
    NOISE.push(gauss());
    NA_A.push(R() < 0.07);
  }

  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const sdev = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  function quant(a, p) { const s = [...a].sort((x, y) => x - y), h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * ((s[i + 1] ?? s[i]) - s[i]); }
  function skew(a) { const m = mean(a); let m2 = 0, m3 = 0; for (const x of a) { const d = x - m; m2 += d * d; m3 += d * d * d; } m2 /= a.length; m3 /= a.length; return m3 / m2 ** 1.5; }
  const TRUE_MEAN = mean(PRICE), TRUE_SD = sdev(PRICE);

  function frame(ctx, w, h, pad, peak, line, muted) {
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'right';
    const step = niceStep(peak / 4);
    for (let c = step; c <= peak + 1e-9; c += step) {
      const y = Math.round(h - pad.b - c / peak * (h - pad.t - pad.b)) + .5;
      ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillText(c, pad.l - 6, y + 4);
    }
  }
  function niceStep(x) { const p = 10 ** Math.floor(Math.log10(x)), f = x / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function vline(ctx, x, t, b, color, dash, lw = 1.5) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, t); ctx.lineTo(Math.round(x) + .5, b); ctx.stroke(); ctx.setLineDash([]); }

  // ---------- simulador 1: histograma ----------
  const H = { bins: 20, scale: 'lin' };
  function drawHist() {
    const obs = PRICE.filter((_, i) => !NA_A[i]);
    const isLog = H.scale === 'log';
    const vals = isLog ? obs.map(Math.log10) : obs;
    const q1 = quant(vals, .25), q3 = quant(vals, .75), ric = q3 - q1, lo_f = q1 - 1.5 * ric, hi_f = q3 + 1.5 * ric;
    const nOut = vals.filter(v => v < lo_f || v > hi_f).length;
    const m = mean(vals), med = quant(vals, .5), g1 = skew(vals);
    const back = v => isLog ? 10 ** v : v;
    document.getElementById('eda-r-mean-l').textContent = isLog ? 'media geométrica' : 'media';
    document.getElementById('eda-r-mean').textContent = fmt(back(m), 1);
    document.getElementById('eda-r-med').textContent = fmt(back(med), 1);
    document.getElementById('eda-r-skew').textContent = fmt(g1, 2);
    document.getElementById('eda-r-na').textContent = pct(1 - obs.length / N, 1);
    document.getElementById('eda-h-head').textContent = `${nOut} atípicos por RIC`;
    document.getElementById('eda-h-xlab').textContent = isLog ? 'Precio (miles de USD, escala log)' : 'Precio (miles de USD)';

    const f = fit(document.getElementById('eda-hist')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 38, r: 14, t: 16, b: 28 };
    const lo = isLog ? Math.log10(30) : 0, hi = isLog ? Math.log10(2500) : 1800;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const bw = (hi - lo) / H.bins, counts = new Array(H.bins).fill(0);
    for (const v of vals) counts[Math.min(H.bins - 1, Math.max(0, Math.floor((v - lo) / bw)))]++;
    const peak = Math.max(...counts) * 1.08;
    const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
    frame(ctx, w, h, pad, peak, line, muted);
    const px = (w - pad.l - pad.r) / H.bins;
    counts.forEach((c, i) => {
      if (!c) return;
      const center = lo + (i + .5) * bw, out = center < lo_f || center > hi_f;
      ctx.fillStyle = out ? hot : accent; ctx.globalAlpha = out ? .95 : .8;
      ctx.fillRect(pad.l + i * px + .5, Y(c), Math.max(px - 1, 1), h - pad.b - Y(c));
    });
    ctx.globalAlpha = 1;
    vline(ctx, X(hi_f), pad.t, h - pad.b, hot, [2, 3], 1);
    if (lo_f > lo) vline(ctx, X(lo_f), pad.t, h - pad.b, hot, [2, 3], 1);
    vline(ctx, X(m), pad.t - 6, h - pad.b, ink, [], 2);
    vline(ctx, X(med), pad.t - 6, h - pad.b, ink, [4, 3], 1.5);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    const ticks = isLog ? [50, 100, 200, 500, 1000, 2000] : (w < 520 ? [0, 400, 800, 1200, 1600] : [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]);
    for (const t of ticks) { const x = X(isLog ? Math.log10(t) : t); ctx.fillText(t, Math.min(Math.max(x, pad.l + 8), w - pad.r - 14), h - 9); }
  }
  const binsEl = document.getElementById('eda-bins');
  binsEl.addEventListener('input', () => { H.bins = +binsEl.value; document.getElementById('eda-bins-v').textContent = H.bins; drawHist(); });
  segBind('eda-scale', b => { H.scale = b.dataset.s; drawHist(); });

  // ---------- simulador 2: imputación ----------
  const I = { pm: 25, mech: 'mcar', strat: 'drop' };
  const LOGZ = PRICE.map(p => (Math.log(p) - Math.log(150)) / 0.48);
  function missingMask() {
    const score = PRICE.map((_, i) => I.mech === 'mcar' ? NOISE[i] : LOGZ[i] + 0.8 * NOISE[i]);
    const k = Math.round(N * I.pm / 100);
    const order = score.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]);
    const miss = new Array(N).fill(false);
    for (let j = 0; j < k; j++) miss[order[j][1]] = true;
    return miss;
  }
  function drawImp() {
    const miss = missingMask();
    const obs = PRICE.filter((_, i) => !miss[i]);
    let vals = obs, imp = [];
    if (I.strat !== 'drop' && obs.length < N) {
      const fill = I.strat === 'mean' ? mean(obs) : quant(obs, .5);
      imp = new Array(N - obs.length).fill(fill);
      vals = obs.concat(imp);
    }
    const m = mean(vals), s = sdev(vals), err = m - TRUE_MEAN;
    document.getElementById('eda-i-n').textContent = vals.length + ' de ' + N;
    document.getElementById('eda-i-mean').textContent = fmt(m, 1);
    document.getElementById('eda-i-sd').textContent = fmt(s, 1);
    document.getElementById('eda-i-err').textContent = (err > 0 ? '+' : err < 0 ? '−' : '') + fmt(Math.abs(err), 1);
    document.getElementById('eda-i-head').textContent = `real: media ${fmt(TRUE_MEAN, 0)} · s ${fmt(TRUE_SD, 0)}`;

    const f = fit(document.getElementById('eda-imp')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 38, r: 14, t: 16, b: 28 }, lo = 0, hi = 800, B = 32, bw = (hi - lo) / B;
    const bin = v => Math.min(B - 1, Math.max(0, Math.floor((v - lo) / bw)));
    const cObs = new Array(B).fill(0), cImp = new Array(B).fill(0), cAll = new Array(B).fill(0);
    obs.forEach(v => cObs[bin(v)]++); imp.forEach(v => cImp[bin(v)]++); PRICE.forEach(v => cAll[bin(v)]++);
    const peak = Math.max(...cAll.map(x => x), ...cObs.map((x, i) => x + cImp[i])) * 1.08;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
    frame(ctx, w, h, pad, peak, line, muted);
    const px = (w - pad.l - pad.r) / B;
    for (let i = 0; i < B; i++) {
      const x0 = pad.l + i * px + .5, bwpx = Math.max(px - 1, 1);
      if (cObs[i]) { ctx.fillStyle = accent; ctx.globalAlpha = .75; ctx.fillRect(x0, Y(cObs[i]), bwpx, h - pad.b - Y(cObs[i])); }
      if (cImp[i]) { ctx.fillStyle = hot; ctx.globalAlpha = .95; ctx.fillRect(x0, Y(cObs[i] + cImp[i]), bwpx, Y(cObs[i]) - Y(cObs[i] + cImp[i])); }
    }
    ctx.globalAlpha = 1;
    // histograma completo (la verdad) como escalera
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Y(0));
    for (let i = 0; i < B; i++) { ctx.lineTo(pad.l + i * px, Y(cAll[i])); ctx.lineTo(pad.l + (i + 1) * px, Y(cAll[i])); }
    ctx.lineTo(w - pad.r, Y(0)); ctx.stroke();
    vline(ctx, X(TRUE_MEAN), pad.t - 6, h - pad.b, ink, [4, 3], 1.5);
    vline(ctx, X(m), pad.t - 6, h - pad.b, ink, [], 2);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    const ticks = w < 520 ? [0, 200, 400, 600, 800] : [0, 100, 200, 300, 400, 500, 600, 700, 800];
    for (const t of ticks) ctx.fillText(t === 800 ? '800+' : t, Math.min(Math.max(X(t), pad.l + 8), w - pad.r - 14), h - 9);
  }
  const pmEl = document.getElementById('eda-pm');
  pmEl.addEventListener('input', () => { I.pm = +pmEl.value; document.getElementById('eda-pm-v').textContent = I.pm; drawImp(); });
  segBind('eda-mech', b => { I.mech = b.dataset.m; drawImp(); });
  segBind('eda-strat', b => { I.strat = b.dataset.s; drawImp(); });

  M.draw['eda'] = () => { drawHist(); drawImp(); };
  M.init.push(() => { drawHist(); drawImp(); });
})();
