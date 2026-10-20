/* StatEdx · clase 8, regresión lineal simple */
(() => {
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + M.tok('--f-mono');
  const NMAX = 120;
  const R = { b1: 2.8, sd: 5, n: 30, shape: 'lin', out: 'none', oy: 30, xs: [], zs: [] };

  function regNew() {
    R.xs = Array.from({ length: NMAX }, () => 0.5 + Math.random() * 11.5);
    R.zs = Array.from({ length: NMAX }, () => M.randn());
    regDraw();
  }
  const truth = x => R.shape === 'curva' ? 50 + R.b1 * x - 0.45 * (x - 6) ** 2 + 6 : 50 + R.b1 * x;
  const noise = (x, z) => R.sd * z * (R.shape === 'embudo' ? 0.15 + x / 6 : 1);
  function points() {
    const pts = [];
    for (let i = 0; i < R.n; i++) { const x = R.xs[i]; pts.push({ x, y: truth(x) + noise(x, R.zs[i]) }); }
    if (R.out !== 'none') pts.push({ x: R.out === 'mid' ? 6.5 : 22, y: R.oy, out: true });
    return pts;
  }
  function ols(pts) {
    const n = pts.length; let sx = 0, sy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; }
    const mx = sx / n, my = sy / n; let sxx = 0, sxy = 0, syy = 0;
    for (const p of pts) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; }
    const b1 = sxy / sxx, b0 = my - b1 * mx;
    const r = syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
    return { b0, b1, r, r2: r * r };
  }
  const sgn = (x, d) => (x < 0 ? '−' : '') + M.fmt(Math.abs(x), d);

  function regDraw() {
    if (!R.xs.length) return;
    const pts = points(), fitAll = ols(pts);
    const fitClean = R.out !== 'none' ? ols(pts.filter(p => !p.out)) : null;
    $('reg-r-b0').textContent = sgn(fitAll.b0, 2);
    $('reg-r-b1').textContent = sgn(fitAll.b1, 2);
    $('reg-r-r').textContent = sgn(fitAll.r, 3);
    $('reg-r-r2').textContent = M.fmt(fitAll.r2, 3);
    $('reg-head').textContent = `ŷ = ${sgn(fitAll.b0, 1)} ${fitAll.b1 < 0 ? '−' : '+'} ${M.fmt(Math.abs(fitAll.b1), 2)}x`;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line'), bg = M.tok('--bg');

    // rango del eje y a partir de los datos (incluye la recta real)
    const xHi = R.out === 'far' ? 24 : 12;
    let ylo = Infinity, yhi = -Infinity;
    for (const p of pts) { ylo = Math.min(ylo, p.y); yhi = Math.max(yhi, p.y); }
    for (const x of [0, xHi]) { ylo = Math.min(ylo, truth(x), fitAll.b0 + fitAll.b1 * x); yhi = Math.max(yhi, truth(x), fitAll.b0 + fitAll.b1 * x); }
    if (R.shape === 'curva') ylo = Math.min(ylo, truth(xHi));
    const ystep = yhi - ylo > 120 ? 40 : yhi - ylo > 60 ? 20 : 10;
    ylo = Math.floor((ylo - 4) / ystep) * ystep; yhi = Math.ceil((yhi + 4) / ystep) * ystep; if (yhi === ylo) yhi = ylo + ystep;

    let f = M.fit($('reg-c-xy'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 12, t: 12, b: 26 };
      const X = x => pad.l + x / xHi * (w - pad.l - pad.r);
      const Y = y => h - pad.b - (y - ylo) / (yhi - ylo) * (h - pad.t - pad.b);
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      // rejilla
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let y = ylo; y <= yhi + 1e-9; y += ystep) { const yy = Math.round(Y(y)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      const xstep = xHi > 12 ? 4 : 2;
      for (let x = xstep; x <= xHi; x += xstep) { const xx = Math.round(X(x)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // residuos
      ctx.strokeStyle = hot; ctx.lineWidth = 1.2; ctx.globalAlpha = .55;
      for (const p of pts) { const yh = fitAll.b0 + fitAll.b1 * p.x; ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(p.x), Y(yh)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // recta real
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const x = xHi * i / 60, y = Y(truth(x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
      ctx.stroke(); ctx.setLineDash([]);
      // recta sin atípico
      if (fitClean) {
        ctx.strokeStyle = muted; ctx.lineWidth = 2; ctx.setLineDash([7, 4]);
        ctx.beginPath(); ctx.moveTo(X(0), Y(fitClean.b0)); ctx.lineTo(X(xHi), Y(fitClean.b0 + fitClean.b1 * xHi)); ctx.stroke(); ctx.setLineDash([]);
      }
      // recta MCO
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(X(0), Y(fitAll.b0)); ctx.lineTo(X(xHi), Y(fitAll.b0 + fitAll.b1 * xHi)); ctx.stroke();
      // puntos
      for (const p of pts) {
        if (p.out) continue;
        ctx.fillStyle = accent; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const o = pts.find(p => p.out);
      if (o) {
        ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), 10, 0, Math.PI * 2); ctx.stroke();
      }
      // media (x̄, ȳ)
      ctx.restore();
      // ejes
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let x = 0; x <= xHi; x += xstep) ctx.fillText(x, Math.min(X(x), w - pad.r - 6), h - 8);
      ctx.textAlign = 'right';
      for (let y = ylo; y <= yhi + 1e-9; y += ystep) ctx.fillText(sgn(y, 0), pad.l - 6, Math.min(Math.max(Y(y) + 4, pad.t + 8), h - pad.b));
    }

    // residuos vs ajustados
    f = M.fit($('reg-c-res'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 12, t: 12, b: 26 };
      const fitted = pts.map(p => ({ f: fitAll.b0 + fitAll.b1 * p.x, e: p.y - fitAll.b0 - fitAll.b1 * p.x, out: p.out }));
      let flo = Infinity, fhi = -Infinity, emax = 1;
      for (const q of fitted) { flo = Math.min(flo, q.f); fhi = Math.max(fhi, q.f); emax = Math.max(emax, Math.abs(q.e)); }
      if (fhi - flo < 1e-6) { flo -= 1; fhi += 1; }
      const fpad = (fhi - flo) * 0.06; flo -= fpad; fhi += fpad;
      const estep = emax > 60 ? 40 : emax > 30 ? 20 : emax > 12 ? 10 : emax > 6 ? 5 : 2;
      const eLim = Math.ceil(emax * 1.08 / estep) * estep;
      const X = v => pad.l + (v - flo) / (fhi - flo) * (w - pad.l - pad.r);
      const Y = e => h - pad.b - (e + eLim) / (2 * eLim) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let e = -eLim; e <= eLim + 1e-9; e += estep) { const yy = Math.round(Y(e)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      for (const q of fitted) {
        if (q.out) continue;
        ctx.fillStyle = accent; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(X(q.f), Y(q.e), 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const o = fitted.find(q => q.out);
      if (o) { ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(o.f), Y(o.e), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (let e = -eLim; e <= eLim + 1e-9; e += estep) ctx.fillText((e > 0 ? '+' : '') + sgn(e, 0), pad.l - 6, Math.min(Math.max(Y(e) + 4, pad.t + 8), h - pad.b - 2));
      // ticks de ajustados
      const span = fhi - flo, fs = span > 120 ? 40 : span > 60 ? 20 : span > 24 ? 10 : span > 12 ? 5 : 2;
      ctx.textAlign = 'center';
      for (let v = Math.ceil(flo / fs) * fs; v <= fhi; v += fs) ctx.fillText(sgn(v, 0), X(v), h - 8);
    }
  }

  const b1 = $('reg-b1'), sd = $('reg-sd'), nn = $('reg-n'), oy = $('reg-oy');
  b1.addEventListener('input', () => { R.b1 = +b1.value; $('reg-b1-v').textContent = sgn(R.b1, 1); regDraw(); });
  sd.addEventListener('input', () => { R.sd = +sd.value; $('reg-sd-v').textContent = M.fmt(R.sd, R.sd % 1 ? 1 : 0); regDraw(); });
  nn.addEventListener('input', () => { R.n = +nn.value; $('reg-n-v').textContent = R.n; regDraw(); });
  oy.addEventListener('input', () => { R.oy = +oy.value; $('reg-oy-v').textContent = R.oy; if (R.out === 'none') { R.out = 'far'; document.querySelectorAll('#reg-out button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.o === 'far'))); } regDraw(); });
  M.segBind('reg-shape', btn => { R.shape = btn.dataset.s; regDraw(); });
  M.segBind('reg-out', btn => { R.out = btn.dataset.o; regDraw(); });
  $('reg-again').addEventListener('click', regNew);

  M.draw['reg'] = regDraw;
  M.init.push(regNew);
})();
