/* Muestra · clase 10, series de tiempo */
(() => {
  const $ = id => document.getElementById(id);
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0; while (!x) x = u(); const y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n };
  }
  const font = () => '11px ' + M.tok('--f-mono');
  const minus = s => String(s).replace('-', '−');
  function niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  }
  function acf(y, K) {
    const n = y.length, m = y.reduce((a, b) => a + b, 0) / n;
    let d = 0; for (const v of y) d += (v - m) ** 2;
    const r = [];
    for (let k = 1; k <= K; k++) { let s = 0; for (let t = k; t < n; t++) s += (y[t] - m) * (y[t - k] - m); r.push(d ? s / d : 0); }
    return r;
  }
  function pacf(r) { // Durbin-Levinson on r[0..K-1] = r_1..r_K
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
  const sd = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

  // shared bar chart for ACF / PACF
  function drawBars(cv, r, n, theo) {
    const f = M.fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const K = r.length, pad = { l: 40, r: 12, t: 12, b: 26 };
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
    r.forEach((v, i) => { const k = i + 1, out = Math.abs(v) > band;
      ctx.fillStyle = out ? hot : accent; ctx.globalAlpha = out ? 1 : .7;
      const y0 = Y(0), y1 = Y(Math.max(-1, Math.min(1, v)));
      ctx.fillRect(X(k) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); });
    ctx.globalAlpha = 1;
    if (theo) { ctx.fillStyle = ink; theo.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 2.6, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (const v of [-1, 0, 1]) ctx.fillText(minus(M.fmt(v, 0)), pad.l - 6, Y(v) + 4);
    ctx.textAlign = 'center';
    const step = K > 20 ? 6 : 5;
    for (let k = step; k <= K; k += step) ctx.fillText(k, X(k), h - 8);
    ctx.fillText(1, X(1), h - 8);
    return r.filter(v => Math.abs(v) > band).length;
  }

  // ================= simulator A: components + moving average + ACF =================
  const A = { tr: 1.5, amp: 25, sd: 8, k: 12, mode: 'add', seed: 5, z: [], n: 96 };
  const aNoise = () => { const r = rng(A.seed); A.z = Array.from({ length: A.n }, r.n); };
  function aSeries() {
    const y = [], trend = [];
    for (let t = 0; t < A.n; t++) {
      const L = 200 + A.tr * t, s = Math.sin(2 * Math.PI * t / 12);
      trend.push(L);
      y.push(A.mode === 'add' ? L + A.amp * s + A.sd * A.z[t] : L * (1 + A.amp / 200 * s) * (1 + A.sd / 200 * A.z[t]));
    }
    return { y, trend };
  }
  function movAvg(y, k) { // centered; 2×k for even k
    const n = y.length, out = new Array(n).fill(null);
    if (k === 1) return y.slice();
    const h = Math.floor(k / 2);
    for (let t = h; t < n - h; t++) {
      let s = 0;
      if (k % 2) { for (let j = -h; j <= h; j++) s += y[t + j]; out[t] = s / k; }
      else { for (let j = -h + 1; j <= h - 1; j++) s += y[t + j]; s += (y[t - h] + y[t + h]) / 2; out[t] = s / k; }
    }
    return out;
  }
  const aEls = { tr: $('ts-a-tr'), amp: $('ts-a-amp'), sd: $('ts-a-sd'), k: $('ts-a-k') };
  for (const key of Object.keys(aEls)) aEls[key].addEventListener('input', () => { A[key] = +aEls[key].value; aSync(); });
  M.segBind('ts-a-mode', b => { A.mode = b.dataset.m; aSync(); });
  $('ts-a-new').addEventListener('click', () => { A.seed = (A.seed * 7919 + 17) % 100003; aNoise(); aSync(); });
  let aState = null;
  function aSync() {
    $('ts-a-tr-v').textContent = M.fmt(A.tr, 1);
    $('ts-a-amp-v').textContent = A.amp;
    $('ts-a-sd-v').textContent = A.sd;
    $('ts-a-k-v').textContent = A.k;
    const { y, trend } = aSeries(), ma = movAvg(y, A.k), r = acf(y, 24);
    const res = []; y.forEach((v, t) => { if (ma[t] !== null) res.push(v - ma[t]); });
    aState = { y, trend, ma, r };
    $('ts-a-r1').textContent = minus(M.fmt(r[0], 2));
    $('ts-a-r12').textContent = minus(M.fmt(r[11], 2));
    $('ts-a-res').textContent = res.length > 2 ? M.fmt(sd(res), 1) : '–';
    $('ts-a-head').textContent = A.mode === 'add' ? 'y = T + S + ε' : 'y = T × S × ε';
    drawA();
  }
  function drawA() {
    if (!aState) return;
    const { y, trend, ma, r } = aState;
    const f = M.fit($('ts-c-a'));
    if (f) {
      const { ctx, w, h } = f;
      const accent = M.tok('--accent'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 12, t: 12, b: 26 };
      let lo = Math.min(...y), hi = Math.max(...y); const span = hi - lo || 1; lo -= span * .06; hi += span * .06;
      const step = niceStep(hi - lo, 4);
      const X = t => pad.l + t / (A.n - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v), pad.l - 6, yy + 4); }
      ctx.globalAlpha = .55;
      for (let yr = 1; yr < 8; yr++) { const x = Math.round(X(yr * 12)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // true trend
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.moveTo(X(0), Y(trend[0])); ctx.lineTo(X(A.n - 1), Y(trend[A.n - 1])); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // series
      ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.beginPath();
      y.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
      ctx.fillStyle = muted; y.forEach((v, t) => { ctx.beginPath(); ctx.arc(X(t), Y(v), 1.6, 0, Math.PI * 2); ctx.fill(); });
      // moving average
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.beginPath(); let started = false;
      ma.forEach((v, t) => { if (v === null) return; started ? ctx.lineTo(X(t), Y(v)) : (ctx.moveTo(X(t), Y(v)), started = true); }); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const every = (w - pad.l - pad.r) / 8 < 40 ? 2 : 1;
      for (let yr = 0; yr < 8; yr += every) ctx.fillText(2016 + yr, X(yr * 12 + 6), h - 8);
    }
    const out = drawBars($('ts-c-acf'), r, A.n, null);
    if (out !== undefined) $('ts-a-out').textContent = `${out} de 24`;
    else { const band = 1.96 / Math.sqrt(A.n); $('ts-a-out').textContent = `${r.filter(v => Math.abs(v) > band).length} de 24`; }
  }

  // ================= simulator B: AR(1) =================
  const B = { phi: 0.7, n: 300, fn: 'acf', seed: 21, z: [] };
  const bNoise = () => { const r = rng(B.seed); B.z = Array.from({ length: 300 }, r.n); };
  let bState = null;
  function bSync() {
    $('ts-b-phi-v').textContent = minus(M.fmt(B.phi, 2));
    const phi = B.phi, y = [], st = Math.abs(phi) < 1 - 1e-9;
    y.push(st ? B.z[0] / Math.sqrt(1 - phi * phi) : B.z[0]);
    for (let t = 1; t < B.n; t++) y.push(phi * y[t - 1] + B.z[t]);
    const K = 20, r = acf(y, K), p = pacf(r);
    const theoA = st ? Array.from({ length: K }, (_, i) => phi ** (i + 1)) : null;
    const theoP = st ? Array.from({ length: K }, (_, i) => i ? 0 : phi) : null;
    bState = { y, r, p, theoA, theoP };
    $('ts-b-r1').textContent = minus(M.fmt(r[0], 2));
    $('ts-b-rho').textContent = minus(M.fmt(phi, 2));
    $('ts-b-var').textContent = st ? M.fmt(1 / (1 - phi * phi), 2) : '∞';
    $('ts-b-vobs').textContent = M.fmt(sd(y) ** 2, 2);
    $('ts-b-head').textContent = st ? `yₜ = ${minus(M.fmt(phi, 2))}·yₜ₋₁ + εₜ · estacionaria` : 'paseo aleatorio · no estacionaria';
    $('ts-b-lab').textContent = `n = ${B.n}`;
    $('ts-b-ftitle').textContent = B.fn === 'acf' ? 'ACF estimada' : 'PACF estimada';
    drawB();
  }
  $('ts-b-phi').addEventListener('input', e => { B.phi = Math.min(1, +e.target.value); bSync(); });
  M.segBind('ts-b-n', b => { B.n = +b.dataset.n; bSync(); });
  M.segBind('ts-b-f', b => { B.fn = b.dataset.f; bSync(); });
  $('ts-b-new').addEventListener('click', () => { B.seed = (B.seed * 7919 + 31) % 100003; bNoise(); bSync(); });
  function drawB() {
    if (!bState) return;
    const { y, r, p, theoA, theoP } = bState;
    const f = M.fit($('ts-c-b'));
    if (f) {
      const { ctx, w, h } = f;
      const accent = M.tok('--accent'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 12, b: 26 };
      let lo = Math.min(...y, -3), hi = Math.max(...y, 3); const span = hi - lo; lo -= span * .05; hi += span * .05;
      const step = niceStep(hi - lo, 4);
      const X = t => pad.l + t / (B.n - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(minus(+v.toFixed(2)), pad.l - 6, yy + 4); }
      const st = Math.abs(B.phi) < 1 - 1e-9;
      if (st) { ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = accent; ctx.lineWidth = 1.4; ctx.beginPath();
      y.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const tstep = B.n > 150 ? 100 : 50;
      for (let t = 0; t <= B.n; t += tstep) ctx.fillText(t, X(Math.min(t, B.n - 1)), h - 8);
    }
    drawBars($('ts-c-bacf'), B.fn === 'acf' ? r : p, B.n, B.fn === 'acf' ? theoA : theoP);
  }

  M.draw['ts'] = () => { drawA(); drawB(); };
  M.init.push(() => { aNoise(); aSync(); bNoise(); bSync(); });
})();
