/* StatEdx · sesión atipicos: Detección y tratamiento de valores atípicos */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const sg = (x, d = 2) => (x < -0.0005 ? '−' : '') + fmt(Math.abs(x), d);
  const mono = () => '11px ' + tok('--f-mono');

  // ---------- laboratorio 1: tres reglas ----------
  const NMAX = 300, KMAX = 15;
  const A = { rule: 'z', dist: 'norm', n: 40, k: 1, pos: 8, z: [], jo: [], jy: [] };
  function newSample() {
    A.z = Array.from({ length: NMAX }, randn);
    A.jo = Array.from({ length: KMAX }, randn);
    A.jy = Array.from({ length: NMAX + KMAX }, Math.random);
    draw1();
  }
  const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };
  function data() {
    const pts = [];
    for (let i = 0; i < A.n; i++) pts.push({ v: A.dist === 'norm' ? 200 + 20 * A.z[i] : 200 * Math.exp(0.35 * A.z[i]), j: A.jy[i] });
    for (let i = 0; i < A.k; i++) pts.push({ v: 200 + 20 * (A.pos + 0.3 * A.jo[i]), j: A.jy[NMAX + i], seed: true });
    return pts;
  }
  function limits(vals) {
    const s = vals.slice().sort((a, b) => a - b), n = s.length;
    const mean = s.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const me = q7(s, 0.5), mad = q7(s.map(v => Math.abs(v - me)).sort((a, b) => a - b), 0.5);
    let lo, hi;
    if (A.rule === 'z') { lo = mean - 3 * sd; hi = mean + 3 * sd; }
    else if (A.rule === 'iqr') { const q1 = q7(s, 0.25), q3 = q7(s, 0.75), r = q3 - q1; lo = q1 - 1.5 * r; hi = q3 + 1.5 * r; }
    else { const sc = 3.5 * mad / 0.6745; lo = me - sc; hi = me + sc; }
    return { lo, hi, mean, me, sd, mad };
  }
  function draw1() {
    if (!A.z.length) return;
    const pts = data(), L = limits(pts.map(p => p.v));
    let det = 0, fa = 0;
    for (const p of pts) { p.flag = p.v < L.lo || p.v > L.hi; if (p.flag) p.seed ? det++ : fa++; }
    $('atipicos-r-det').textContent = A.k ? det + ' / ' + A.k : '—';
    $('atipicos-r-fa').textContent = fa;
    $('atipicos-r-lim').textContent = '[' + Math.round(L.lo) + '; ' + Math.round(L.hi) + ']';
    $('atipicos-r-cen').textContent = Math.round(L.mean) + ' · ' + Math.round(L.me);
    const names = { z: 'media ± 3s', iqr: 'Q₁ − 1,5·RIC · Q₃ + 1,5·RIC', mad: 'Me ± 3,5·MAD/0,6745' };
    $('atipicos-head').textContent = 'límites: ' + names[A.rule];

    const f = fit($('atipicos-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 16, r: 16, t: 34, b: 30 };
    const vs = pts.map(p => p.v).concat([L.lo, L.hi]);
    let x0 = Math.min(...vs), x1 = Math.max(...vs); const xr = x1 - x0; x0 -= xr * 0.04; x1 += xr * 0.04;
    const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r);
    const raw = (x1 - x0) / Math.max(3, Math.floor((w - pad.l - pad.r) / 70)), mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= raw);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // zona aceptada
    ctx.fillStyle = accent; ctx.globalAlpha = .07; ctx.fillRect(X(L.lo), pad.t, X(L.hi) - X(L.lo), h - pad.t - pad.b); ctx.globalAlpha = 1;
    ctx.strokeStyle = hot; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    for (const v of [L.lo, L.hi]) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t - 4); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.setLineDash([]);
    // media y mediana
    const tri = (v, c, full, y) => { const x = X(v); ctx.beginPath(); ctx.moveTo(x - 5, y - 7); ctx.lineTo(x + 5, y - 7); ctx.lineTo(x, y); ctx.closePath(); if (full) { ctx.fillStyle = c; ctx.fill(); } else { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke(); } };
    tri(L.mean, ink, true, pad.t - 8); tri(L.me, ink, false, pad.t - 8);
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('▼ media  ▽ mediana', pad.l, 13);
    // puntos
    const band = h - pad.t - pad.b - 16, r = pts.length > 150 ? 3 : 4;
    for (const p of pts) {
      const x = X(p.v), y = pad.t + 8 + p.j * band;
      ctx.fillStyle = p.flag ? hot : accent; ctx.globalAlpha = p.flag ? 1 : .7;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if (p.seed) { ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) ctx.fillText(sg(v, step < 1 ? 1 : 0).replace(/(\d)(\d{3})$/, '$1 $2'), X(v), h - 10);
  }

  // ---------- laboratorio 2: Mahalanobis ----------
  const B = { x: 185, y: 55, r: 0.75, u: [], v: [] };
  const MU = [170, 70], SD = [9, 11];
  function draw2() {
    if (!B.u.length) { B.u = Array.from({ length: 200 }, randn); B.v = Array.from({ length: 200 }, randn); }
    const r = B.r, q = Math.sqrt(1 - r * r);
    const zx = (B.x - MU[0]) / SD[0], zy = (B.y - MU[1]) / SD[1];
    const d2 = (zx * zx - 2 * r * zx * zy + zy * zy) / (1 - r * r), p = Math.exp(-d2 / 2);
    $('atipicos-r-zx').textContent = sg(zx); $('atipicos-r-zy').textContent = sg(zy);
    $('atipicos-r-d2').textContent = fmt(d2, 1);
    $('atipicos-r-pd').textContent = p < 0.0001 ? '< 0,0001' : fmt(p, 4);
    const verdict = d2 > 13.82 ? 'fuera de la elipse del 99,9 %' : d2 > 7.38 ? 'fuera de la elipse del 97,5 %' : 'dentro de las elipses';
    $('atipicos-m-head').textContent = (Math.abs(zx) > 3 || Math.abs(zy) > 3 ? 'atípico univariado · ' : '') + verdict;

    const f = fit($('atipicos-maha')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14, t: 14, b: 30 }, xr = [135, 205], yr = [30, 110];
    const X = v => pad.l + (v - xr[0]) / (xr[1] - xr[0]) * (w - pad.l - pad.r), Y = v => h - pad.b - (v - yr[0]) / (yr[1] - yr[0]) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = 140; v <= 200; v += 10) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (let v = 40; v <= 110; v += 10) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    // rectángulo |z| <= 3
    ctx.strokeStyle = muted; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
    ctx.strokeRect(X(MU[0] - 3 * SD[0]), Y(MU[1] + 3 * SD[1]), X(MU[0] + 3 * SD[0]) - X(MU[0] - 3 * SD[0]), Y(MU[1] - 3 * SD[1]) - Y(MU[1] + 3 * SD[1]));
    ctx.setLineDash([]);
    // nube
    ctx.fillStyle = accent; ctx.globalAlpha = .55;
    for (let i = 0; i < 200; i++) { const a = B.u[i], b = r * B.u[i] + q * B.v[i]; ctx.beginPath(); ctx.arc(X(MU[0] + SD[0] * a), Y(MU[1] + SD[1] * b), 2.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // elipses
    for (const [c, lw] of [[7.38, 1.4], [13.82, 2]]) {
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.beginPath(); const s = Math.sqrt(c);
      for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 * Math.PI, a = s * Math.cos(t), b = s * (r * Math.cos(t) + q * Math.sin(t));
        const px = X(MU[0] + SD[0] * a), py = Y(MU[1] + SD[1] * b); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // persona destacada
    ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(B.x), Y(B.y), 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(B.x), Y(B.y), 11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    const xs = w < 420 ? 20 : 10;
    for (let v = 140; v <= 200; v += xs) ctx.fillText(v, X(v), h - 12);
    ctx.textAlign = 'right'; ctx.fillText('cm', w - pad.r, h - 1);
    for (let v = 40; v <= 100; v += 10) ctx.fillText(v, pad.l - 6, Y(v) + 4);
    ctx.textAlign = 'left'; ctx.fillText('kg', 4, pad.t + 2);
  }

  // ---------- controles ----------
  const nEl = $('atipicos-n'), kEl = $('atipicos-k'), pEl = $('atipicos-pos');
  nEl.addEventListener('input', () => { A.n = +nEl.value; $('atipicos-n-v').textContent = A.n; draw1(); });
  kEl.addEventListener('input', () => { A.k = +kEl.value; $('atipicos-k-v').textContent = A.k; draw1(); });
  pEl.addEventListener('input', () => { A.pos = +pEl.value; $('atipicos-pos-v').textContent = fmt(A.pos, A.pos % 1 ? 1 : 0); draw1(); });
  segBind('atipicos-rule', b => { A.rule = b.dataset.r; draw1(); });
  segBind('atipicos-dist', b => { A.dist = b.dataset.d; draw1(); });
  $('atipicos-again').addEventListener('click', newSample);
  for (const [id, key, d] of [['px', 'x', 0], ['py', 'y', 0], ['r', 'r', 2]]) {
    const el = $('atipicos-' + id);
    el.addEventListener('input', () => { B[key] = +el.value; $('atipicos-' + id + '-v').textContent = fmt(B[key], d); draw2(); });
  }

  M.draw['atipicos'] = () => { draw1(); draw2(); };
  M.init.push(() => { newSample(); draw2(); });
})();
