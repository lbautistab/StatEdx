/* StatEdx · sesión desc: Medidas de dispersión */
(() => {
  const { fit, tok, fmt, randn, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);

  // ---------- laboratorio: dispersión, bandas x̄ ± k·s y Chebyshev ----------
  const N = 60, MU = 250;
  const D = { sd: 4, f: 'normal', k: 2, z: [] };
  const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };
  // valores estandarizados de base; la dispersión solo los reescala
  function gen() {
    D.z = Array.from({ length: N }, (_, i) => {
      if (D.f === 'unif') return (Math.random() * 2 - 1) * Math.sqrt(3);
      if (D.f === 'atip' && i < 4) return -4.5 - 2.5 * Math.random();
      return randn();
    });
  }
  function data() { return D.z.map(z => Math.round((MU + D.sd * z) * 10) / 10).sort((a, b) => a - b); }
  function draw() {
    const xs = data(), n = xs.length;
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const q1 = q7(xs, .25), q3 = q7(xs, .75);
    const lo = mean - D.k * s, hi = mean + D.k * s;
    const inside = xs.filter(v => v > lo && v < hi).length;
    const cheb = Math.max(0, 1 - 1 / (D.k * D.k));
    $('desc-r-s').textContent = fmt(s, 2) + ' g';
    $('desc-r-iqr').textContent = fmt(q3 - q1, 2) + ' g';
    $('desc-r-cv').textContent = fmt(100 * s / mean, 2) + ' %';
    $('desc-r-in').textContent = fmt(100 * inside / n, 1) + ' %';
    $('desc-head').textContent = `rango = ${fmt(xs[n - 1] - xs[0], 1)} g · Chebyshev ≥ ${fmt(100 * cheb, 1)} %`;

    const f = fit($('desc-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), mono = tok('--f-mono');
    ctx.clearRect(0, 0, w, h);
    const span = Math.max(20, Math.ceil(Math.max(Math.abs(xs[0] - MU), Math.abs(xs[n - 1] - MU), 3.2 * s) / 10) * 10);
    const vlo = MU - span, vhi = MU + span;
    const pad = { l: 16, r: 16, t: 30, b: 26 };
    const X = v => pad.l + (v - vlo) / (vhi - vlo) * (w - pad.l - pad.r);
    const step = [5, 10, 20, 25, 50].find(st => (vhi - vlo) / st <= Math.max(4, Math.floor((w - 40) / 60))) || 50;
    const base = h - pad.b - 8;
    // rejilla
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = Math.ceil(vlo / step) * step; v <= vhi; v += step) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t - 6); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // banda
    ctx.fillStyle = accent; ctx.globalAlpha = .12; ctx.fillRect(X(lo), pad.t - 6, X(hi) - X(lo), base - pad.t + 6); ctx.globalAlpha = 1;
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    for (const b of [lo, hi]) { const xx = Math.round(X(b)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t - 6); ctx.lineTo(xx, base); ctx.stroke(); }
    // puntos apilados
    const r = Math.max(2.6, Math.min(4.5, (w - pad.l - pad.r) / 130));
    const placed = [];
    xs.forEach(v => {
      const xx = X(v); let lv = 0;
      while (placed.some(q => q.lv === lv && Math.abs(q.x - xx) < 2 * r + 1)) lv++;
      placed.push({ x: xx, lv });
      const y = base - lv * (2 * r + 1) - r;
      if (y < pad.t) return;
      ctx.beginPath(); ctx.arc(xx, y, r, 0, Math.PI * 2);
      ctx.fillStyle = v > lo && v < hi ? accent : hot; ctx.fill();
    });
    // media y cuartiles
    ctx.strokeStyle = ink; ctx.lineWidth = 2; const xm = Math.round(X(mean)) + .5;
    ctx.beginPath(); ctx.moveTo(xm, pad.t - 6); ctx.lineTo(xm, base); ctx.stroke();
    ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    for (const q of [q1, q3]) { const xx = Math.round(X(q)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t + 10); ctx.lineTo(xx, base); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.font = '600 12px ' + mono; ctx.textAlign = 'center';
    ctx.fillStyle = ink; ctx.fillText('media', xm, pad.t - 12);
    ctx.fillStyle = accent;
    const kl = `−${D.k}s`, kr = `+${D.k}s`;
    if (X(lo) > 14) ctx.fillText(kl, X(lo), pad.t - 12);
    if (X(hi) < w - 14) ctx.fillText(kr, X(hi), pad.t - 12);
    // eje
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, Math.ceil(vlo / step) * step, vhi, step, h - 8, muted);
  }
  const sdEl = $('desc-sd');
  sdEl.addEventListener('input', () => { D.sd = +sdEl.value; $('desc-sd-v').textContent = fmt(D.sd, D.sd % 1 ? 1 : 0); draw(); });
  segBind('desc-forma', b => { D.f = b.dataset.f; gen(); draw(); });
  segBind('desc-k', b => { D.k = +b.dataset.k; draw(); });
  $('desc-again').addEventListener('click', () => { gen(); draw(); });
  gen();
  M.draw['desc'] = draw;
  M.init.push(draw);
})();
