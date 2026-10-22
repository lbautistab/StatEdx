/* StatEdx · sesión arima: Modelos ARIMA */
(() => {
  const { fit, tok, fmt } = M;
  const $ = id => document.getElementById(id);
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0; while (!x) x = u(); const y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n };
  }
  const font = () => '11px ' + tok('--f-mono');
  const minus = s => String(s).replace(/-/g, '−');
  const f2 = v => minus(fmt(v, 2));
  function niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), r = raw / p;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  }
  function acf(y, K) {
    const n = y.length, m = y.reduce((a, b) => a + b, 0) / n;
    let d = 0; for (const v of y) d += (v - m) ** 2;
    const r = [];
    for (let k = 1; k <= K; k++) { let s = 0; for (let t = k; t < n; t++) s += (y[t] - m) * (y[t - k] - m); r.push(d ? s / d : 0); }
    return r;
  }
  function pacf(r) {
    const K = r.length, out = []; let prev = [];
    for (let k = 1; k <= K; k++) {
      let num = r[k - 1], den = 1;
      for (let j = 1; j < k; j++) { num -= prev[j - 1] * r[k - j - 1]; den -= prev[j - 1] * r[j - 1]; }
      const pkk = den ? num / den : 0, cur = [];
      for (let j = 1; j < k; j++) cur.push(prev[j - 1] - pkk * prev[k - j - 1]);
      cur.push(pkk); prev = cur; out.push(pkk);
    }
    return out;
  }
  function frame(ctx, w, h, pad, lo, hi, Y, fmtv) {
    const line = tok('--line'), muted = tok('--muted');
    const step = niceStep(hi - lo, 4);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillText(fmtv ? fmtv(v) : minus(+v.toFixed(2)), pad.l - 6, yy + 4);
    }
  }
  function drawBars(cv, r, n, theo) {
    const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const K = r.length, pad = { l: 36, r: 10, t: 10, b: 24 };
    const X = k => pad.l + (k - .5) / K * (w - pad.l - pad.r);
    const Y = v => pad.t + (1 - v) / 2 * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of [-1, -.5, .5, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const band = 1.96 / Math.sqrt(n);
    ctx.fillStyle = accent; ctx.globalAlpha = .08; ctx.fillRect(pad.l, Y(band), w - pad.l - pad.r, Y(-band) - Y(band)); ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.setLineDash([3, 3]);
    for (const v of [band, -band]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.setLineDash([]);
    const bw = Math.max(2, (w - pad.l - pad.r) / K * .55);
    r.forEach((v, i) => {
      if (!isFinite(v)) return;
      const out = Math.abs(v) > band;
      ctx.fillStyle = out ? hot : accent; ctx.globalAlpha = out ? 1 : .7;
      const y0 = Y(0), y1 = Y(Math.max(-1, Math.min(1, v)));
      ctx.fillRect(X(i + 1) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
    });
    ctx.globalAlpha = 1;
    if (theo) { ctx.fillStyle = ink; theo.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i + 1), Y(Math.max(-1, Math.min(1, v))), 2.6, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (const v of [-1, 0, 1]) ctx.fillText(minus(String(v)), pad.l - 6, Y(v) + 4);
    ctx.textAlign = 'center';
    ctx.fillText(1, X(1), h - 7);
    for (let k = 5; k <= K; k += 5) ctx.fillText(k, X(k), h - 7);
  }
  function linePlot(cv, y, opts = {}) {
    const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 10, t: 12, b: 24 };
    const fin = y.filter(isFinite);
    let lo = Math.min(...fin), hi = Math.max(...fin); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    if (opts.clip) { lo = Math.max(lo, -opts.clip); hi = Math.min(hi, opts.clip); }
    const span = hi - lo; lo -= span * .06; hi += span * .06;
    const X = t => pad.l + t / (y.length - 1) * (w - pad.l - pad.r);
    const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
    frame(ctx, w, h, pad, lo, hi, Y);
    if (lo < 0 && hi > 0) { ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = opts.color || accent; ctx.lineWidth = 1.4; ctx.beginPath(); let st = false;
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip(); ctx.beginPath();
    y.forEach((v, t) => { if (!isFinite(v)) { st = false; return; } st ? ctx.lineTo(X(t), Y(v)) : (ctx.moveTo(X(t), Y(v)), st = true); }); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
    for (let t = 0; t <= y.length; t += 50) ctx.fillText(t, X(Math.min(t, y.length - 1)), h - 7);
  }

  // ================= Lab A: ARMA(2,1) =================
  const NA = 200, BURN = 100, KA = 20;
  const A = { p1: 0.5, p2: 0.25, th: 0, seed: 7, z: [] };
  const aNoise = () => { const r = rng(A.seed); A.z = Array.from({ length: NA + BURN }, r.n); };
  const stationary = (p1, p2) => p1 + p2 < 1 - 1e-9 && p2 - p1 < 1 - 1e-9 && Math.abs(p2) < 1 - 1e-9;
  function roots(p1, p2) { // raíces de 1 − φ1 z − φ2 z²
    if (Math.abs(p2) < 1e-12) return Math.abs(p1) < 1e-12 ? { min: Infinity, complex: false } : { min: Math.abs(1 / p1), complex: false };
    const disc = p1 * p1 + 4 * p2;
    if (disc < 0) return { min: Math.sqrt(-1 / p2), complex: true };
    const r1 = (-p1 + Math.sqrt(disc)) / (2 * p2), r2 = (-p1 - Math.sqrt(disc)) / (2 * p2);
    return { min: Math.min(Math.abs(r1), Math.abs(r2)), complex: false };
  }
  function psiArma(phi, theta, J) {
    const psi = [1];
    for (let j = 1; j <= J; j++) {
      let v = theta[j - 1] || 0;
      for (let i = 1; i <= phi.length; i++) if (j - i >= 0) v += phi[i - 1] * psi[j - i];
      psi.push(v);
    }
    return psi;
  }
  let aState = null;
  function aSync() {
    for (const k of ['p1', 'p2', 'th']) { $('arima-' + k).value = A[k]; $('arima-' + k + '-v').textContent = f2(A[k]); }
    const st = stationary(A.p1, A.p2), z = A.z;
    const y = [], burn = st ? BURN : 0;
    let y1 = 0, y2 = 0, e1 = 0;
    for (let t = BURN - burn; t < NA + BURN; t++) {
      const v = A.p1 * y1 + A.p2 * y2 + z[t] + A.th * e1;
      y2 = y1; y1 = v; e1 = z[t];
      if (t >= BURN) y.push(Math.abs(v) < 1e12 ? v : NaN);
    }
    const valid = []; for (const v of y) { if (!isFinite(v)) break; valid.push(v); }
    const r = acf(valid.length > KA + 5 ? valid : [0, 1, 0, 1, 0, 1].concat(valid), KA), p = pacf(r);
    let theoA = null, theoP = null;
    if (st) {
      const psi = psiArma([A.p1, A.p2], [A.th], 600);
      const g = k => { let s = 0; for (let j = 0; j + k < psi.length; j++) s += psi[j] * psi[j + k]; return s; };
      const g0 = g(0); theoA = []; for (let k = 1; k <= KA; k++) theoA.push(g(k) / g0);
      theoP = pacf(theoA);
    }
    const rt = roots(A.p1, A.p2);
    let boom = -1;
    if (!st) { boom = y.findIndex(v => !isFinite(v) || Math.abs(v) > 300); }
    const yShow = boom > 0 ? y.map((v, t) => t <= boom ? v : NaN) : y;
    aState = { y: yShow, r, p, theoA, theoP };
    $('arima-st').textContent = st ? 'sí' : 'no';
    $('arima-root').textContent = isFinite(rt.min) ? fmt(rt.min, 2) : '∞ (sin AR)';
    $('arima-r1').textContent = (theoA ? f2(theoA[0]) : '–') + ' · ' + f2(r[0]);
    if (rt.complex && st) { const per = 2 * Math.PI / Math.acos(A.p1 / (2 * Math.sqrt(-A.p2))); $('arima-cyc').textContent = '≈ ' + fmt(per, 1) + ' pasos'; }
    else $('arima-cyc').textContent = rt.complex ? 'raíces complejas' : 'raíces reales';
    const sg = v => (v < 0 ? ' − ' : ' + ') + fmt(Math.abs(v), 2);
    $('arima-head').textContent = `yₜ = ${f2(A.p1)}yₜ₋₁${sg(A.p2)}yₜ₋₂ + εₜ${sg(A.th)}εₜ₋₁`;
    $('arima-lbl').textContent = st ? 'n = 200' : boom > 0 ? `explota en t ≈ ${boom}` : 'n = 200 · no estacionaria';
    drawA();
  }
  for (const k of ['p1', 'p2', 'th']) $('arima-' + k).addEventListener('input', e => { A[k] = +e.target.value; clearPre(); aSync(); });
  const clearPre = () => document.querySelectorAll('#arima-pre button').forEach(b => b.setAttribute('aria-pressed', 'false'));
  M.segBind('arima-pre', b => { const [a, c, d] = b.dataset.p.split(',').map(Number); A.p1 = a; A.p2 = c; A.th = d; aSync(); });
  $('arima-new').addEventListener('click', () => { A.seed = (A.seed * 7919 + 29) % 100003; aNoise(); aSync(); });

  const TRI = { x0: -2.3, x1: 2.3, y0: -1.25, y1: 1.25, pad: { l: 34, r: 10, t: 10, b: 24 } };
  function triMap(w, h) {
    const { x0, x1, y0, y1, pad } = TRI;
    return { X: v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r), Y: v => pad.t + (y1 - v) / (y1 - y0) * (h - pad.t - pad.b),
      iX: px => x0 + (px - pad.l) / (w - pad.l - pad.r) * (x1 - x0), iY: py => y1 - (py - pad.t) / (h - pad.t - pad.b) * (y1 - y0) };
  }
  $('arima-c-tri').addEventListener('click', e => {
    const cv = e.currentTarget, rect = cv.getBoundingClientRect();
    const { iX, iY } = triMap(rect.width, rect.height);
    const q = v => Math.round(v * 20) / 20;
    A.p1 = Math.max(-2, Math.min(2, q(iX(e.clientX - rect.left))));
    A.p2 = Math.max(-1, Math.min(1, q(iY(e.clientY - rect.top))));
    clearPre(); aSync();
  });
  function drawTri() {
    const f = fit($('arima-c-tri')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const { X, Y } = triMap(w, h), pad = TRI.pad;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = -2; v <= 2; v++) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (const v of [-1, 0, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent; ctx.globalAlpha = .16; ctx.beginPath(); ctx.moveTo(X(-2), Y(-1)); ctx.lineTo(X(2), Y(-1)); ctx.lineTo(X(0), Y(1)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = ink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const a = -2 + 4 * i / 80, b = -a * a / 4; i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b)); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
    ctx.fillText('reales', X(0), Y(0.35));
    ctx.fillText('complejas', X(0), Y(-0.62));
    for (let v = -2; v <= 2; v++) ctx.fillText(minus(String(v)), X(v), h - 7);
    ctx.textAlign = 'right';
    for (const v of [-1, 0, 1]) ctx.fillText(minus(String(v)), pad.l - 6, Y(v) + 4);
    const st = stationary(A.p1, A.p2);
    ctx.fillStyle = st ? hot : tok('--bad'); ctx.strokeStyle = tok('--bg'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(A.p1), Y(A.p2), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function drawA() {
    if (!aState) return;
    drawTri();
    linePlot($('arima-c-y'), aState.y, { clip: 300 });
    drawBars($('arima-c-acf'), aState.r, NA, aState.theoA);
    drawBars($('arima-c-pacf'), aState.p, NA, aState.theoP);
  }

  // ================= Lab B: forecast fan =================
  const NB = 60, HB = 24;
  const B = { m: 'ar1', c: 0.8, seed: 3, z: [] };
  const RANGE = { ar1: [-0.9, 0.95, 'φ'], ma1: [-0.9, 0.9, 'θ'], i011: [-0.9, 0.9, 'θ'], i110: [-0.9, 0.9, 'φ'] };
  const TITLE = { ar1: 'AR(1)', ma1: 'MA(1)', i011: 'ARIMA(0,1,1)', i110: 'ARIMA(1,1,0)' };
  const bNoise = () => { const r = rng(B.seed); B.z = Array.from({ length: 200 }, r.n); };
  let bState = null;
  function bSync() {
    const [lo, hi, sym] = RANGE[B.m], el = $('arima-f-c');
    el.min = lo; el.max = hi; B.c = Math.max(lo, Math.min(hi, B.c)); el.value = B.c;
    $('arima-f-c-lab').innerHTML = `COEFICIENTE · ${sym} = <b id="arima-f-c-v" class="num">${f2(B.c)}</b>`;
    const z = B.z, c = B.c, T = z.length;
    // simulate stationary part w_t, then integrate if needed
    const w = []; let w1 = 0, e1 = 0;
    for (let t = 0; t < T; t++) {
      let v;
      if (B.m === 'ar1' || B.m === 'i110') v = c * w1 + z[t];
      else v = z[t] + c * e1;
      w.push(v); w1 = v; e1 = z[t];
    }
    const integ = B.m === 'i011' || B.m === 'i110';
    let y = w;
    if (integ) { y = []; let s = 0; for (const v of w) { s += v; y.push(s); } }
    const obs = y.slice(T - NB);
    // point forecasts
    const fc = [];
    const eT = z[T - 1];
    if (B.m === 'ar1') for (let h = 1; h <= HB; h++) fc.push(c ** h * w[T - 1]);
    else if (B.m === 'ma1') for (let h = 1; h <= HB; h++) fc.push(h === 1 ? c * eT : 0);
    else if (B.m === 'i011') for (let h = 1; h <= HB; h++) fc.push(y[T - 1] + c * eT);
    else { let lvl = y[T - 1], d = w[T - 1]; for (let h = 1; h <= HB; h++) { d = c * d; lvl += d; fc.push(lvl); } }
    // psi weights
    let psi = (B.m === 'ar1' || B.m === 'i110') ? psiArma([c], [], HB) : psiArma([], [c], HB);
    if (integ) { let s = 0; psi = psi.map(v => (s += v)); }
    const sh = []; let acc = 0; for (let h = 1; h <= HB; h++) { acc += psi[h - 1] ** 2; sh.push(Math.sqrt(acc)); }
    bState = { obs, fc, sh, psi };
    $('arima-s1').textContent = fmt(sh[0], 2);
    $('arima-s6').textContent = fmt(sh[5], 2);
    $('arima-s24').textContent = fmt(sh[23], 2);
    $('arima-sinf').textContent = integ ? '∞' : B.m === 'ar1' ? fmt(1 / Math.sqrt(1 - c * c), 2) : fmt(Math.sqrt(1 + c * c), 2);
    $('arima-f-head').textContent = `${TITLE[B.m]} · ${sym} = ${f2(c)} · σ = 1`;
    drawB();
  }
  $('arima-f-c').addEventListener('input', e => { B.c = +e.target.value; bSync(); });
  M.segBind('arima-f-m', b => { B.m = b.dataset.m; B.c = { ar1: 0.8, ma1: 0.6, i011: -0.5, i110: 0.5 }[B.m]; bSync(); });
  $('arima-f-new').addEventListener('click', () => { B.seed = (B.seed * 7919 + 41) % 100003; bNoise(); bSync(); });
  function drawB() {
    if (!bState) return;
    const { obs, fc, sh, psi } = bState;
    const f = fit($('arima-c-fan'));
    if (f) {
      const { ctx, w, h } = f;
      const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 12, b: 24 }, NT = NB + HB;
      const up95 = fc.map((v, i) => v + 1.96 * sh[i]), dn95 = fc.map((v, i) => v - 1.96 * sh[i]);
      const up80 = fc.map((v, i) => v + 1.2816 * sh[i]), dn80 = fc.map((v, i) => v - 1.2816 * sh[i]);
      let lo = Math.min(...obs, ...dn95), hi = Math.max(...obs, ...up95); const span = hi - lo; lo -= span * .04; hi += span * .04;
      const X = t => pad.l + t / (NT - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      frame(ctx, w, h, pad, lo, hi, Y);
      const band = (up, dn, a) => {
        ctx.fillStyle = accent; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(X(NB - 1), Y(obs[NB - 1]));
        up.forEach((v, i) => ctx.lineTo(X(NB + i), Y(v)));
        for (let i = HB - 1; i >= 0; i--) ctx.lineTo(X(NB + i), Y(dn[i]));
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      };
      band(up95, dn95, .14); band(up80, dn80, .22);
      ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; const xc = Math.round(X(NB - .5)) + .5;
      ctx.beginPath(); ctx.moveTo(xc, pad.t); ctx.lineTo(xc, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1.4; ctx.beginPath();
      obs.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(NB - 1), Y(obs[NB - 1]));
      fc.forEach((v, i) => ctx.lineTo(X(NB + i), Y(v))); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
      const narrow = w < 480;
      for (const t of narrow ? [0] : [0, 20, 40]) ctx.fillText('T' + minus(String(t - NB + 1)), X(t) + (t ? 0 : 12), h - 7);
      ctx.fillText('T', X(NB - 1), h - 7);
      for (const hh of narrow ? [24] : [12, 24]) ctx.fillText('T+' + hh, X(NB - 1 + hh) - (hh === 24 ? 14 : 0), h - 7);
    }
    const g = fit($('arima-c-psi'));
    if (g) {
      const { ctx, w, h } = g;
      const accent = tok('--accent'), muted = tok('--muted');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 10, b: 22 }, K = HB + 1;
      let lo = Math.min(0, ...psi), hi = Math.max(1, ...psi); const sp = hi - lo; hi += sp * .08; if (lo < 0) lo -= sp * .08;
      const X = j => pad.l + (j + .5) / K * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      frame(ctx, w, h, pad, lo, hi, Y);
      const bw = Math.max(2, (w - pad.l - pad.r) / K * .55);
      ctx.fillStyle = accent; ctx.globalAlpha = .8;
      psi.forEach((v, j) => { const y0 = Y(0), y1 = Y(v); ctx.fillRect(X(j) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
      for (let j = 0; j <= HB; j += 6) ctx.fillText(j, X(j), h - 6);
    }
  }

  M.draw['arima'] = () => { drawA(); drawB(); };
  M.init.push(() => { aNoise(); aSync(); bNoise(); bSync(); });
})();
