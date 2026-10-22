/* StatEdx · sesión diag: Diagnóstico de regresión */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);
  const pfmt = p => p < 0.0001 ? '< 0,0001' : fmt(p, p < 0.01 ? 4 : 3);
  function Phinv(p) { let lo = -8, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; Phi(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; }
  const niceStep = span => { const raw = span / 5, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; };
  const decs = step => step >= 1 ? 0 : step >= 0.1 ? 1 : 2;

  const N = 40;
  const S = { esc: 'ok', tr: 'y', plot: 'res', base: null, P: null, yr: null, xform: null };
  function newData() {
    S.base = Array.from({ length: N }, () => ({ x: 1 + Math.random() * 19, z: randn(), c: (randn() ** 2 + randn() ** 2 + randn() ** 2) / 3 }));
    S.P = null; draw();
  }
  function rawY(b) {
    let y;
    if (S.esc === 'curva') y = 4 + 0.2 * b.x + 0.07 * b.x * b.x + 1.6 * b.z;
    else if (S.esc === 'embudo') y = 6 * Math.exp(0.12 * b.x + 0.25 * b.z);
    else if (S.esc === 'colas') y = 12 + 1.2 * b.x + 2.2 * b.z / Math.sqrt(Math.max(b.c, 0.02)) * 0.6;
    else y = 12 + 1.2 * b.x + 3 * b.z;
    return Math.max(y, 0.5);
  }
  const g = y => S.tr === 'log' ? Math.log(y) : y;
  const ginv = v => S.tr === 'log' ? Math.exp(v) : v;

  function ols(pts) {
    const n = pts.length; let mx = 0, my = 0;
    for (const p of pts) { mx += p.x; my += p.y; } mx /= n; my /= n;
    let sxx = 0, sxy = 0; for (const p of pts) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
    const b1 = sxy / sxx, b0 = my - b1 * mx;
    const e = pts.map(p => p.y - b0 - b1 * p.x), sse = e.reduce((s, v) => s + v * v, 0), s = Math.sqrt(sse / (n - 2));
    const h = pts.map(p => 1 / n + (p.x - mx) ** 2 / sxx);
    const r = e.map((v, i) => v / (s * Math.sqrt(1 - h[i])));
    const D = r.map((v, i) => v * v / 2 * h[i] / (1 - h[i]));
    // Breusch-Pagan (versión de Koenker: n·R² de e² sobre x)
    const e2 = e.map(v => v * v), me2 = e2.reduce((a, v) => a + v, 0) / n;
    let sxe = 0, see = 0; pts.forEach((p, i) => { sxe += (p.x - mx) * (e2[i] - me2); see += (e2[i] - me2) ** 2; });
    const lm = n * (sxe * sxe) / (sxx * see), bp = 2 * (1 - Phi(Math.sqrt(lm)));
    return { b0, b1, e, h, r, D, fitted: pts.map(p => b0 + b1 * p.x), bp };
  }
  function draw() {
    if (!S.base) return;
    const data = S.base.map(b => ({ x: b.x, y: g(rawY(b)) }));
    // rango fijo del eje y según los datos (para que arrastrar sea estable)
    let lo = Infinity, hi = -Infinity; for (const p of data) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); }
    const sp = hi - lo; lo -= sp * 0.3; hi += sp * 0.3;
    if (S.tr === 'y') lo = Math.max(lo, 0);
    S.yr = [lo, hi];
    const f0 = ols(data);
    if (!S.P) S.P = { x: 24, y: ginv(f0.b0 + f0.b1 * 24 - 0.22 * (hi - lo)) };
    let py = g(S.P.y); py = Math.min(Math.max(py, lo), hi); S.P.y = ginv(py);
    const pts = data.concat([{ x: S.P.x, y: py, P: true }]);
    const F = ols(pts), iP = pts.length - 1;
    $('diag-r-b').textContent = `${sgn(F.b1, 3)} (${sgn(f0.b1, 3)})`;
    $('diag-r-h').textContent = fmt(F.h[iP], 3);
    $('diag-r-d').textContent = fmt(F.D[iP], F.D[iP] >= 10 ? 1 : 2);
    $('diag-r-bp').textContent = pfmt(f0.bp);
    $('diag-head').textContent = `umbral de h = 2(p+1)/n = ${fmt(4 / pts.length, 3)}`;
    $('diag-lbl-y').textContent = S.tr === 'log' ? 'escala de log y' : 'escala de y';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');

    // ----- datos -----
    let f = fit($('diag-c-xy'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 10, t: 10, b: 26 };
      const X = v => pad.l + v / 26 * (w - pad.l - pad.r), Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
      S.xform = { pad, w, h, lo, hi };
      const st = niceStep(hi - lo), d = decs(st);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let v = 5; v <= 25; v += 5) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      ctx.strokeStyle = muted; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(f0.b0)); ctx.lineTo(X(26), Y(f0.b0 + f0.b1 * 26)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(X(0), Y(F.b0)); ctx.lineTo(X(26), Y(F.b0 + F.b1 * 26)); ctx.stroke();
      ctx.fillStyle = accent; ctx.globalAlpha = .75;
      data.forEach(p => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      const pxx = X(S.P.x), pyy = Y(py);
      ctx.strokeStyle = hot; ctx.lineWidth = 1.2; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(pxx, pyy); ctx.lineTo(pxx, Y(F.b0 + F.b1 * S.P.x)); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pxx, pyy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pxx, pyy, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = 0; v <= 25; v += 5) ctx.fillText(v, Math.max(X(v), pad.l + 6), h - 8);
      ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) ctx.fillText(sgn(Math.abs(v) < 1e-9 ? 0 : v, d), pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 8), h - pad.b));
    }

    // ----- gráfico de diagnóstico -----
    f = fit($('diag-c-diag')); if (!f) return;
    const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 12, t: 12, b: 26 };
    let xs, ys, xlab, ylab = '', zero = null;
    const labels = { res: ['Residuos vs ajustados', '— cero'], qq: ['Q-Q normal de residuos estandarizados', '— diagonal'], sl: ['Escala-ubicación: √|r| vs ajustados', ''], lev: ['Residuos estandarizados vs apalancamiento', '┄ Cook 0,5 y 1'] };
    $('diag-lbl-p').textContent = labels[S.plot][0]; $('diag-lbl-p2').textContent = labels[S.plot][1];
    if (S.plot === 'res') { xs = F.fitted; ys = F.e; zero = 0; }
    else if (S.plot === 'sl') { xs = F.fitted; ys = F.r.map(v => Math.sqrt(Math.abs(v))); }
    else if (S.plot === 'lev') { xs = F.h; ys = F.r; zero = 0; }
    else {
      const ord = F.r.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
      xs = new Array(pts.length); ys = new Array(pts.length);
      ord.forEach(([v, i], k) => { xs[i] = Phinv((k + 0.5) / pts.length); ys[i] = v; });
    }
    let xlo = Math.min(...xs), xhi = Math.max(...xs), ylo2 = Math.min(...ys), yhi2 = Math.max(...ys);
    if (S.plot === 'qq') { const m = Math.max(Math.abs(xlo), Math.abs(xhi), Math.abs(ylo2), Math.abs(yhi2)) * 1.08; xlo = ylo2 = -m; xhi = yhi2 = m; }
    else {
      const px = (xhi - xlo) * 0.06 || 1; xlo -= px; xhi += px;
      if (S.plot === 'lev') { xlo = 0; xhi = Math.max(xhi, 0.3); }
      if (zero === 0) { const m = Math.max(Math.abs(ylo2), Math.abs(yhi2)) * 1.12 || 1; ylo2 = -m; yhi2 = m; }
      else { ylo2 = 0; yhi2 = Math.max(yhi2 * 1.12, 1.6); }
    }
    const X = v => pad.l + (v - xlo) / (xhi - xlo) * (w - pad.l - pad.r), Y = v => h - pad.b - (v - ylo2) / (yhi2 - ylo2) * (h - pad.t - pad.b);
    const sty = niceStep(yhi2 - ylo2), stx = niceStep(xhi - xlo);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(ylo2 / sty) * sty; v <= yhi2; v += sty) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.4;
    if (zero === 0) { ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke(); }
    if (S.plot === 'qq') { ctx.beginPath(); ctx.moveTo(X(xlo), Y(xlo)); ctx.lineTo(X(xhi), Y(xhi)); ctx.stroke(); }
    if (S.plot === 'lev') {
      ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      for (const Dc of [0.5, 1]) for (const s of [-1, 1]) {
        ctx.beginPath(); let first = true;
        for (let i = 1; i <= 120; i++) { const hh = xlo + (xhi - xlo) * i / 120; if (hh <= 0 || hh >= 1) continue; const r = s * Math.sqrt(2 * Dc * (1 - hh) / hh); first ? ctx.moveTo(X(hh), Y(r)) : ctx.lineTo(X(hh), Y(r)); first = false; }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(Math.round(X(4 / pts.length)) + .5, pad.t); ctx.lineTo(Math.round(X(4 / pts.length)) + .5, h - pad.b); ctx.stroke();
    }
    if (S.plot === 'sl' || S.plot === 'res') {
      // suavizado sencillo por ventanas para leer la tendencia
      const ord = xs.map((v, i) => [v, ys[i]]).sort((a, b) => a[0] - b[0]);
      ctx.strokeStyle = hot; ctx.lineWidth = 1.6; ctx.globalAlpha = .7; ctx.beginPath();
      ord.forEach(([xv], k) => { const a = Math.max(0, k - 6), b = Math.min(ord.length, k + 7); let s = 0; for (let j = a; j < b; j++) s += ord[j][1]; const yv = s / (b - a); k ? ctx.lineTo(X(xv), Y(yv)) : ctx.moveTo(X(xv), Y(yv)); });
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    xs.forEach((xv, i) => {
      if (i === iP) return;
      ctx.fillStyle = accent; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(X(xv), Y(ys[i]), 3.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(xs[iP]), Y(ys[iP]), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    const dy = decs(sty), dx = decs(stx);
    for (let v = Math.ceil(ylo2 / sty) * sty; v <= yhi2; v += sty) ctx.fillText(sgn(Math.abs(v) < 1e-9 ? 0 : v, dy), pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 8), h - pad.b));
    ctx.textAlign = 'center';
    let last = -99;
    for (let v = Math.ceil(xlo / stx) * stx; v <= xhi; v += stx) { const x = X(v); if (x - last < 34 || x > w - pad.r - 10) continue; ctx.fillText(sgn(Math.abs(v) < 1e-9 ? 0 : v, dx), x, h - 8); last = x; }
  }

  // ----- arrastrar el punto -----
  const cv = $('diag-c-xy');
  cv.style.touchAction = 'none';
  let dragging = false;
  function moveTo(ev) {
    if (!S.xform) return;
    const { pad, w, h, lo, hi } = S.xform, rect = cv.getBoundingClientRect();
    const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
    const x = Math.min(Math.max((cx - pad.l) / (w - pad.l - pad.r) * 26, 0), 26);
    const v = Math.min(Math.max(lo + (h - pad.b - cy) / (h - pad.t - pad.b) * (hi - lo), lo), hi);
    S.P = { x, y: ginv(v) }; draw();
  }
  cv.addEventListener('pointerdown', ev => { dragging = true; cv.setPointerCapture(ev.pointerId); moveTo(ev); });
  cv.addEventListener('pointermove', ev => { if (dragging) moveTo(ev); });
  cv.addEventListener('pointerup', () => { dragging = false; });
  cv.addEventListener('pointercancel', () => { dragging = false; });

  segBind('diag-esc', b => { S.esc = b.dataset.e; S.P = null; draw(); });
  segBind('diag-tr', b => { S.tr = b.dataset.t; draw(); });
  segBind('diag-plot', b => { S.plot = b.dataset.p; draw(); });
  $('diag-again').addEventListener('click', newData);

  M.draw['diag'] = draw;
  M.init.push(newData);
})();
