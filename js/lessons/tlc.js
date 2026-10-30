/* StatEdx · sesión tlc: El Teorema del Límite Central */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;

  // ---------- CLT simulator ----------
  const POPS = {
    exp:  { label: 'μ = 2 · σ = 2', mu: 2, sd: 2, lo: 0, hi: 12, gen: () => -Math.log(1 - Math.random()) * 2 },
    unif: { label: 'μ = 5 · σ ≈ 2,89', mu: 5, sd: 10 / Math.sqrt(12), lo: 0, hi: 10, gen: () => Math.random() * 10 },
    bim:  { label: 'μ = 5 · σ ≈ 3,10', mu: 5, sd: Math.sqrt(0.64 + 9), lo: -1, hi: 11, gen: () => (Math.random() < .5 ? 2 : 8) + randn() * 0.8 },
    dado: { label: 'μ = 3,5 · σ ≈ 1,71', mu: 3.5, sd: Math.sqrt(35 / 12), lo: 0.5, hi: 6.5, gen: () => 1 + Math.floor(Math.random() * 6) },
  };
  const S = { pop: 'exp', n: 5, K: 2000, popSample: null, means: null };
  function simulate() {
    const P = POPS[S.pop];
    S.popSample = Array.from({ length: 20000 }, P.gen);
    S.means = new Float64Array(S.K);
    for (let k = 0; k < S.K; k++) { let s = 0; for (let i = 0; i < S.n; i++) s += P.gen(); S.means[k] = s / S.n; }
    const m = S.means.reduce((a, b) => a + b, 0) / S.K;
    const sd = Math.sqrt(S.means.reduce((a, b) => a + (b - m) ** 2, 0) / (S.K - 1));
    document.getElementById('tlc-r-mu').textContent = fmt(P.mu, 3);
    document.getElementById('tlc-r-mbar').textContent = fmt(m, 3);
    document.getElementById('tlc-r-se').textContent = fmt(P.sd / Math.sqrt(S.n), 3);
    document.getElementById('tlc-r-sd').textContent = fmt(sd, 3);
    document.getElementById('tlc-pop-desc').textContent = P.label;
    drawCLT();
  }
  function histogram(canvasId, data, P, opts) {
    const cv = document.getElementById(canvasId); const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const muted = tok('--muted'), line = tok('--line'), ink = tok('--ink');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 12, r: 12, t: 14, b: 26 };
    const B = 48, bw = (P.hi - P.lo) / B, counts = new Array(B).fill(0);
    for (const v of data) { const i = Math.floor((v - P.lo) / bw); if (i >= 0 && i < B) counts[i]++; }
    const X = v => pad.l + (v - P.lo) / (P.hi - P.lo) * (w - pad.l - pad.r);
    let peak = Math.max(...counts);
    let curve = null;
    if (opts.normal) {
      const { m, s } = opts.normal; const scale = data.length * bw;
      curve = x => npdf(x, m, s) * scale;
      peak = Math.max(peak, curve(m));
    }
    const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
    // grid
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let g = 1; g <= 3; g++) { const y = Math.round(pad.t + (h - pad.t - pad.b) * g / 4) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.globalAlpha = .6; ctx.stroke(); ctx.globalAlpha = 1; }
    // bars
    ctx.fillStyle = opts.color;
    const px = (w - pad.l - pad.r) / B;
    counts.forEach((c, i) => { if (!c) return; const y = Y(c); ctx.globalAlpha = .9; ctx.fillRect(pad.l + i * px + .5, y, Math.max(px - 1, 1), h - pad.b - y); });
    ctx.globalAlpha = 1;
    if (curve) {
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = P.lo + (P.hi - P.lo) * i / 200; const y = Y(curve(x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
      ctx.stroke();
    }
    // mean marker
    ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(X(P.mu)) + .5, pad.t); ctx.lineTo(Math.round(X(P.mu)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    // axis
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    const step = (P.hi - P.lo) > 8 ? 2 : 1;
    for (let v = Math.ceil(P.lo); v <= P.hi; v += step) ctx.fillText(v, Math.min(Math.max(X(v), pad.l + 6), w - pad.r - 6), h - 8);
  }
  function drawCLT() {
    if (!S.means) return;
    const P = POPS[S.pop];
    histogram('tlc-c-pop', S.popSample, P, { color: tok('--muted') });
    histogram('tlc-c-means', S.means, P, { color: tok('--accent'), normal: { m: P.mu, s: P.sd / Math.sqrt(S.n) } });
  }
  document.getElementById('tlc-pop').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    S.pop = b.dataset.pop;
    document.querySelectorAll('#tlc-pop button').forEach(x => x.setAttribute('aria-pressed', x === b));
    simulate();
  });
  const nInput = document.getElementById('tlc-n');
  nInput.addEventListener('input', () => { S.n = +nInput.value; document.getElementById('tlc-n-val').textContent = S.n; simulate(); });
  document.getElementById('tlc-resample').addEventListener('click', simulate);

  // ---------- confidence intervals ----------
  const CI = { mu: 50, sigma: 10, n: 25, z: 1.96, c: 95, xs: [] };
  function newCI() { CI.xs = Array.from({ length: 50 }, () => CI.mu + randn() * CI.sigma / Math.sqrt(CI.n)); drawCI(); }
  function drawCI() {
    const cv = document.getElementById('tlc-c-ci'); const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 14, t: 12, b: 28 }, lo = 42, hi = 58;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const half = CI.z * CI.sigma / Math.sqrt(CI.n);
    const rowH = (h - pad.t - pad.b) / CI.xs.length;
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let v = 44; v <= 56; v += 2) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.globalAlpha = .55; ctx.stroke(); ctx.globalAlpha = 1; }
    let hit = 0;
    CI.xs.forEach((m, i) => {
      const ok = Math.abs(m - CI.mu) <= half; if (ok) hit++;
      const y = pad.t + rowH * (i + .5);
      ctx.strokeStyle = ok ? accent : hot; ctx.lineWidth = ok ? 2 : 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(Math.max(m - half, lo)), y); ctx.lineTo(X(Math.min(m + half, hi)), y); ctx.stroke();
      ctx.fillStyle = ok ? accent : hot; ctx.beginPath(); ctx.arc(X(m), y, 2.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.round(X(CI.mu)) + .5, pad.t - 4); ctx.lineTo(Math.round(X(CI.mu)) + .5, h - pad.b); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let v = 44; v <= 56; v += 2) ctx.fillText(v, X(v), h - 9);
    document.getElementById('tlc-ci-cover').textContent = `${hit} de 50 contienen a μ · esperado ${CI.c} %`;
    document.getElementById('tlc-ci-hit').textContent = `${hit} de 50 (${fmt(hit * 2, 0)} %)`;
    document.getElementById('tlc-ci-w').textContent = fmt(2 * half, 2);
  }
  document.getElementById('tlc-conf').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    CI.z = +b.dataset.z; CI.c = +b.dataset.c;
    document.querySelectorAll('#tlc-conf button').forEach(x => x.setAttribute('aria-pressed', x === b));
    drawCI();
  });
  document.getElementById('tlc-ci-again').addEventListener('click', newCI);


  // ---------- ley de los grandes números: trayectorias de la media acumulada ----------
  const LG = {
    dado: { mu: 3.5, sd: Math.sqrt(35 / 12), lo: 1, hi: 6, gen: () => 1 + Math.floor(Math.random() * 6), name: 'dado · μ = 3,5' },
    exp: { mu: 2, sd: 2, lo: 0, hi: 5, gen: () => -Math.log(1 - Math.random()) * 2, name: 'exponencial · μ = 2' },
    ber: { mu: 0.3, sd: Math.sqrt(0.21), lo: 0, hi: 1, gen: () => (Math.random() < 0.3 ? 1 : 0), name: 'Bernoulli · p = 0,3' },
    cau: { mu: 0, sd: null, lo: -5, hi: 5, gen: () => Math.tan(Math.PI * (Math.random() - 0.5)), name: 'Cauchy · sin media' },
  };
  const LGS = { d: 'dado', N: 2000, paths: [] };
  function lgnNew() {
    const P = LG[LGS.d];
    LGS.paths = Array.from({ length: 5 }, () => { const out = new Float64Array(LGS.N); let s = 0; for (let i = 0; i < LGS.N; i++) { s += P.gen(); out[i] = s / (i + 1); } return out; });
    const p0 = LGS.paths[0];
    document.getElementById('tlc-lgn-100').textContent = fmt(p0[99], 3);
    document.getElementById('tlc-lgn-end').textContent = fmt(p0[LGS.N - 1], 3);
    const errs = LGS.paths.map(p => Math.abs(p[LGS.N - 1] - P.mu));
    document.getElementById('tlc-lgn-err').textContent = fmt(Math.max(...errs), 3);
    document.getElementById('tlc-lgn-band').textContent = P.sd ? '± ' + fmt(2 * P.sd / Math.sqrt(LGS.N), 3) : 'no existe';
    document.getElementById('tlc-lgn-head').textContent = P.name;
    drawLGN();
  }
  function drawLGN() {
    if (!LGS.paths.length) return;
    const f = fit(document.getElementById('tlc-c-lgn')); if (!f) return; const { ctx, w, h } = f;
    const P = LG[LGS.d];
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 12, t: 12, b: 30 };
    const lx = Math.log10(LGS.N);
    const X = i => pad.l + Math.log10(i) / lx * (w - pad.l - pad.r);
    const Y = v => h - pad.b - (Math.max(P.lo, Math.min(P.hi, v)) - P.lo) / (P.hi - P.lo) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (const i of [1, 10, 100, 1000]) { if (i > LGS.N) continue; const x = Math.round(X(i)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    if (P.sd) {
      ctx.fillStyle = accent; ctx.globalAlpha = .12; ctx.beginPath();
      for (let i = 1; i <= LGS.N; i = Math.ceil(i * 1.05)) ctx.lineTo(X(i), Y(P.mu + 2 * P.sd / Math.sqrt(i)));
      for (let i = LGS.N; i >= 1; i = Math.floor(i / 1.05)) { ctx.lineTo(X(i), Y(P.mu - 2 * P.sd / Math.sqrt(i))); if (i === 1) break; }
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(P.mu)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(P.mu)) + .5); ctx.stroke(); ctx.setLineDash([]);
    LGS.paths.forEach((p, k) => {
      ctx.strokeStyle = k === 0 ? hot : accent; ctx.lineWidth = k === 0 ? 2 : 1.3; ctx.globalAlpha = k === 0 ? 1 : .7; ctx.beginPath();
      let last = -1;
      for (let i = 1; i <= LGS.N; i++) { const x = X(i); if (x - last < 0.7 && i < LGS.N) continue; last = x; const y = Y(p[i - 1]); i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (const i of [1, 10, 100, 1000]) if (i <= LGS.N) ctx.fillText(i, X(i), h - 14);
    ctx.fillText('n (escala logarítmica)', (pad.l + w - pad.r) / 2, h - 1);
    ctx.textAlign = 'right';
    const ticks = 4; for (let t = 0; t <= ticks; t++) { const v = P.lo + (P.hi - P.lo) * t / ticks; ctx.fillText(+v.toFixed(2), pad.l - 6, Y(v) + 4); }
  }
  document.getElementById('tlc-lgn-pop').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    LGS.d = b.dataset.d;
    document.querySelectorAll('#tlc-lgn-pop button').forEach(x => x.setAttribute('aria-pressed', x === b));
    lgnNew();
  });
  document.getElementById('tlc-lgn-new').addEventListener('click', lgnNew);

  M.draw.tlc = () => { drawCLT(); drawCI(); drawLGN(); };
  M.init.push(() => { simulate(); newCI(); lgnNew(); });
})();
