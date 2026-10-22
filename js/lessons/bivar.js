/* StatEdx · sesión bivar: Descriptiva bivariada: correlación y tablas cruzadas */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const sg = (x, d = 2) => (x < -0.0005 ? '−' : '') + fmt(Math.abs(x), d);

  // ---------- laboratorio 1: correlaciones ----------
  const NMAX = 300;
  const C = { shape: 'lin', rho: 0.7, n: 60, zx: [], ze: [] };
  function newSample() { C.zx = Array.from({ length: NMAX }, randn); C.ze = Array.from({ length: NMAX }, randn); draw1(); }
  function points() {
    const r = C.rho, q = Math.sqrt(Math.max(0, 1 - r * r)), pts = [];
    for (let i = 0; i < C.n; i++) {
      const x = C.zx[i], e = C.ze[i];
      let y;
      if (C.shape === 'mono') y = Math.exp(1.4 * (r * x + q * e));
      else if (C.shape === 'u') y = Math.abs(r) * (x * x - 1) / Math.SQRT2 * 2 + q * e;
      else y = r * x + q * e;
      pts.push({ x, y });
    }
    if (C.shape === 'out') pts.push({ x: 3.6, y: C.rho >= 0 ? -3.6 : 3.6, out: true });
    return pts;
  }
  function ranks(v) {
    const idx = v.map((x, i) => i).sort((a, b) => v[a] - v[b]), r = new Array(v.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && v[idx[j + 1]] === v[idx[i]]) j++;
      for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1; i = j + 1; }
    return r;
  }
  function pearson(x, y) {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0, cov: sxy / (n - 1), mx, my };
  }
  function kendall(x, y) { // tau-b
    let c = 0, d = 0, tx = 0, ty = 0; const n = x.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = Math.sign(x[i] - x[j]), b = Math.sign(y[i] - y[j]);
      if (a && b) a === b ? c++ : d++; else if (a && !b) ty++; else if (!a && b) tx++;
    }
    const den = Math.sqrt((c + d + tx) * (c + d + ty)); return den ? (c - d) / den : 0;
  }
  function draw1() {
    if (!C.zx.length) return;
    const pts = points(), xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const P = pearson(xs, ys), rs = pearson(ranks(xs), ranks(ys)).r, kt = kendall(xs, ys);
    $('bivar-r-p').textContent = sg(P.r); $('bivar-r-s').textContent = sg(rs); $('bivar-r-k').textContent = sg(kt);
    $('bivar-r-c').textContent = sg(P.cov);
    const pos = pts.filter(p => (p.x - P.mx) * (p.y - P.my) > 0).length;
    $('bivar-head').textContent = `n = ${pts.length} · ${pos} suman, ${pts.length - pos} restan`;

    const f = fit($('bivar-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14, t: 14, b: 28 };
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const xr = x1 - x0 || 1; x0 -= xr * 0.06; x1 += xr * 0.06;
    const yr = y1 - y0 || 1; y0 -= yr * 0.06; y1 += yr * 0.06;
    const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r), Y = v => h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b);
    // cuadrantes
    const cx = X(P.mx), cy = Y(P.my);
    ctx.fillStyle = accent; ctx.globalAlpha = .06;
    ctx.fillRect(cx, pad.t, w - pad.r - cx, cy - pad.t); ctx.fillRect(pad.l, cy, cx - pad.l, h - pad.b - cy);
    ctx.fillStyle = hot;
    ctx.fillRect(pad.l, pad.t, cx - pad.l, cy - pad.t); ctx.fillRect(cx, cy, w - pad.r - cx, h - pad.b - cy);
    ctx.globalAlpha = 1;
    // rejilla
    const step = v => { const raw = v / 5, m = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map(k => k * m).find(k => k >= raw); };
    const sx = step(x1 - x0), sy = step(y1 - y0);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(x0 / sx) * sx; v <= x1; v += sx) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1; v += sy) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b); ctx.moveTo(pad.l, cy); ctx.lineTo(w - pad.r, cy); ctx.stroke(); ctx.setLineDash([]);
    for (const p of pts) {
      if (p.out) continue;
      ctx.fillStyle = (p.x - P.mx) * (p.y - P.my) > 0 ? accent : hot; ctx.globalAlpha = .8;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), pts.length > 150 ? 2.6 : 3.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const o = pts.find(p => p.out);
    if (o) { ctx.fillStyle = ink; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), 10, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = ink; ctx.font = '600 11px ' + tok('--f-mono'); ctx.textAlign = 'left';
    ctx.fillText('(x̄, ȳ)', Math.min(cx + 6, w - pad.r - 50), Math.max(cy - 6, pad.t + 10));
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.moveTo(pad.l - .5, pad.t); ctx.lineTo(pad.l - .5, h - pad.b); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    const dec = s => s < 1 ? 1 : 0;
    for (let v = Math.ceil(x0 / sx) * sx; v <= x1; v += sx) ctx.fillText(sg(v, dec(sx)), X(v), h - 9);
    ctx.textAlign = 'right';
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1; v += sy) ctx.fillText(sg(v, dec(sy)), pad.l - 6, Y(v) + 4);
  }

  // ---------- laboratorio 2: tabla de contingencia ----------
  const T = { s: 1, n: 400 };
  const ROW = [0.4, 0.6], COL = [0.375, 0.425, 0.2], DEV = [[-0.1875, 0.075, 0.1125], [0.125, -0.05, -0.075]];
  const CATS = ['Auto', 'Público', 'Bici'], ZONAS = ['Centro', 'Periferia'];
  function table() { return ROW.map((r, i) => COL.map((c, j) => T.n * r * (c + T.s * DEV[i][j]))); }
  function draw2() {
    const t = table(); let chi = 0;
    t.forEach((row, i) => row.forEach((o, j) => { const e = T.n * ROW[i] * COL[j]; chi += (o - e) ** 2 / e; }));
    const V = Math.sqrt(chi / T.n), p = Math.exp(-chi / 2);
    const pc = t.map((row, i) => row.map(v => v / (T.n * ROW[i])));
    $('bivar-r-chi').textContent = fmt(chi, 1);
    $('bivar-r-pv').textContent = p < 0.0001 ? '< 0,0001' : fmt(p, 4);
    $('bivar-r-v').textContent = fmt(V, 3);
    $('bivar-r-bici').textContent = Math.round(pc[0][2] * 100) + ' % · ' + Math.round(pc[1][2] * 100) + ' %';
    $('bivar-t-head').textContent = 'centro: ' + t[0].map(v => Math.round(v)).join(' · ') + ' | periferia: ' + t[1].map(v => Math.round(v)).join(' · ');

    const f = fit($('bivar-mosaic')); if (!f) return; const { ctx, w, h } = f;
    const cols = [tok('--accent'), tok('--r-mod'), tok('--hot')], ink = tok('--ink'), muted = tok('--muted'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 44, r: 12, t: 10, b: 26 }, gap = 6, W = w - pad.l - pad.r - gap, H = h - pad.t - pad.b;
    const mono = '11px ' + tok('--f-mono');
    let x = pad.l;
    ZONAS.forEach((z, i) => {
      const cw = W * ROW[i]; let y = pad.t;
      for (let j = 0; j < 3; j++) {
        const hh = H * pc[i][j];
        ctx.fillStyle = cols[j]; ctx.globalAlpha = .75; ctx.fillRect(x, y, cw, Math.max(0, hh - 2)); ctx.globalAlpha = 1;
        if (hh > 18 && cw > 60) { ctx.fillStyle = bg; ctx.font = '600 12px ' + tok('--f-mono'); ctx.textAlign = 'center';
          ctx.fillText(CATS[j] + ' ' + Math.round(pc[i][j] * 100) + '%', x + cw / 2, y + hh / 2 + 4); }
        y += hh;
      }
      // cortes esperados bajo independencia
      ctx.strokeStyle = ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; let ye = pad.t;
      for (let j = 0; j < 2; j++) { ye += H * COL[j]; ctx.beginPath(); ctx.moveTo(x, Math.round(ye) - 1.5); ctx.lineTo(x + cw, Math.round(ye) - 1.5); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'center';
      ctx.fillText(z + ' (' + Math.round(ROW[i] * 100) + ' %)', x + cw / 2, h - 8);
      x += cw + gap;
    });
    ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'right';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(Math.round(v * 100) + '%', pad.l - 6, pad.t + v * H + 4);
  }

  // ---------- controles ----------
  const rEl = $('bivar-rho'), nEl = $('bivar-n'), sEl = $('bivar-s'), tnEl = $('bivar-tn');
  rEl.addEventListener('input', () => { C.rho = +rEl.value; $('bivar-rho-v').textContent = sg(C.rho, 2).replace(/0$/, '') ; draw1(); });
  nEl.addEventListener('input', () => { C.n = +nEl.value; $('bivar-n-v').textContent = C.n; draw1(); });
  segBind('bivar-shape', b => { C.shape = b.dataset.s; draw1(); });
  $('bivar-again').addEventListener('click', newSample);
  sEl.addEventListener('input', () => { T.s = +sEl.value; $('bivar-s-v').textContent = fmt(T.s, 2); draw2(); });
  tnEl.addEventListener('input', () => { T.n = +tnEl.value; $('bivar-tn-v').textContent = T.n; draw2(); });

  M.draw['bivar'] = () => { draw1(); draw2(); };
  M.init.push(() => { newSample(); draw2(); });
})();
