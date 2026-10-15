/* Muestra · clase 13, validación cruzada y sobreajuste */
(() => {
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + M.tok('--f-mono');

  // ---------- generador reproducible ----------
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- simulador 1: grado del polinomio ----------
  const f = x => Math.sin(1.6 * x) + 0.3 * x;
  const SIG = 0.35, NTR = 20, NTE = 200, XLO = 0, XHI = 4, DMAX = 15;
  const S = { d: 3, lam: 0, tr: [], te: [], fits: [], err: [] };
  const toU = x => (x - (XLO + XHI) / 2) / ((XHI - XLO) / 2); // escala a [-1, 1]
  function basis(x, d) { // polinomios de Legendre: mejor condicionados que 1, u, u², ...
    const u = toU(x), P = [1, u];
    for (let k = 1; k < d; k++) P.push(((2 * k + 1) * u * P[k] - k * P[k - 1]) / (k + 1));
    return P.slice(0, d + 1);
  }
  function solve(A, b) { // eliminación gaussiana con pivoteo parcial
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      const piv = A[c][c] || 1e-12;
      for (let r = c + 1; r < n; r++) { const m = A[r][c] / piv; if (!m) continue; for (let k = c; k < n; k++) A[r][k] -= m * A[c][k]; b[r] -= m * b[c]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / (A[r][r] || 1e-12); }
    return x;
  }
  function polyfit(pts, d, lam) { // minimiza (1/n)Σr² + λΣ_{k≥1} β_k²
    const m = d + 1, n = pts.length, G = Array.from({ length: m }, () => new Array(m).fill(0)), r = new Array(m).fill(0);
    for (const [x, y] of pts) { const B = basis(x, d); for (let i = 0; i < m; i++) { r[i] += B[i] * y / n; for (let j = 0; j < m; j++) G[i][j] += B[i] * B[j] / n; } }
    for (let i = 0; i < m; i++) G[i][i] += (i ? lam : 0) + 1e-10;
    return solve(G, r);
  }
  const pred = (beta, x) => { const B = basis(x, beta.length - 1); let s = 0; for (let i = 0; i < B.length; i++) s += beta[i] * B[i]; return s; };
  const mse = (beta, pts) => pts.reduce((a, [x, y]) => a + (y - pred(beta, x)) ** 2, 0) / pts.length;

  function cvNew() {
    const gen = () => { const x = XLO + Math.random() * (XHI - XLO); return [x, f(x) + SIG * M.randn()]; };
    S.tr = Array.from({ length: NTR }, gen); S.te = Array.from({ length: NTE }, gen);
    // bloques fijos de CV (5 bloques de 4) asignados al azar
    const idx = S.tr.map((_, i) => i).sort(() => Math.random() - 0.5);
    S.fold = new Array(NTR); idx.forEach((i, j) => S.fold[i] = j % 5);
    cvCompute();
  }
  function cvCompute() {
    S.fits = []; S.err = [];
    for (let d = 1; d <= DMAX; d++) {
      const beta = polyfit(S.tr, d, S.lam);
      let cv = 0;
      for (let j = 0; j < 5; j++) {
        const b = polyfit(S.tr.filter((_, i) => S.fold[i] !== j), d, S.lam);
        cv += mse(b, S.tr.filter((_, i) => S.fold[i] === j)) / 5;
      }
      S.fits[d] = beta; S.err[d] = { tr: mse(beta, S.tr), te: mse(beta, S.te), cv };
    }
    cvDraw();
  }
  const fmtE = v => v >= 100 ? '> 100' : M.fmt(v, v < 10 ? 3 : 1);

  function cvDraw() {
    const E = S.err[S.d];
    let best = 1, bestTe = 1; for (let d = 1; d <= DMAX; d++) { if (S.err[d].cv < S.err[best].cv) best = d; if (S.err[d].te < S.err[bestTe].te) bestTe = d; }
    $('cv-deg-v').textContent = S.d;
    $('cv-tr').textContent = fmtE(E.tr); $('cv-te').textContent = fmtE(E.te); $('cv-cvv').textContent = fmtE(E.cv);
    $('cv-best').textContent = best + (best === bestTe ? ' (= mejor)' : ' (mejor: ' + bestTe + ')');
    const minTe = S.err[bestTe].te;
    $('cv-head').textContent = E.te <= 1.25 * minTe ? 'buen equilibrio' : (S.d < bestTe ? 'subajuste' : 'sobreajuste');
    drawFit(); drawErr(best);
  }
  function frame(ctx, w, h, pad, line) {
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(pad.l + .5, pad.t + .5, w - pad.l - pad.r - 1, h - pad.t - pad.b - 1);
  }
  function drawFit() {
    const fr = M.fit($('cv-fit')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 10, t: 10, b: 26 }, ylo = -1.5, yhi = 2.8;
    const X = v => pad.l + (v - XLO) / (XHI - XLO) * (w - pad.l - pad.r);
    const Y = v => h - pad.b - (v - ylo) / (yhi - ylo) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.globalAlpha = .55;
    for (let v = -1; v <= 2; v++) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    for (let v = 1; v < 4; v++) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = -1; v <= 2; v++) ctx.fillText(v, pad.l - 6, Y(v));
    ctx.textBaseline = 'alphabetic';
    M.axisTicks(ctx, X, 0, 4, 1, h - 8, muted);
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    // puntos de prueba, tenues
    ctx.fillStyle = muted; ctx.globalAlpha = .28;
    for (const [x, y] of S.te) { ctx.beginPath(); ctx.arc(X(x), Y(y), 1.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // curva real
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const x = XLO + (XHI - XLO) * i / 200; i ? ctx.lineTo(X(x), Y(f(x))) : ctx.moveTo(X(x), Y(f(x))); }
    ctx.stroke(); ctx.setLineDash([]);
    // ajuste
    const beta = S.fits[S.d];
    ctx.strokeStyle = hot; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 400; i++) { const x = XLO + (XHI - XLO) * i / 400; const y = Math.max(-50, Math.min(50, pred(beta, x))); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
    ctx.stroke();
    // entrenamiento
    ctx.fillStyle = accent;
    for (const [x, y] of S.tr) { ctx.beginPath(); ctx.arc(X(x), Y(y), 3.6, 0, 7); ctx.fill(); }
    ctx.restore();
    frame(ctx, w, h, pad, line);
  }
  function drawErr(best) {
    const fr = M.fit($('cv-err')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 12, t: 12, b: 26 }, llo = -2, lhi = 1; // log10 ECM entre 0,01 y 10
    const X = d => pad.l + (d - 1) / (DMAX - 1) * (w - pad.l - pad.r);
    const L = v => Math.max(llo, Math.min(lhi, Math.log10(Math.max(v, 1e-6))));
    const Y = v => h - pad.b - (L(v) - llo) / (lhi - llo) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of [0.01, 0.1, 1, 10]) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(M.fmt(v, v < 1 ? (v < 0.1 ? 2 : 1) : 0), pad.l - 6, y); }
    ctx.textBaseline = 'alphabetic';
    // piso σ²
    ctx.strokeStyle = muted; ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(SIG * SIG) + .5); ctx.lineTo(w - pad.r, Y(SIG * SIG) + .5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText('σ²', pad.l + 4, Y(SIG * SIG) + 13);
    // grado actual
    ctx.strokeStyle = ink; ctx.globalAlpha = .14; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X(S.d), pad.t); ctx.lineTo(X(S.d), h - pad.b); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    const series = [['tr', accent, []], ['te', hot, []], ['cv', ink, [4, 3]]];
    for (const [k, col, dash] of series) {
      ctx.strokeStyle = col; ctx.lineWidth = k === 'cv' ? 1.6 : 2.2; ctx.setLineDash(dash); ctx.beginPath();
      for (let d = 1; d <= DMAX; d++) { d === 1 ? ctx.moveTo(X(d), Y(S.err[d][k])) : ctx.lineTo(X(d), Y(S.err[d][k])); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    for (const [k, col] of series) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(S.d), Y(S.err[S.d][k]), 4.5, 0, 7); ctx.fill(); }
    // grado elegido por CV
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(best), Y(S.err[best].cv), 7, 0, 7); ctx.stroke();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    const step = w < 300 ? 2 : 1;
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let d = 1; d <= DMAX; d += step) ctx.fillText(d, X(d), h - 8);
  }
  $('cv-deg').addEventListener('input', e => { S.d = +e.target.value; cvDraw(); });
  M.segBind('cv-lam', b => { S.lam = +b.dataset.l; cvCompute(); });
  $('cv-again').addEventListener('click', cvNew);

  // ---------- simulador 2: diagrama de k-fold ----------
  const KN = 30, KMIN = 9; // las últimas 9 observaciones son de la clase minoritaria
  const K = { k: 5, mode: 'plain' };
  const cls = Array.from({ length: KN }, (_, i) => i >= KN - KMIN ? 1 : 0);
  function partitions() { // devuelve, por iteración, un arreglo con 0 = sin usar, 1 = entrena, 2 = valida
    const k = K.k, rows = [];
    if (K.mode === 'ts') {
      const ts = Math.floor(KN / (k + 1));
      for (let i = 0; i < k; i++) { const end = KN - (k - i) * ts; rows.push(Array.from({ length: KN }, (_, j) => j < end ? 1 : (j < end + ts ? 2 : 0))); }
      return rows;
    }
    const fold = new Array(KN);
    if (K.mode === 'plain') { // bloques contiguos, tamaños como KFold: los primeros reciben uno extra
      let j = 0; for (let b = 0; b < k; b++) { const sz = Math.floor(KN / k) + (b < KN % k ? 1 : 0); for (let t = 0; t < sz; t++) fold[j++] = b; }
    } else { // estratificado: cada clase se reparte por turnos, con una mezcla fija
      const r = rng(7 + k); let off = 0;
      for (const c of [0, 1]) {
        const idx = cls.map((v, i) => v === c ? i : -1).filter(i => i >= 0);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        idx.forEach((i, t) => fold[i] = (t + off) % k); off += idx.length;
      }
    }
    for (let b = 0; b < k; b++) rows.push(fold.map(v => v === b ? 2 : 1));
    return rows;
  }
  const range = a => { const lo = Math.min(...a), hi = Math.max(...a); return lo === hi ? String(lo) : lo + '–' + hi; };
  function kDraw() {
    $('cv-k-k-v').textContent = K.k;
    const rows = partitions();
    const trS = rows.map(r => r.filter(v => v === 1).length), vaS = rows.map(r => r.filter(v => v === 2).length);
    $('cv-k-fits').textContent = K.k; $('cv-k-tr').textContent = range(trS); $('cv-k-va').textContent = range(vaS);
    if (K.mode === 'ts') { $('cv-k-pct').textContent = 'no aplica'; $('cv-k-head').textContent = 'ventana expansiva'; }
    else {
      const p = rows.map(r => { let n = 0, m = 0; r.forEach((v, i) => { if (v === 2) { n++; m += cls[i]; } }); return Math.round(100 * m / n); });
      $('cv-k-pct').textContent = range(p) + ' %';
      const empty = p.filter(v => v === 0).length;
      $('cv-k-head').textContent = empty ? empty + ' bloque' + (empty > 1 ? 's' : '') + ' sin clase minoritaria' : 'total: 30 % de clase minoritaria';
    }
    const cvs = $('cv-k-plot'), hNeed = 34 + K.k * 24 + 22;
    if (+cvs.getAttribute('height') !== hNeed) { cvs.setAttribute('height', hNeed); cvs._w = 0; }
    const fr = M.fit(cvs); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line'), bg = M.tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 44, r: 10, t: 34, b: 22 };
    const cw = (w - pad.l - pad.r) / KN, gap = cw > 7 ? 1.5 : 1;
    const rh = Math.min(24, (h - pad.t - pad.b) / K.k), top = pad.t;
    ctx.font = mono(); ctx.textBaseline = 'middle';
    // franja superior: clase o tiempo
    ctx.fillStyle = muted; ctx.textAlign = 'right';
    if (K.mode === 'ts') {
      ctx.fillText('t', pad.l - 8, 14);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, 14.5); ctx.lineTo(w - pad.r - 6, 14.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - pad.r, 14.5); ctx.lineTo(w - pad.r - 7, 10.5); ctx.lineTo(w - pad.r - 7, 18.5); ctx.closePath(); ctx.fillStyle = muted; ctx.fill();
      ctx.textAlign = 'left'; ctx.fillText('pasado', pad.l, 26); ctx.textAlign = 'right'; ctx.fillText('futuro', w - pad.r, 26);
    } else {
      ctx.fillText('clase', pad.l - 8, 16);
      for (let i = 0; i < KN; i++) { ctx.fillStyle = cls[i] ? ink : line; ctx.fillRect(pad.l + i * cw + gap / 2, 10, cw - gap, 12); }
    }
    rows.forEach((r, b) => {
      const y = top + b * rh;
      ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText(b + 1, pad.l - 8, y + rh / 2);
      r.forEach((v, i) => {
        const x = pad.l + i * cw + gap / 2, ww = cw - gap, hh = rh - 3;
        if (v === 0) { ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + 1.5, ww - 1, hh - 1); return; }
        ctx.fillStyle = v === 2 ? hot : accent; ctx.globalAlpha = v === 2 ? 1 : .5;
        ctx.fillRect(x, y + 1, ww, hh); ctx.globalAlpha = 1;
        if (K.mode !== 'ts' && cls[i]) { ctx.fillStyle = v === 2 ? bg : ink; ctx.beginPath(); ctx.arc(x + ww / 2, y + 1 + hh / 2, Math.min(ww, hh) * 0.22, 0, 7); ctx.fill(); }
      });
    });
    ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('iter.', 4, top + K.k * rh + 14);
    ctx.textAlign = 'right'; ctx.fillText('n = 30', w - pad.r, top + K.k * rh + 14);
  }
  $('cv-k-k').addEventListener('input', e => { K.k = +e.target.value; kDraw(); });
  M.segBind('cv-k-mode', b => { K.mode = b.dataset.m; kDraw(); });

  M.draw['cv'] = () => { cvDraw(); kDraw(); };
  M.init.push(() => { cvNew(); kDraw(); });
})();
