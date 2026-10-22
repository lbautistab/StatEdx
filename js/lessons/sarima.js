/* StatEdx · sesión sarima: Estacionalidad y modelos SARIMA */
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
  const sd = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

  function drawBars(cv, r, n, theo) {
    const f = fit(cv); if (!f) return 0; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const K = r.length, pad = { l: 36, r: 10, t: 10, b: 24 };
    const X = k => pad.l + (k - .5) / K * (w - pad.l - pad.r);
    const Y = v => pad.t + (1 - v) / 2 * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of [-1, -.5, .5, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    for (const k of [12, 24, 36]) { const x = Math.round(X(k)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const band = 1.96 / Math.sqrt(n);
    ctx.fillStyle = accent; ctx.globalAlpha = .08; ctx.fillRect(pad.l, Y(band), w - pad.l - pad.r, Y(-band) - Y(band)); ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.setLineDash([3, 3]);
    for (const v of [band, -band]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.setLineDash([]);
    const bw = Math.max(2, (w - pad.l - pad.r) / K * .55);
    let out = 0;
    r.forEach((v, i) => {
      const o = Math.abs(v) > band; if (o) out++;
      ctx.fillStyle = o ? hot : accent; ctx.globalAlpha = o ? 1 : .7;
      const y0 = Y(0), y1 = Y(Math.max(-1, Math.min(1, v)));
      ctx.fillRect(X(i + 1) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
    });
    ctx.globalAlpha = 1;
    if (theo) { ctx.fillStyle = ink; theo.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 2.4, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (const v of [-1, 0, 1]) ctx.fillText(minus(String(v)), pad.l - 6, Y(v) + 4);
    ctx.textAlign = 'center';
    for (const k of [1, 12, 24, 36]) ctx.fillText(k, X(k), h - 7);
    return out;
  }

  const N = 144, K = 36;
  const S = { th: -0.4, Th: -0.6, v: 3, seed: 17, z: [] };
  const noise = () => { const r = rng(S.seed); S.z = Array.from({ length: N + 13 }, r.n); };
  const TTL = ['Serie original yₜ', 'Diferencia normal ∇yₜ', 'Diferencia estacional ∇₁₂yₜ', 'Diferencia doble ∇∇₁₂yₜ'];
  let state = null;
  function sync() {
    for (const k of ['th', 'Th']) { $('sarima-' + k).value = S[k]; $('sarima-' + k + '-v').textContent = f2(S[k]); }
    const z = S.z.map(v => 1.6 * v), th = S.th, Th = S.Th;
    // w_t = ε_t + θε_{t−1} + Θε_{t−12} + θΘε_{t−13}
    const y = [];
    for (let t = 0; t < N; t++) {
      if (t < 13) { y.push(120 + 0.9 * t + 14 * Math.sin(2 * Math.PI * (t - 3) / 12) + 6 * Math.cos(4 * Math.PI * t / 12)); continue; }
      const e = i => z[i + 13];
      const w = e(t) + th * e(t - 1) + Th * e(t - 12) + th * Th * e(t - 13);
      y.push(y[t - 1] + y[t - 12] - y[t - 13] + w);
    }
    const d1 = a => a.slice(1).map((v, i) => v - a[i]);
    const d12 = a => a.slice(12).map((v, i) => v - a[i]);
    const views = [y, d1(y), d12(y), d1(d12(y))];
    const s = views[S.v], r = acf(s, K), p = pacf(r);
    let theoA = null, theoP = null;
    if (S.v === 3) {
      const c = new Array(14).fill(0); c[0] = 1; c[1] = th; c[12] = Th; c[13] = th * Th;
      const g = k => { let a = 0; for (let j = 0; j + k < c.length; j++) a += c[j] * c[j + k]; return a; };
      const g0 = g(0); theoA = []; for (let k = 1; k <= K; k++) theoA.push(k < 14 ? g(k) / g0 : 0);
      theoP = pacf(theoA);
    }
    state = { s, r, p, theoA, theoP };
    $('sarima-r1').textContent = f2(r[0]);
    $('sarima-r12').textContent = f2(r[11]);
    $('sarima-sd').textContent = fmt(sd(s), 2);
    $('sarima-ttl').textContent = TTL[S.v];
    $('sarima-n').textContent = 'n = ' + s.length;
    $('sarima-head').textContent = `MA(1): ${f2(th)} · MA₁₂: ${f2(Th)}`;
    draw();
  }
  for (const k of ['th', 'Th']) $('sarima-' + k).addEventListener('input', e => { S[k] = +e.target.value; sync(); });
  M.segBind('sarima-view', b => { S.v = +b.dataset.v; sync(); });
  $('sarima-new').addEventListener('click', () => { S.seed = (S.seed * 7919 + 23) % 100003; noise(); sync(); });

  function draw() {
    if (!state) return;
    const { s } = state;
    const f = fit($('sarima-c'));
    if (f) {
      const { ctx, w, h } = f;
      const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 12, t: 12, b: 24 }, off = N - s.length;
      let lo = Math.min(...s), hi = Math.max(...s); const span = hi - lo || 1; lo -= span * .06; hi += span * .06;
      const X = t => pad.l + (t + off) / (N - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      const step = niceStep(hi - lo, 4);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(minus(+v.toFixed(1)), pad.l - 6, yy + 4); }
      ctx.globalAlpha = .55;
      for (let yr = 1; yr < 12; yr++) { const x = Math.round(pad.l + (yr * 12 - .5) / (N - 1) * (w - pad.l - pad.r)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (S.v > 0 && lo < 0 && hi > 0) { ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.beginPath();
      s.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const every = w < 480 ? 3 : 2;
      for (let yr = 0; yr < 12; yr += every) ctx.fillText(1990 + yr, pad.l + (yr * 12 + 5.5) / (N - 1) * (w - pad.l - pad.r), h - 7);
    }
    const out = drawBars($('sarima-c-acf'), state.r, s.length, state.theoA);
    drawBars($('sarima-c-pacf'), state.p, s.length, state.theoP);
    $('sarima-out').textContent = `${out} de ${K}`;
  }

  M.draw['sarima'] = draw;
  M.init.push(() => { noise(); sync(); });
})();
