/* StatEdx · sesión superv: Conceptos de análisis de supervivencia */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + tok('--f-mono');
  // generador reproducible (mulberry32): la sesión abre siempre con los mismos datos
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
  function kmMedian(ys, ds) {
    const idx = ys.map((_, i) => i).sort((i, j) => ys[i] - ys[j] || ds[j] - ds[i]);
    let atRisk = ys.length, S = 1, k = 0;
    while (k < idx.length) {
      const t = ys[idx[k]]; let d = 0, c = 0;
      while (k < idx.length && ys[idx[k]] === t) { ds[idx[k]] ? d++ : c++; k++; }
      if (d) { S *= 1 - d / atRisk; if (S <= 0.5) return t; }
      atRisk -= d + c;
    }
    return NaN;
  }
  function grid(ctx, X, Y, xs, ys, l, r, t, b) {
    ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of xs) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, b); ctx.stroke(); }
    for (const v of ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ================= simulador A: censura por la derecha =================
  const TRUE_MED = 20 * Math.pow(Math.log(2), 1 / 0.8);
  const CS = { view: 'cal', drop: 0, seed: 3, subj: [], anim: 1, raf: 0 };
  function csData() {
    const r = rng(CS.seed); CS.subj = [];
    for (let i = 0; i < 400; i++) {
      const entry = 12 * r(), T = 20 * Math.pow(-Math.log(1 - r()), 1 / 0.8), uD = r();
      CS.subj.push({ entry, T, uD });
    }
  }
  function csCompute() {
    const rate = CS.drop / 100;
    for (const s of CS.subj) {
      const D = rate > 0 ? -Math.log(1 - s.uD) / rate : Infinity;
      const C = Math.min(24 - s.entry, D);
      s.y = Math.min(s.T, C); s.d = s.T <= C ? 1 : 0;
    }
  }
  function csSync() {
    csCompute();
    $('superv-cs-drop-v').textContent = fmt(CS.drop, 1);
    const ys = CS.subj.map(s => s.y), ds = CS.subj.map(s => s.d);
    const nc = ds.filter(d => !d).length;
    $('superv-cs-cens').textContent = pct(nc / ds.length, 0);
    $('superv-cs-true').textContent = fmt(TRUE_MED, 1) + ' m';
    $('superv-cs-drop-m').textContent = fmt(median(ys.filter((_, i) => ds[i])), 1) + ' m';
    $('superv-cs-asev').textContent = fmt(median(ys), 1) + ' m';
    const km = kmMedian(ys, ds);
    $('superv-cs-head').textContent = 'n = 400 · Kaplan-Meier ≈ ' + (isFinite(km) ? fmt(km, 1) + ' m' : 'no alcanzada');
    drawCS();
  }
  $('superv-cs-drop').addEventListener('input', e => { CS.drop = +e.target.value; csSync(); });
  $('superv-cs-new').addEventListener('click', () => { CS.seed = (CS.seed * 7919 + 17) % 100003; csData(); csSync(); });
  segBind('superv-cs-view', b => {
    CS.view = b.dataset.v;
    const goal = CS.view === 'cal' ? 1 : 0, from = CS.anim, t0 = performance.now();
    cancelAnimationFrame(CS.raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { CS.anim = goal; drawCS(); return; }
    const step = now => {
      if (M.current !== 'superv') { CS.anim = goal; return; }
      const u = Math.min(1, (now - t0) / 450), e = u * u * (3 - 2 * u);
      CS.anim = from + (goal - from) * e; drawCS();
      if (u < 1) CS.raf = requestAnimationFrame(step);
    };
    CS.raf = requestAnimationFrame(step);
  });
  function drawCS() {
    const f = fit($('superv-c-cs')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 16, t: 22, b: 34 };
    const X = v => pad.l + v / 26 * (w - pad.l - pad.r);
    const show = CS.subj.slice(0, 30).sort((a, b) => a.entry - b.entry);
    const rowH = (h - pad.t - pad.b) / show.length;
    grid(ctx, X, v => v, [0, 6, 12, 18, 24], [], pad.l, w - pad.r, pad.t - 6, h - pad.b);
    // ventana de entrada y cierre (se desvanecen en la vista de seguimiento)
    ctx.globalAlpha = .10 * CS.anim; ctx.fillStyle = accent; ctx.fillRect(X(0), pad.t - 6, X(12) - X(0), h - pad.b - pad.t + 6);
    ctx.globalAlpha = CS.anim; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
    ctx.fillText('entradas', X(6), pad.t - 9);
    ctx.strokeStyle = ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(Math.round(X(24)) + .5, pad.t - 6); ctx.lineTo(Math.round(X(24)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText('cierre', X(24) - 4, pad.t - 9);
    ctx.globalAlpha = 1;
    show.forEach((s, i) => {
      const y = pad.t + (i + .5) * rowH, x0 = X(s.entry * CS.anim), x1 = X(s.entry * CS.anim + s.y);
      ctx.strokeStyle = s.d ? accent : muted; ctx.lineWidth = Math.max(1.5, Math.min(3, rowH * .35)); ctx.globalAlpha = s.d ? .9 : .7;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.globalAlpha = 1;
      const r = Math.max(2.5, Math.min(4, rowH * .38));
      ctx.beginPath(); ctx.arc(x1, y, r, 0, Math.PI * 2);
      if (s.d) { ctx.fillStyle = hot; ctx.fill(); }
      else { ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke(); }
    });
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, 0, 24, 6, h - pad.b + 15, muted);
    ctx.textAlign = 'right'; ctx.fillText(CS.anim > .5 ? 'mes calendario' : 'meses desde la suscripción', w - pad.r, h - 4);
  }

  // ================= simulador B: riesgo y supervivencia =================
  const HZ = { shape: 'const', c: 1, t0: 12 };
  const SHAPES = {
    const: { h: t => 0.055, H: t => 0.055 * t, name: 'exponencial · h = 0,055' },
    up: { h: t => (2 / 16) * (t / 16), H: t => Math.pow(t / 16, 2), name: 'Weibull · forma 2' },
    down: { h: t => (0.6 / 18) * Math.pow(Math.max(t, 1e-3) / 18, -0.4), H: t => Math.pow(t / 18, 0.6), name: 'Weibull · forma 0,6' },
    tub: { h: t => 0.12 * Math.exp(-t / 2) + 0.012 + 0.00006 * t * t, H: t => 0.24 * (1 - Math.exp(-t / 2)) + 0.012 * t + 0.00002 * t * t * t, name: 'bañera' },
  };
  const hF = t => HZ.c * SHAPES[HZ.shape].h(t), HF = t => HZ.c * SHAPES[HZ.shape].H(t), SF = t => Math.exp(-HF(t));
  function hzMedian() {
    if (HF(36) < Math.LN2) return NaN;
    let lo = 0, hi = 36; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; HF(m) < Math.LN2 ? lo = m : hi = m; }
    return (lo + hi) / 2;
  }
  function hzSync() {
    $('superv-hz-c-v').textContent = fmt(HZ.c, 2);
    $('superv-hz-t-v').textContent = HZ.t0;
    const t = HZ.t0, med = hzMedian();
    $('superv-hz-s').textContent = fmt(SF(t), 3);
    $('superv-hz-h').textContent = t === 0 && HZ.shape === 'down' ? '∞' : fmt(hF(t), 3);
    $('superv-hz-H').textContent = fmt(HF(t), 3);
    $('superv-hz-med').textContent = isFinite(med) ? fmt(med, 1) + ' meses' : '> 36 meses';
    $('superv-hz-head').textContent = SHAPES[HZ.shape].name + (HZ.c !== 1 ? ' · ×' + fmt(HZ.c, 2) : '');
    drawHZ();
  }
  $('superv-hz-c').addEventListener('input', e => { HZ.c = +e.target.value / 100; hzSync(); });
  $('superv-hz-t').addEventListener('input', e => { HZ.t0 = +e.target.value; hzSync(); });
  segBind('superv-hz-shape', b => { HZ.shape = b.dataset.s; hzSync(); });
  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
  function drawHZ() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    const pad = { l: 44, r: 12, t: 14, b: 30 };
    // --- riesgo ---
    let f = fit($('superv-c-hz'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      let mx = 0; for (let t = 0.5; t <= 36; t += 0.25) mx = Math.max(mx, hF(t));
      const top = niceMax(mx * 1.1);
      const X = v => pad.l + v / 36 * (w - pad.l - pad.r), Y = v => h - pad.b - Math.min(v, top) / top * (h - pad.t - pad.b);
      const yt = [0, top / 4, top / 2, 3 * top / 4, top];
      grid(ctx, X, Y, [0, 12, 24, 36], yt, pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, top / 2, top]) ctx.fillText(fmt(v, top < 0.1 ? 3 : 2), pad.l - 5, Y(v) + 4);
      // área acumulada H(t0)
      ctx.fillStyle = accent; ctx.globalAlpha = .25; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (let i = 0; i <= 200; i++) { const t = Math.max(0.02, HZ.t0 * i / 200); ctx.lineTo(X(t), Y(hF(t))); }
      ctx.lineTo(X(HZ.t0), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = Math.max(0.02, 36 * i / 300), y = Y(hF(t)); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
      ctx.stroke();
      ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.round(X(HZ.t0)) + .5, pad.t); ctx.lineTo(Math.round(X(HZ.t0)) + .5, h - pad.b); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, 36, 12, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
    // --- supervivencia ---
    f = fit($('superv-c-sv'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const X = v => pad.l + v / 36 * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      grid(ctx, X, Y, [0, 12, 24, 36], [0, .25, .5, .75, 1], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 5, Y(v) + 4);
      const med = hzMedian();
      ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(.5)) + .5); ctx.lineTo(isFinite(med) ? X(med) : w - pad.r, Math.round(Y(.5)) + .5);
      if (isFinite(med)) { ctx.lineTo(X(med), h - pad.b); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = 36 * i / 300, y = Y(SF(t)); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
      ctx.stroke();
      const px = X(HZ.t0), py = Y(SF(HZ.t0));
      ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.round(px) + .5, py); ctx.lineTo(Math.round(px) + .5, h - pad.b); ctx.stroke();
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink; ctx.font = '600 12px ' + tok('--f-mono');
      ctx.textAlign = px > w - 90 ? 'right' : 'left';
      ctx.fillText(fmt(SF(HZ.t0), 2), px + (px > w - 90 ? -8 : 8), py - 8);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, 36, 12, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
  }

  M.draw.superv = () => { drawCS(); drawHZ(); };
  M.init.push(() => { csData(); csSync(); hzSync(); });
})();
