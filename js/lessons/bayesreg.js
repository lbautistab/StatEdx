/* StatEdx · sesión bayesreg: Regresión bayesiana */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // inversa por Gauss-Jordan con pivoteo parcial
  function inv(A) {
    const n = A.length, M2 = A.map((r, i) => [...r, ...r.map((_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
      [M2[c], M2[p]] = [M2[p], M2[c]];
      const d = M2[c][c]; for (let j = 0; j < 2 * n; j++) M2[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M2[r][j] -= f * M2[c][j]; }
    }
    return M2.map(r => r.slice(n));
  }
  const quad = (S, v) => { let s = 0; for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) s += v[i] * S[i][j] * v[j]; return s; };
  function gridLines(ctx, X, Y, pad, w, h, xs, ys) {
    ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of xs) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (const v of ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ---------- simulador 1: posterior de la recta ----------
  const TRUE = [0.5, 0.8];
  const R = { n: 5, tau: 1, sig: 1, xs: [], es: [], z: [] };
  function newData() {
    R.xs = Array.from({ length: 60 }, () => -3 + 6 * Math.random());
    R.es = Array.from({ length: 60 }, () => randn());
    R.z = Array.from({ length: 25 }, () => [randn(), randn()]);
    drawLine();
  }
  $('bayesreg-n').addEventListener('input', () => { R.n = +$('bayesreg-n').value; $('bayesreg-n-v').textContent = R.n; drawLine(); });
  $('bayesreg-tau').addEventListener('input', () => { R.tau = +$('bayesreg-tau').value; $('bayesreg-tau-v').textContent = fmt(R.tau, 2); drawLine(); });
  segBind('bayesreg-sig', b => { R.sig = +b.dataset.s; drawLine(); });
  $('bayesreg-new').addEventListener('click', newData);

  function drawLine() {
    if (!R.xs.length) return;
    const n = R.n, s2 = R.sig * R.sig, t2 = R.tau * R.tau;
    const x = R.xs.slice(0, n), y = x.map((v, i) => TRUE[0] + TRUE[1] * v + R.sig * R.es[i]);
    let sx = 0, sxx = 0, sy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sx += x[i]; sxx += x[i] * x[i]; sy += y[i]; sxy += x[i] * y[i]; }
    const S = inv([[n / s2 + 1 / t2, sx / s2], [sx / s2, sxx / s2 + 1 / t2]]);
    const m = [S[0][0] * sy / s2 + S[0][1] * sxy / s2, S[1][0] * sy / s2 + S[1][1] * sxy / s2];
    const L00 = Math.sqrt(S[0][0]), L10 = S[1][0] / L00, L11 = Math.sqrt(Math.max(1e-12, S[1][1] - L10 * L10));
    let ols = null;
    const det = n * sxx - sx * sx;
    if (n >= 2 && det > 1e-9) ols = [(sxx * sy - sx * sxy) / det, (n * sxy - sx * sy) / det];
    const sd1 = Math.sqrt(S[1][1]), lam = s2 / t2;
    $('bayesreg-b1').textContent = fmt(m[1], 3);
    $('bayesreg-ci').textContent = fmt(m[1] - 1.96 * sd1, 2) + ' a ' + fmt(m[1] + 1.96 * sd1, 2);
    $('bayesreg-lam').textContent = fmt(lam, lam < 10 ? 2 : 0);
    $('bayesreg-sdp').textContent = fmt(Math.sqrt(s2 + quad(S, [1, 3])), 2);
    $('bayesreg-head').textContent = ols ? `MCO β₁ = ${fmt(ols[1], 3)}` : 'sin datos suficientes para MCO';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');

    let f = fit($('bayesreg-c-data'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 28, r: 10, t: 10, b: 24 }, x0 = -3.5, x1 = 3.5, y0 = -6, y1 = 7;
      const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, pad, w, h, [-3, -2, -1, 0, 1, 2, 3], [-4, 0, 4]);
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      // banda predictiva 95 %
      const G = 80, up = [], dn = [];
      for (let i = 0; i <= G; i++) { const xv = x0 + (x1 - x0) * i / G, mu = m[0] + m[1] * xv, sd = Math.sqrt(s2 + quad(S, [1, xv])); up.push([xv, mu + 1.96 * sd]); dn.push([xv, mu - 1.96 * sd]); }
      ctx.fillStyle = hot; ctx.globalAlpha = .13; ctx.beginPath();
      up.forEach(([a, b], i) => i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b)));
      for (let i = G; i >= 0; i--) ctx.lineTo(X(dn[i][0]), Y(dn[i][1]));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      // rectas posteriores
      ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.globalAlpha = .35;
      for (const [z0, z1] of R.z) { const b0 = m[0] + L00 * z0, b1 = m[1] + L10 * z0 + L11 * z1; ctx.beginPath(); ctx.moveTo(X(x0), Y(b0 + b1 * x0)); ctx.lineTo(X(x1), Y(b0 + b1 * x1)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(X(x0), Y(m[0] + m[1] * x0)); ctx.lineTo(X(x1), Y(m[0] + m[1] * x1)); ctx.stroke();
      if (ols) { ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(x0), Y(ols[0] + ols[1] * x0)); ctx.lineTo(X(x1), Y(ols[0] + ols[1] * x1)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = hot;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(X(x[i]), Y(y[i]), 3.6, 0, 7); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (const v of [-3, -2, -1, 0, 1, 2, 3]) ctx.fillText(v, X(v), h - 8);
      ctx.textAlign = 'right'; for (const v of [-4, 0, 4]) ctx.fillText(v, pad.l - 6, Y(v) + 4);
    }
    f = fit($('bayesreg-c-par'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pd = 22, side = Math.min(w, h) - 2 * pd, ox = (w - side) / 2, oy = (h - side) / 2, Rg = 2;
      const X = v => ox + (v + Rg) / (2 * Rg) * side, Y = v => oy + side - (v + Rg) / (2 * Rg) * side;
      ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = -2; v <= 2; v++) { ctx.beginPath(); ctx.moveTo(X(v), Y(-Rg)); ctx.lineTo(X(v), Y(Rg)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(-Rg), Y(v)); ctx.lineTo(X(Rg), Y(v)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, side, side); ctx.clip();
      ctx.strokeStyle = muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
      for (const c of [1, 2]) { ctx.beginPath(); ctx.arc(X(0), Y(0), c * R.tau / (2 * Rg) * side, 0, 7); ctx.stroke(); }
      ctx.setLineDash([]);
      for (const [r, a] of [[2.448, .2], [1.515, .35]]) {
        ctx.fillStyle = accent; ctx.globalAlpha = a; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const t = 2 * Math.PI * i / 80, u = r * Math.cos(t), v = r * Math.sin(t); const px = m[0] + L00 * u, py = m[1] + L10 * u + L11 * v; i ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py)); }
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(X(m[0]), Y(m[1]), 3.5, 0, 7); ctx.fill();
      if (ols) { const a = X(ols[0]), b = Y(ols[1]); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a - 5, b - 5); ctx.lineTo(a + 5, b + 5); ctx.moveTo(a + 5, b - 5); ctx.lineTo(a - 5, b + 5); ctx.stroke(); }
      { const a = X(TRUE[0]), b = Y(TRUE[1]); ctx.strokeStyle = hot; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a - 6, b); ctx.lineTo(a + 6, b); ctx.moveTo(a, b - 6); ctx.lineTo(a, b + 6); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (const v of [-2, 0, 2]) ctx.fillText(v, X(v), oy + side + 14);
      ctx.textAlign = 'right'; for (const v of [-2, 0, 2]) ctx.fillText(v, ox - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('β₀', ox + side - 16, oy + side - 6); ctx.fillText('β₁', ox + 4, oy + 12);
    }
  }

  // ---------- simulador 2: polinomio de grado 9 ----------
  const P = { v: 0, x: [], y: [], sig: 0.25, D: 10 };
  const phi = x => { const u = 2 * x - 1, r = [1]; for (let k = 1; k < P.D; k++) r.push(r[k - 1] * u); return r; };
  const ftrue = x => Math.sin(2 * Math.PI * x);
  function newPoly() {
    P.x = Array.from({ length: 12 }, () => Math.random()).sort((a, b) => a - b);
    P.y = P.x.map(x => ftrue(x) + P.sig * randn());
    drawPoly();
  }
  function polySync(fromPreset) {
    $('bayesreg-lt').value = P.v; $('bayesreg-lt-v').textContent = fmtTau(Math.pow(10, P.v));
    if (!fromPreset) document.querySelectorAll('#bayesreg-ppre button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === P.v)));
    drawPoly();
  }
  const fmtTau = t => t >= 100 ? fmt(t, 0) : t >= 1 ? fmt(t, 2) : fmt(t, 3);
  const fmtSmall = v => v >= 0.01 ? fmt(v, v >= 100 ? 0 : 3) : v.toExponential(1).replace('.', ',').replace('e-', ' × 10⁻').replace(/⁻(\d+)/, (m, d) => '⁻' + d.split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join(''));
  $('bayesreg-lt').addEventListener('input', () => { P.v = +$('bayesreg-lt').value; polySync(); });
  segBind('bayesreg-ppre', b => { P.v = +b.dataset.v; polySync(true); });
  $('bayesreg-p-new').addEventListener('click', newPoly);

  function drawPoly() {
    if (!P.x.length) return;
    const tau = Math.pow(10, P.v), lam = P.sig * P.sig / (tau * tau), D = P.D;
    const Phi = P.x.map(phi);
    const A = Array.from({ length: D }, (_, i) => Array.from({ length: D }, (_, j) => Phi.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? lam : 0)));
    const Ai = inv(A);
    const b = Array.from({ length: D }, (_, i) => Phi.reduce((s, r, k) => s + r[i] * P.y[k], 0));
    const beta = Ai.map(r => r.reduce((s, v, j) => s + v * b[j], 0));
    const pred = x => phi(x).reduce((s, v, j) => s + v * beta[j], 0);
    const df = Phi.reduce((s, r) => s + quad(Ai, r), 0);
    const tr = P.x.reduce((s, x, i) => s + (pred(x) - P.y[i]) ** 2, 0) / P.x.length;
    let te = 0; for (let i = 0; i < 200; i++) { const x = (i + 0.5) / 200; te += (pred(x) - ftrue(x)) ** 2; } te /= 200;
    $('bayesreg-p-lam').textContent = fmtSmall(lam);
    $('bayesreg-p-df').textContent = fmt(df, 2);
    $('bayesreg-p-tr').textContent = fmt(tr, 3);
    $('bayesreg-p-te').textContent = te > 100 ? '> 100' : fmt(te, 3);
    $('bayesreg-p-head').textContent = `βⱼ ~ N(0; ${fmtTau(tau)}²) · σ = 0,25`;

    const f = fit($('bayesreg-c-poly')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 30, r: 10, t: 10, b: 24 }, y0 = -2.2, y1 = 2.2;
    const X = v => pad.l + v * (w - pad.l - pad.r), Y = v => h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b);
    gridLines(ctx, X, Y, pad, w, h, [0, 0.25, 0.5, 0.75, 1], [-2, -1, 0, 1, 2]);
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    const G = 200, s2 = P.sig * P.sig, up = [], dn = [], mu = [];
    for (let i = 0; i <= G; i++) {
      const x = i / G, r = phi(x), m = pred(x), sd = Math.sqrt(s2 + s2 * quad(Ai, r));
      mu.push([x, m]); up.push([x, Math.min(m + 1.96 * sd, 50)]); dn.push([x, Math.max(m - 1.96 * sd, -50)]);
    }
    ctx.fillStyle = accent; ctx.globalAlpha = .16; ctx.beginPath();
    up.forEach(([a, c], i) => i ? ctx.lineTo(X(a), Y(c)) : ctx.moveTo(X(a), Y(c)));
    for (let i = G; i >= 0; i--) ctx.lineTo(X(dn[i][0]), Y(dn[i][1]));
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = muted; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let i = 0; i <= G; i++) { const x = i / G; i ? ctx.lineTo(X(x), Y(ftrue(x))) : ctx.moveTo(X(x), Y(ftrue(x))); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.beginPath();
    mu.forEach(([a, c], i) => { const yy = Y(Math.max(-50, Math.min(50, c))); i ? ctx.lineTo(X(a), yy) : ctx.moveTo(X(a), yy); }); ctx.stroke();
    ctx.fillStyle = hot;
    P.x.forEach((x, i) => { ctx.beginPath(); ctx.arc(X(x), Y(P.y[i]), 4, 0, 7); ctx.fill(); });
    ctx.restore();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(fmt(v, 2), Math.min(Math.max(X(v), pad.l + 12), w - pad.r - 14), h - 8);
    ctx.textAlign = 'right'; for (const v of [-2, -1, 0, 1, 2]) ctx.fillText(v, pad.l - 6, Y(v) + 4);
  }

  M.draw.bayesreg = () => { drawLine(); drawPoly(); };
  M.init.push(() => { newData(); newPoly(); polySync(); });
})();
