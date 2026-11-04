/* StatEdx · sesión posicion: Medidas de posición */
(() => {
  const { fit, tok, fmt, randn, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);

  // ---------- laboratorio: percentiles, rango percentil y puntuaciones z ----------
  const N = 40;
  const P = { d: 'notas', p: 75, i: 30, xs: [] };
  const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };
  function gen() {
    if (P.d === 'notas') P.xs = Array.from({ length: N }, () => Math.min(20, Math.max(2, Math.round((13 + 3 * randn()) * 2) / 2)));
    else P.xs = Array.from({ length: N }, () => Math.round(-6 * Math.log(1 - Math.random()) * 10 + 5) / 10);
    P.xs.sort((a, b) => a - b);
  }
  function stats() {
    const s = P.xs, n = s.length, mean = s.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const q1 = q7(s, .25), med = q7(s, .5), q3 = q7(s, .75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    const wl = s.find(x => x >= lo), wh = [...s].reverse().find(x => x <= hi);
    return { s, n, mean, sd, q1, med, q3, iqr, lo, hi, wl, wh };
  }
  function draw() {
    const S = stats(), unit = P.d === 'notas' ? '' : ' min';
    const pv = q7(S.s, P.p / 100), x = S.s[P.i - 1];
    const below = S.s.filter(v => v < x).length, eq = S.s.filter(v => v === x).length;
    const rp = 100 * (below + eq / 2) / S.n, z = (x - S.mean) / S.sd;
    $('posicion-r-p').textContent = `P${P.p} = ${fmt(pv, 2)}${unit}`;
    $('posicion-r-x').textContent = fmt(x, 1) + unit;
    $('posicion-r-rp').textContent = fmt(rp, 1);
    $('posicion-r-z').textContent = (z < 0 ? '−' : '+') + fmt(Math.abs(z), 2);
    $('posicion-head').textContent = `media = ${fmt(S.mean, 1)} · s = ${fmt(S.sd, 1)} · RIC = ${fmt(S.iqr, 1)}`;
    $('posicion-unit').textContent = P.d === 'notas' ? 'Nota (0 a 20)' : 'Minutos de espera';

    const f = fit($('posicion-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--surface'), mono = tok('--f-mono');
    ctx.clearRect(0, 0, w, h);
    const lo = P.d === 'notas' ? 0 : 0, hiV = P.d === 'notas' ? 20 : Math.max(20, Math.ceil((S.s[S.n - 1] + 1) / 5) * 5);
    const pad = { l: 14, r: 18, t: 30, b: 26 };
    const X = v => pad.l + (v - lo) / (hiV - lo) * (w - pad.l - pad.r);
    const step = P.d === 'notas' ? (w < 480 ? 4 : 2) : (hiV > 40 ? (w < 480 ? 10 : 5) : 5);
    const boxY = h - pad.b - 30, boxH = 22, dotBase = boxY - boxH / 2 - 18;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = lo; v <= hiV + 1e-9; v += step) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t - 6); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // puntos apilados
    const r = Math.max(3, Math.min(5, (w - pad.l - pad.r) / 100));
    const placed = [];
    S.s.forEach((v, k) => {
      const xx = X(v); let lv = 0;
      while (placed.some(q => q.lv === lv && Math.abs(q.x - xx) < 2 * r + 1)) lv++;
      placed.push({ x: xx, lv });
      const y = dotBase - lv * (2 * r + 1) - r;
      ctx.beginPath(); ctx.arc(xx, y, k === P.i - 1 ? r + 1.5 : r, 0, Math.PI * 2);
      if (k === P.i - 1) { ctx.fillStyle = hot; ctx.fill(); }
      else if (v <= pv) { ctx.fillStyle = accent; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = muted; ctx.globalAlpha = .45; ctx.fill(); ctx.globalAlpha = 1; }
    });
    // línea del percentil
    const xp = Math.round(X(pv)) + .5;
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xp, pad.t - 4); ctx.lineTo(xp, boxY + boxH / 2 + 4); ctx.stroke();
    ctx.font = '600 12px ' + mono; ctx.fillStyle = accent;
    const lab = `P${P.p} = ${fmt(pv, 1)}`, tw = ctx.measureText(lab).width;
    ctx.textAlign = 'left'; ctx.fillText(lab, Math.max(2, Math.min(w - tw - 2, xp - tw / 2)), 14);
    // caja
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillStyle = accent; ctx.globalAlpha = .16; ctx.fillRect(X(S.q1), boxY - boxH / 2, X(S.q3) - X(S.q1), boxH); ctx.globalAlpha = 1;
    ctx.strokeRect(Math.round(X(S.q1)) + .5, boxY - boxH / 2 + .5, X(S.q3) - X(S.q1), boxH);
    ctx.beginPath(); ctx.moveTo(Math.round(X(S.med)) + .5, boxY - boxH / 2); ctx.lineTo(Math.round(X(S.med)) + .5, boxY + boxH / 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(S.wl), boxY); ctx.lineTo(X(S.q1), boxY); ctx.moveTo(X(S.q3), boxY); ctx.lineTo(X(S.wh), boxY);
    ctx.moveTo(X(S.wl), boxY - 6); ctx.lineTo(X(S.wl), boxY + 6); ctx.moveTo(X(S.wh), boxY - 6); ctx.lineTo(X(S.wh), boxY + 6);
    ctx.stroke();
    // cercas
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = ink; ctx.globalAlpha = .7;
    for (const c of [S.lo, S.hi]) if (c >= lo && c <= hiV) { const xx = Math.round(X(c)) + .5; ctx.beginPath(); ctx.moveTo(xx, boxY - boxH / 2 - 6); ctx.lineTo(xx, boxY + boxH / 2 + 6); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    S.s.filter(v => v < S.lo || v > S.hi).forEach(v => { ctx.beginPath(); ctx.arc(X(v), boxY, 3.5, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.stroke(); });
    // eje
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, lo, hiV, step, h - 8, muted);
  }
  const ps = $('posicion-p'), is = $('posicion-i');
  ps.addEventListener('input', () => { P.p = +ps.value; $('posicion-p-v').textContent = P.p; draw(); });
  is.addEventListener('input', () => { P.i = +is.value; $('posicion-i-v').textContent = P.i; draw(); });
  segBind('posicion-dat', b => { P.d = b.dataset.d; gen(); draw(); });
  $('posicion-again').addEventListener('click', () => { gen(); draw(); });
  gen();
  M.draw['posicion'] = draw;
  M.init.push(draw);
})();
