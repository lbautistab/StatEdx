/* StatEdx · clase 4, Teorema del Límite Central */
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
    document.getElementById('r-mu').textContent = fmt(P.mu, 3);
    document.getElementById('r-mbar').textContent = fmt(m, 3);
    document.getElementById('r-se').textContent = fmt(P.sd / Math.sqrt(S.n), 3);
    document.getElementById('r-sd').textContent = fmt(sd, 3);
    document.getElementById('pop-desc').textContent = P.label;
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
    histogram('c-pop', S.popSample, P, { color: tok('--muted') });
    histogram('c-means', S.means, P, { color: tok('--accent'), normal: { m: P.mu, s: P.sd / Math.sqrt(S.n) } });
  }
  document.getElementById('pop').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    S.pop = b.dataset.pop;
    document.querySelectorAll('#pop button').forEach(x => x.setAttribute('aria-pressed', x === b));
    simulate();
  });
  const nInput = document.getElementById('n');
  nInput.addEventListener('input', () => { S.n = +nInput.value; document.getElementById('n-val').textContent = S.n; simulate(); });
  document.getElementById('resample').addEventListener('click', simulate);

  // ---------- confidence intervals ----------
  const CI = { mu: 50, sigma: 10, n: 25, z: 1.96, c: 95, xs: [] };
  function newCI() { CI.xs = Array.from({ length: 50 }, () => CI.mu + randn() * CI.sigma / Math.sqrt(CI.n)); drawCI(); }
  function drawCI() {
    const cv = document.getElementById('c-ci'); const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
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
    document.getElementById('ci-cover').textContent = `${hit} de 50 contienen a μ · esperado ${CI.c} %`;
  }
  document.getElementById('conf').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    CI.z = +b.dataset.z; CI.c = +b.dataset.c;
    document.querySelectorAll('#conf button').forEach(x => x.setAttribute('aria-pressed', x === b));
    drawCI();
  });
  document.getElementById('ci-again').addEventListener('click', newCI);

  M.draw.tlc = () => { drawCLT(); drawCI(); };
  M.init.push(() => { simulate(); newCI(); });
})();
