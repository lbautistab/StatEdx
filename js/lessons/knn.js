/* StatEdx · sesión knn: k vecinos más cercanos */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  function marker(ctx, x, y, cls, r, fill, edge) {
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath();
    if (cls) ctx.rect(x - r * .9, y - r * .9, r * 1.8, r * 1.8); else ctx.arc(x, y, r, 0, 7);
    ctx.fill(); ctx.stroke();
  }

  // ---------- simulador 1: frontera de k-NN ----------
  const NTR = 160, NTE = 400, KMAX = 59, GX = 72, GY = 56;
  const DOM = { mix: { x0: -2.6, x1: 2.8, y0: -2.3, y1: 2.5 }, moons: { x0: -1.7, x1: 2.7, y0: -1.25, y1: 1.75 } };
  const CEN = [[[-1.1, 0.9], [0.5, 1.4], [1.5, -0.7]], [[-0.9, -1.1], [0.3, -0.1], [1.7, 1.0]]];
  const K = { k: 7, q: 2, s: 1, data: 'mix', tr: [], te: [], err: null, map: null, mapKey: '', qx: 0.15, qy: 0.6 };

  function gen(c) {
    if (K.data === 'moons') {
      const t = Math.PI * Math.random();
      return [(c ? 1 - Math.cos(t) : Math.cos(t)) + 0.22 * randn(), (c ? 0.5 - Math.sin(t) : Math.sin(t)) + 0.22 * randn(), c];
    }
    const m = CEN[c][Math.floor(Math.random() * 3)];
    return [m[0] + 0.5 * randn(), m[1] + 0.5 * randn(), c];
  }
  // distancia con la métrica y la escala elegidas (en modo "10×" la diferencia en x₂ se multiplica por 10)
  const dist = (ax, ay, bx, by) => {
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by) * K.s;
    return K.q === 2 ? Math.sqrt(dx * dx + dy * dy) : dx + dy;
  };
  function neighbors(x, y) {
    const d = new Float64Array(NTR), idx = new Uint16Array(NTR);
    for (let i = 0; i < NTR; i++) { d[i] = dist(x, y, K.tr[i][0], K.tr[i][1]); idx[i] = i; }
    idx.sort((a, b) => d[a] - d[b]);
    return { idx, d };
  }
  // voto entre los k primeros (k impar: sin empates)
  const votes = (idx, k) => { let b = 0; for (let j = 0; j < k; j++) b += K.tr[idx[j]][2]; return b; };

  function computeErr() {
    const errTr = new Float64Array(KMAX + 1), errTe = new Float64Array(KMAX + 1);
    const run = (pts, out) => {
      for (const p of pts) {
        const { idx } = neighbors(p[0], p[1]);
        let b = 0;
        for (let k = 1; k <= KMAX; k++) {
          b += K.tr[idx[k - 1]][2];
          if (k % 2) { const pred = b * 2 > k ? 1 : 0; if (pred !== p[2]) out[k] += 1; }
        }
      }
      for (let k = 1; k <= KMAX; k += 2) out[k] /= pts.length;
    };
    run(K.tr, errTr); run(K.te, errTe);
    K.err = { tr: errTr, te: errTe };
  }
  function kNew() {
    K.tr = []; K.te = [];
    for (let i = 0; i < NTR; i++) K.tr.push(gen(i % 2));
    for (let i = 0; i < NTE; i++) K.te.push(gen(i % 2));
    K.ver = (K.ver || 0) + 1;
    computeErr(); kDraw();
  }
  function buildMap() {
    const key = [K.k, K.q, K.s, K.ver].join('|');
    if (K.mapKey === key && K.map) return K.map;
    const d = DOM[K.data], P = new Float32Array(GX * GY);
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      const x = d.x0 + (gx + .5) / GX * (d.x1 - d.x0), y = d.y1 - (gy + .5) / GY * (d.y1 - d.y0);
      P[gy * GX + gx] = votes(neighbors(x, y).idx, K.k) / K.k;
    }
    K.map = P; K.mapKey = key; return P;
  }

  function kDraw() {
    if (!K.tr.length) return;
    const k = K.k, e = K.err;
    let best = 1; for (let j = 3; j <= KMAX; j += 2) if (e.te[j] < e.te[best] - 1e-12) best = j;
    const nb = neighbors(K.qx, K.qy), b = votes(nb.idx, k), a = k - b;
    $('knn-k-v').textContent = k;
    $('knn-r-tr').textContent = pct(e.tr[k], 1);
    $('knn-r-te').textContent = pct(e.te[k], 1);
    $('knn-r-vote').textContent = `${a} A · ${b} B → ${b > a ? 'B' : 'A'}`;
    $('knn-r-best').textContent = `${best} (${pct(e.te[best], 1)})`;
    $('knn-head').textContent = `k = ${k} · n/k ≈ ${Math.round(NTR / k)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');

    let fr = fit($('knn-map'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const d = DOM[K.data];
      const X = v => (v - d.x0) / (d.x1 - d.x0) * w, Y = v => h - (v - d.y0) / (d.y1 - d.y0) * h;
      const P = buildMap(), off = K.off || (K.off = document.createElement('canvas'));
      off.width = GX; off.height = GY; const o = off.getContext('2d'); o.clearRect(0, 0, GX, GY);
      for (let i = 0; i < GX * GY; i++) {
        const p = P[i]; o.fillStyle = p > .5 ? hot : accent; o.globalAlpha = 0.07 + 0.3 * Math.abs(p - .5) * 2;
        o.fillRect(i % GX, Math.floor(i / GX), 1, 1);
      }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
      for (const p of K.tr) marker(ctx, X(p[0]), Y(p[1]), p[2], 3.3, p[2] ? hot : accent, bg);
      // vecindario del punto nuevo: radio = distancia al k-ésimo vecino
      const r = nb.d[nb.idx[k - 1]], qx = X(K.qx), qy = Y(K.qy);
      const rx = r / (d.x1 - d.x0) * w, ry = r / K.s / (d.y1 - d.y0) * h;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.globalAlpha = .85; ctx.beginPath();
      if (K.q === 2) ctx.ellipse(qx, qy, rx, ry, 0, 0, 7);
      else { ctx.moveTo(qx + rx, qy); ctx.lineTo(qx, qy - ry); ctx.lineTo(qx - rx, qy); ctx.lineTo(qx, qy + ry); ctx.closePath(); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = .7; ctx.lineWidth = 1;
      for (let j = 0; j < k; j++) { const p = K.tr[nb.idx[j]]; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(X(p[0]), Y(p[1])); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (let j = 0; j < k; j++) { const p = K.tr[nb.idx[j]]; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 6, 0, 7); ctx.stroke(); }
      ctx.fillStyle = b > a ? hot : accent; ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(qx, qy - 8); ctx.lineTo(qx + 7, qy + 5); ctx.lineTo(qx - 7, qy + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText('x₁ →', 6, h - 6);
      ctx.save(); ctx.translate(12, 40); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.fillText('x₂ →', 0, 0); ctx.restore();
    }

    fr = fit($('knn-err'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      let top = 0; for (let j = 1; j <= KMAX; j += 2) top = Math.max(top, e.te[j], e.tr[j]);
      const hi = Math.max(0.2, Math.ceil(top * 10 + 0.5) / 10), step = hi > 0.4 ? 0.1 : 0.05;
      const pad = { l: 44, r: 14, t: 14, b: 26 };
      const X = kk => pad.l + (kk - 1) / (KMAX - 1) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - v / hi * (h - pad.t - pad.b);
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let v = 0; v <= hi + 1e-9; v += step) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v * 100) + ' %', pad.l - 6, y); }
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = ink; ctx.globalAlpha = .14; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X(k), pad.t); ctx.lineTo(X(k), h - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
      const curve = (arr, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); for (let j = 1; j <= KMAX; j += 2) { const y = Y(arr[j]); j === 1 ? ctx.moveTo(X(j), y) : ctx.lineTo(X(j), y); } ctx.stroke(); };
      curve(e.tr, accent); curve(e.te, hot);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(best), Y(e.te[best]), 7, 0, 7); ctx.stroke();
      for (const [v, col] of [[e.tr[k], accent], [e.te[k], hot]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(k), Y(v), 4.5, 0, 7); ctx.fill(); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const kk of [1, 11, 21, 31, 41, 51, 59]) ctx.fillText(kk, X(kk), h - 8);
      ctx.textAlign = 'right'; ctx.fillText('k', w - pad.r, h - pad.b - 6);
    }
  }

  $('knn-k-in').addEventListener('input', ev => { K.k = +ev.target.value; kDraw(); });
  segBind('knn-met', bt => { K.q = +bt.dataset.m; computeErr(); kDraw(); });
  segBind('knn-sc', bt => { K.s = +bt.dataset.s; computeErr(); kDraw(); });
  segBind('knn-data', bt => { K.data = bt.dataset.d; const d = DOM[K.data]; K.qx = (d.x0 + d.x1) / 2; K.qy = (d.y0 + d.y1) / 2 + 0.2; kNew(); });
  $('knn-again').addEventListener('click', kNew);
  $('knn-map').addEventListener('click', ev => {
    const cv = ev.currentTarget, rc = cv.getBoundingClientRect(), d = DOM[K.data];
    K.qx = d.x0 + (ev.clientX - rc.left) / rc.width * (d.x1 - d.x0);
    K.qy = d.y1 - (ev.clientY - rc.top) / rc.height * (d.y1 - d.y0);
    kDraw();
  });

  // ---------- simulador 2: concentración de distancias ----------
  const PS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200], NDIM = 500;
  const D = { i: 1, rel: [], ratio: 0 };
  const sup = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
  function dimNew() {
    const p = PS[D.i], q = Array.from({ length: p }, Math.random), ds = new Float64Array(NDIM);
    for (let i = 0; i < NDIM; i++) { let s = 0; for (let j = 0; j < p; j++) { const t = Math.random() - q[j]; s += t * t; } ds[i] = Math.sqrt(s); }
    let mn = Infinity, mx = 0; for (const v of ds) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    D.rel = Array.from(ds, v => v / mx); D.ratio = mn / mx;
    dimDraw();
  }
  function dimDraw() {
    if (!D.rel.length) return;
    const p = PS[D.i];
    $('knn-p-v').textContent = p; $('knn-d-p').textContent = p;
    $('knn-d-ratio').textContent = fmt(D.ratio, 3);
    $('knn-d-side').textContent = fmt(Math.pow(0.1, 1 / p), 3);
    $('knn-d-n').textContent = p === 1 ? '100' : p === 2 ? '10 000' : '10' + sup(2 * p);
    $('knn-dim-head').textContent = `${NDIM} puntos uniformes en [0, 1]${p > 1 ? sup(p) : ''}`;
    const fr = fit($('knn-dim-c')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const NB = 40, cnt = new Array(NB).fill(0);
    for (const v of D.rel) cnt[Math.min(NB - 1, Math.floor(v * NB))]++;
    const cmax = Math.max(...cnt);
    const pad = { l: 14, r: 14, t: 12, b: 26 };
    const X = v => pad.l + v * (w - pad.l - pad.r), Y = c => h - pad.b - c / cmax * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = 0; v <= 1.0001; v += 0.1) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = .75; ctx.fillStyle = accent;
    const bw = (w - pad.l - pad.r) / NB;
    cnt.forEach((c, i) => { if (c) ctx.fillRect(X(i / NB) + 1, Y(c), bw - 2, h - pad.b - Y(c)); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hot; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(D.ratio), pad.t); ctx.lineTo(X(D.ratio), h - pad.b); ctx.stroke();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let v = 0; v <= 1.0001; v += 0.2) ctx.fillText(fmt(v, 1), X(v), h - 8);
  }
  $('knn-p').addEventListener('input', ev => { D.i = +ev.target.value; dimNew(); });
  $('knn-dim-again').addEventListener('click', dimNew);

  M.draw['knn'] = () => { kDraw(); dimDraw(); };
  M.init.push(() => { kNew(); dimNew(); });
})();
