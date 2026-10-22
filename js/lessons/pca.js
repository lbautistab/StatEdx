/* StatEdx · sesión pca: Análisis de componentes principales (PCA) */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);

  // ---------- simulador 1: dirección de máxima varianza ----------
  const N = 200;
  const P = { rho: 0.7, sr: 1, th: 0, z: [], pts: [], S: null, eig: null };
  function pNew() { P.z = Array.from({ length: N }, () => [randn(), randn()]); pBuild(); }
  function pBuild() {
    const r = P.rho, q = Math.sqrt(1 - r * r);
    let pts = P.z.map(([a, b]) => [a, P.sr * (r * a + q * b)]);
    const mx = pts.reduce((s, p) => s + p[0], 0) / N, my = pts.reduce((s, p) => s + p[1], 0) / N;
    pts = pts.map(p => [p[0] - mx, p[1] - my]);
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pts) { sxx += x * x; syy += y * y; sxy += x * y; }
    sxx /= N - 1; syy /= N - 1; sxy /= N - 1;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    let a1 = Math.abs(sxy) < 1e-12 ? (sxx >= syy ? 0 : Math.PI / 2) : Math.atan2(l1 - sxx, sxy);
    a1 = ((a1 % Math.PI) + Math.PI) % Math.PI;
    P.pts = pts; P.S = { sxx, syy, sxy, tr }; P.eig = { l1, l2, a1 };
    pDraw();
  }
  const vproj = t => { const c = Math.cos(t), s = Math.sin(t); return P.S.sxx * c * c + 2 * P.S.sxy * c * s + P.S.syy * s * s; };
  function pDraw() {
    if (!P.pts.length) return;
    const th = P.th * Math.PI / 180, v = vproj(th), { l1, l2, a1 } = P.eig;
    const a1d = a1 * 180 / Math.PI;
    $('pca-rho-v').textContent = sgn(P.rho, 2).replace(/0$/, '').replace(/,$/, '');
    $('pca-sr-v').textContent = fmt(P.sr, P.sr % 1 ? 1 : 0);
    $('pca-th-v').textContent = P.th + '°';
    $('pca-r-v').textContent = fmt(v, 3);
    $('pca-r-p').textContent = pct(v / P.S.tr, 1);
    $('pca-r-a').textContent = fmt(a1d, 1) + '°';
    $('pca-r-e').textContent = pct(l1 / P.S.tr, 1);
    $('pca-head').textContent = `λ₁ = ${fmt(l1, 2)} · λ₂ = ${fmt(l2, 2)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let fr = fit($('pca-c-xy'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      let L = 0; for (const p of P.pts) L = Math.max(L, Math.abs(p[0]), Math.abs(p[1]));
      L *= 1.08;
      const sc = Math.min(w, h) / (2 * L), ox = w / 2, oy = h / 2;
      const X = x => ox + x * sc, Y = y => oy - y * sc;
      const gs = L > 6 ? 2 : 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .5;
      for (let g = -Math.floor(w / 2 / sc / gs) * gs; g * sc <= w / 2; g += gs) { ctx.beginPath(); ctx.moveTo(Math.round(X(g)) + .5, 0); ctx.lineTo(Math.round(X(g)) + .5, h); ctx.stroke(); }
      for (let g = -Math.floor(h / 2 / sc / gs) * gs; g * sc <= h / 2; g += gs) { ctx.beginPath(); ctx.moveTo(0, Math.round(Y(g)) + .5); ctx.lineTo(w, Math.round(Y(g)) + .5); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(0, Math.round(oy) + .5); ctx.lineTo(w, Math.round(oy) + .5); ctx.moveTo(Math.round(ox) + .5, 0); ctx.lineTo(Math.round(ox) + .5, h); ctx.stroke();
      const c = Math.cos(th), s = Math.sin(th), R = Math.hypot(w, h);
      // proyecciones
      ctx.strokeStyle = hot; ctx.globalAlpha = .35; ctx.lineWidth = 1;
      for (const [x, y] of P.pts) { const t = x * c + y * s; ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(t * c), Y(t * s)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // ejes principales
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
      for (const [a, l] of [[a1, l1], [a1 + Math.PI / 2, l2]]) { const e = 2 * Math.sqrt(l) * sc; ctx.beginPath(); ctx.moveTo(ox - Math.cos(a) * e, oy + Math.sin(a) * e); ctx.lineTo(ox + Math.cos(a) * e, oy - Math.sin(a) * e); ctx.stroke(); }
      ctx.setLineDash([]);
      // recta θ
      ctx.strokeStyle = hot; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ox - c * R, oy + s * R); ctx.lineTo(ox + c * R, oy - s * R); ctx.stroke();
      for (const [x, y] of P.pts) { ctx.fillStyle = accent; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(X(x), Y(y), 2.8, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const [x, y] of P.pts) { const t = x * c + y * s; ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(t * c), Y(t * s), 2, 0, 7); ctx.fill(); }
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText('x₁', w - 6, oy - 6); ctx.textAlign = 'left'; ctx.fillText('x₂', ox + 6, 14);
      ctx.fillStyle = ink; const e1 = 2 * Math.sqrt(l1) * sc + 4;
      const lx = Math.min(w - 30, Math.max(6, ox + Math.cos(a1) * e1)), ly = Math.min(h - 6, Math.max(14, oy - Math.sin(a1) * e1));
      ctx.fillText('CP1', lx, ly);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
    }

    fr = fit($('pca-c-var'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 14, t: 14, b: 26 };
      const raw = l1 * 1.1, step = raw > 4 ? 1 : raw > 2 ? 0.5 : raw > 1 ? 0.25 : 0.2, hi = Math.ceil(raw / step) * step;
      const X = d => pad.l + d / 180 * (w - pad.l - pad.r), Y = val => h - pad.b - val / hi * (h - pad.t - pad.b);
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let q = 0; q <= hi + 1e-9; q += step) { const y = Math.round(Y(q)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(fmt(q, step < 0.5 ? 2 : 1), pad.l - 6, y); }
      ctx.textBaseline = 'alphabetic';
      // varianza total / 2 como referencia: la media de la curva
      ctx.strokeStyle = ink; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(P.S.tr / 2)); ctx.lineTo(w - pad.r, Y(P.S.tr / 2)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let d = 0; d <= 180; d += 1) { const y = Y(vproj(d * Math.PI / 180)); d ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y); }
      ctx.stroke();
      const a2d = (a1d + 90) % 180;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(a1d), Y(l1), 7, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(a2d), Y(l2), 7, 0, 7); ctx.stroke();
      ctx.fillStyle = ink; ctx.textAlign = 'center';
      ctx.fillText('CP1', Math.min(w - pad.r - 14, Math.max(pad.l + 14, X(a1d))), Math.max(pad.t + 10, Y(l1) - 12));
      ctx.fillText('CP2', Math.min(w - pad.r - 14, Math.max(pad.l + 14, X(a2d))), Math.min(h - pad.b - 4, Y(l2) - 12));
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(P.th), h - pad.b); ctx.lineTo(X(P.th), Y(v)); ctx.stroke();
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(P.th), Y(v), 4.5, 0, 7); ctx.fill();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let d = 0; d <= 180; d += 45) ctx.fillText(d + '°', Math.min(X(d), w - pad.r - 10), h - 8);
    }
  }
  const rho = $('pca-rho'), sr = $('pca-sr'), th = $('pca-th');
  rho.addEventListener('input', () => { P.rho = +rho.value; pBuild(); });
  sr.addEventListener('input', () => { P.sr = +sr.value; pBuild(); });
  th.addEventListener('input', () => { P.th = +th.value; pDraw(); });
  $('pca-align').addEventListener('click', () => { P.th = Math.round(P.eig.a1 * 180 / Math.PI) % 180; th.value = P.th; pDraw(); });
  $('pca-again').addEventListener('click', pNew);

  // ---------- simulador 2: gráfico de sedimentación ----------
  const NP = 10, NS = 200;
  const Q = { m: 2, sd: 0.8, F: [], E: [], lam: [] };
  function jacobiEig(A) { // valores propios de una matriz simétrica (método de Jacobi cíclico)
    const n = A.length, a = A.map(r => r.slice());
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-18) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const t0 = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(t0 || 1) / (Math.abs(t0) + Math.sqrt(t0 * t0 + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      }
    }
    return a.map((r, i) => r[i]).sort((x, y) => y - x);
  }
  function sNew() { Q.F = Array.from({ length: NS }, () => [randn(), randn(), randn()]); Q.E = Array.from({ length: NS }, () => Array.from({ length: NP }, randn)); sBuild(); }
  function sBuild() {
    const X = Q.F.map((f, i) => Array.from({ length: NP }, (_, j) => (Q.m ? f[j % Q.m] : 0) + Q.sd * Q.E[i][j]));
    const mu = new Array(NP).fill(0), sd = new Array(NP).fill(0);
    for (const r of X) r.forEach((v, j) => mu[j] += v / NS);
    for (const r of X) r.forEach((v, j) => sd[j] += (v - mu[j]) ** 2 / (NS - 1));
    const Z = X.map(r => r.map((v, j) => (v - mu[j]) / Math.sqrt(sd[j])));
    const C = Array.from({ length: NP }, () => new Array(NP).fill(0));
    for (const r of Z) for (let i = 0; i < NP; i++) for (let j = i; j < NP; j++) C[i][j] += r[i] * r[j] / (NS - 1);
    for (let i = 0; i < NP; i++) for (let j = 0; j < i; j++) C[i][j] = C[j][i];
    Q.lam = jacobiEig(C);
    sDraw();
  }
  function sDraw() {
    if (!Q.lam.length) return;
    const lam = Q.lam, tot = lam.reduce((a, b) => a + b, 0);
    let cum = 0, n80 = 0; const cs = lam.map(l => (cum += l) / tot);
    n80 = cs.findIndex(c => c >= 0.8 - 1e-9) + 1;
    $('pca-noise-v').textContent = fmt(Q.sd, 1);
    $('pca-s-l1').textContent = fmt(lam[0], 2);
    $('pca-s-p1').textContent = pct(lam[0] / tot, 1);
    $('pca-s-80').textContent = n80;
    $('pca-s-k').textContent = lam.filter(l => l > 1).length;
    $('pca-sc-head').textContent = Q.m ? `${Q.m} factor${Q.m > 1 ? 'es' : ''} + ruido` : 'variables independientes';
    const fr = fit($('pca-c-scree')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 36, r: 44, t: 14, b: 26 };
    const hi = Math.max(2, Math.ceil(lam[0] + 0.3));
    const bw = (w - pad.l - pad.r) / NP, X = k => pad.l + (k + .5) * bw;
    const Y = v => h - pad.b - v / hi * (h - pad.t - pad.b), Yc = c => h - pad.b - c * (h - pad.t - pad.b);
    ctx.font = mono(); ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    const st = hi > 6 ? 2 : 1;
    for (let v = 0; v <= hi; v += st) { const y = Math.round(Y(v)) + .5; ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = accent; ctx.textAlign = 'right'; ctx.fillText(v, pad.l - 6, y); }
    ctx.fillStyle = hot; ctx.textAlign = 'left';
    for (let c = 0; c <= 1.0001; c += 0.25) ctx.fillText(Math.round(c * 100) + ' %', w - pad.r + 5, Yc(c));
    ctx.textBaseline = 'alphabetic';
    lam.forEach((l, k) => { ctx.fillStyle = accent; ctx.globalAlpha = l > 1 ? .85 : .45; ctx.fillRect(X(k) - bw * .32, Y(l), bw * .64, h - pad.b - Y(l)); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(1)); ctx.lineTo(w - pad.r, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = hot; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Yc(0.8)); ctx.lineTo(w - pad.r, Yc(0.8)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); cs.forEach((c, k) => k ? ctx.lineTo(X(k), Yc(c)) : ctx.moveTo(X(k), Yc(c))); ctx.stroke();
    cs.forEach((c, k) => { ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(k), Yc(c), 3.2, 0, 7); ctx.fill(); });
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    lam.forEach((l, k) => ctx.fillText(k + 1, X(k), h - 8));
  }
  segBind('pca-fac', b => { Q.m = +b.dataset.f; sBuild(); });
  $('pca-noise').addEventListener('input', e => { Q.sd = +e.target.value; sBuild(); });
  $('pca-sc-again').addEventListener('click', sNew);

  M.draw['pca'] = () => { pDraw(); sDraw(); };
  M.init.push(() => { pNew(); sNew(); });
})();
