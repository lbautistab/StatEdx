/* StatEdx · sesión puntos: Análisis de patrones de puntos */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const RMAX = 0.25, NR = 50, NSIM = 39, MU = 8, KQ = 4;
  const rs = Array.from({ length: NR }, (_, i) => (i + 1) * RMAX / NR);
  const S = { proc: 'thomas', lam: 100, esc: 3, pts: [], L: null, env: {}, res: null };

  function poisson(m) { // Knuth para m pequeño, normal para m grande
    if (m > 60) return Math.max(0, Math.round(m + Math.sqrt(m) * randn()));
    const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1;
  }
  const sigma = () => 0.01 * S.esc, delta = () => 0.008 * S.esc;
  function csr(n) { return Array.from({ length: n }, () => [Math.random(), Math.random()]); }
  function generate() {
    if (S.proc === 'csr') return csr(poisson(S.lam));
    if (S.proc === 'thomas') {
      const s = sigma(), m = 3 * s, side = 1 + 2 * m, np = poisson(S.lam / MU * side * side), out = [];
      for (let i = 0; i < np; i++) {
        const px = -m + Math.random() * side, py = -m + Math.random() * side, k = poisson(MU);
        for (let j = 0; j < k; j++) { const x = px + s * randn(), y = py + s * randn(); if (x >= 0 && x <= 1 && y >= 0 && y <= 1) out.push([x, y]); }
      }
      return out;
    }
    const target = poisson(S.lam), d2 = delta() ** 2, out = [];
    for (let tries = 0; out.length < target && tries < 20000; tries++) {
      const x = Math.random(), y = Math.random();
      if (out.every(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 >= d2)) out.push([x, y]);
    }
    return out;
  }
  function Lfun(pts) {
    const n = pts.length, acc = new Float64Array(NR + 1);
    if (n < 2) return rs.map(() => 0);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = Math.abs(pts[i][0] - pts[j][0]), dy = Math.abs(pts[i][1] - pts[j][1]), d = Math.hypot(dx, dy);
      if (d > RMAX) continue;
      const k = Math.max(0, Math.ceil(d / RMAX * NR) - 1);
      acc[k] += 2 / ((1 - dx) * (1 - dy));
    }
    const L = []; let cum = 0;
    for (let k = 0; k < NR; k++) { cum += acc[k]; L.push(Math.sqrt(cum / (n * (n - 1)) / Math.PI) - rs[k]); }
    return L;
  }
  function envelope(n) {
    if (S.env[n]) return S.env[n];
    const lo = rs.map(() => Infinity), hi = rs.map(() => -Infinity);
    for (let s = 0; s < NSIM; s++) { const L = Lfun(csr(n)); L.forEach((v, k) => { lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); }); }
    return S.env[n] = { lo, hi };
  }
  function chi2p(x, k) { // aproximación de Wilson-Hilferty a la cola superior
    const a = 2 / (9 * k), zz = (Math.pow(x / k, 1 / 3) - (1 - a)) / Math.sqrt(a);
    return 1 - Phi(zz);
  }
  function analyze() {
    const pts = S.pts, n = pts.length;
    S.L = Lfun(pts);
    const env = envelope(n);
    // Clark-Evans sin corrección de borde
    let sd = 0;
    for (let i = 0; i < n; i++) { let m = Infinity; for (let j = 0; j < n; j++) if (i !== j) m = Math.min(m, (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2); sd += Math.sqrt(m); }
    const R = n > 1 ? (sd / n) / (0.5 / Math.sqrt(n)) : NaN;
    const cnt = new Array(KQ * KQ).fill(0);
    for (const [x, y] of pts) cnt[Math.min(KQ - 1, Math.floor(y * KQ)) * KQ + Math.min(KQ - 1, Math.floor(x * KQ))]++;
    const e = n / (KQ * KQ); const x2 = e > 0 ? cnt.reduce((s, c) => s + (c - e) ** 2 / e, 0) : 0;
    let above = [], below = [];
    S.L.forEach((v, k) => { if (v > env.hi[k]) above.push(rs[k]); else if (v < env.lo[k]) below.push(rs[k]); });
    S.res = { n, R, x2, p: chi2p(x2, KQ * KQ - 1), cnt, env, above, below };
  }
  function update() { S.pts = generate(); analyze(); draw(); }

  function draw() {
    if (!S.res) return;
    const { n, R, x2, p, cnt, env, above, below } = S.res;
    $('puntos-lam-v').textContent = S.lam;
    $('puntos-esc-name').textContent = S.proc === 'ssi' ? 'distancia mínima δ' : S.proc === 'thomas' ? 'σ del grupo' : 'sin efecto en CSR';
    $('puntos-esc-v').textContent = S.proc === 'ssi' ? fmt(delta(), 3) : S.proc === 'thomas' ? fmt(sigma(), 3) : '–';
    $('puntos-esc').disabled = S.proc === 'csr';
    $('puntos-n').textContent = n;
    $('puntos-R').textContent = isNaN(R) ? '–' : fmt(R, 2);
    $('puntos-x2').textContent = fmt(x2, 1);
    $('puntos-x2-l').textContent = 'X² cuadrantes · p ' + (p < 0.001 ? '< 0,001' : '≈ ' + fmt(p, 3));
    const rng = a => fmt(a[0], 2) + '–' + fmt(a[a.length - 1], 2);
    const up = above.length >= below.length && above.length;
    $('puntos-env-l').textContent = up ? 'L(r) − r sobre la banda en' : below.length ? 'L(r) − r bajo la banda en' : 'L(r) − r frente a la banda';
    $('puntos-env').textContent = up ? 'r ' + rng(above) : below.length ? 'r ' + rng(below) : 'dentro';
    $('puntos-head').textContent = S.proc === 'csr' ? 'Poisson homogéneo' : S.proc === 'thomas' ? `Thomas · κ = ${fmt(S.lam / MU, 1)}, μ = ${MU}` : 'inhibición secuencial (SSI)';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    let f = fit($('puntos-c-map'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const side = Math.min(w, h) - 20, x0 = (w - side) / 2, y0 = (h - side) / 2;
      // conteos de cuadrantes como sombreado tenue
      const e = n / (KQ * KQ), cs = side / KQ;
      for (let i = 0; i < KQ; i++) for (let j = 0; j < KQ; j++) {
        const c = cnt[i * KQ + j], dev = e > 0 ? (c - e) / Math.sqrt(e) : 0;
        ctx.fillStyle = dev > 0 ? hot : accent; ctx.globalAlpha = Math.min(.22, Math.abs(dev) * .05);
        ctx.fillRect(x0 + j * cs, y0 + side - (i + 1) * cs, cs, cs);
        ctx.globalAlpha = 1; ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
        ctx.fillText(c, x0 + (j + 1) * cs - 4, y0 + side - i * cs - 5);
      }
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let k = 0; k <= KQ; k++) { const t = Math.round(x0 + k * cs) + .5, u = Math.round(y0 + k * cs) + .5; ctx.beginPath(); ctx.moveTo(t, y0); ctx.lineTo(t, y0 + side); ctx.moveTo(x0, u); ctx.lineTo(x0 + side, u); ctx.stroke(); }
      ctx.fillStyle = accent;
      for (const [x, y] of S.pts) { ctx.beginPath(); ctx.arc(x0 + x * side, y0 + (1 - y) * side, 2.6, 0, Math.PI * 2); ctx.fill(); }
    }
    f = fit($('puntos-c-L'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 46, r: 12, t: 14, b: 28 };
      let ymax = 0.02; for (const v of S.L.concat(env.hi, env.lo.map(Math.abs))) ymax = Math.max(ymax, Math.abs(v));
      const step = ymax > 0.12 ? 0.05 : ymax > 0.05 ? 0.025 : 0.01;
      ymax = Math.ceil(ymax * 1.1 / step) * step;
      const X = r => pad.l + r / RMAX * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (v + ymax) / (2 * ymax) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = -ymax; v <= ymax + 1e-9; v += step) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let r = 0.05; r <= RMAX + 1e-9; r += 0.05) { const x = Math.round(X(r)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = .28; ctx.fillStyle = muted; ctx.beginPath();
      rs.forEach((r, k) => k ? ctx.lineTo(X(r), Y(env.hi[k])) : ctx.moveTo(X(r), Y(env.hi[k])));
      for (let k = NR - 1; k >= 0; k--) ctx.lineTo(X(rs[k]), Y(env.lo[k]));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      if (S.proc === 'ssi') { const x = Math.round(X(delta())) + .5; ctx.strokeStyle = hot; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = hot; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('δ', x + 4, pad.t + 12); }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      rs.forEach((r, k) => k ? ctx.lineTo(X(r), Y(S.L[k])) : ctx.moveTo(X(r), Y(S.L[k]))); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let r = 0; r <= RMAX + 1e-9; r += 0.05) ctx.fillText(fmt(r, 2), Math.min(Math.max(X(r), pad.l + 12), w - pad.r - 14), h - 9);
      ctx.textAlign = 'right';
      const dec = step < 0.025 ? 2 : 3;
      for (let v = -ymax; v <= ymax + 1e-9; v += step) ctx.fillText((v < -1e-9 ? '−' : '') + fmt(Math.abs(v), dec), pad.l - 6, Y(v) + 4);
    }
  }

  $('puntos-lam').addEventListener('input', e => { S.lam = +e.target.value; update(); });
  $('puntos-esc').addEventListener('input', e => { S.esc = +e.target.value; update(); });
  segBind('puntos-proc', b => { S.proc = b.dataset.p; update(); });
  $('puntos-again').addEventListener('click', () => { S.env = {}; update(); });

  M.draw['puntos'] = draw;
  M.init.push(update);
})();
