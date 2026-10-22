/* StatEdx · sesión perceptron: El perceptrón y las redes neuronales */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);
  function marker(ctx, x, y, cls, r, fill, edge) {
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath();
    if (cls > 0) ctx.rect(x - r * .9, y - r * .9, r * 1.8, r * 1.8); else ctx.arc(x, y, r, 0, 7);
    ctx.fill(); ctx.stroke();
  }

  // ---------- simulador 1: regla del perceptrón ----------
  const N = 60, LIM = 3.2, MAXU = 2000;
  const P = { data: 'sep', eta: 1, pts: [], w: [0, 0], b: 0, ptr: 0, n: 0, hist: [], last: -1, done: false, timer: 0 };
  const uni = () => (Math.random() * 2 - 1) * 2.9;
  function gen() {
    const pts = [];
    if (P.data === 'sep' || P.data === 'close') {
      const a = Math.random() * Math.PI * 2, u = [Math.cos(a), Math.sin(a)], c = (Math.random() - .5) * 1.2, gap = P.data === 'sep' ? 0.55 : 0.07;
      while (pts.length < N) { const x = [uni(), uni()], m = u[0] * x[0] + u[1] * x[1] + c; if (Math.abs(m) >= gap) pts.push([x[0], x[1], m > 0 ? 1 : -1]); }
    } else if (P.data === 'over') {
      for (let i = 0; i < N; i++) { const y = i % 2 ? 1 : -1; pts.push([0.8 * y + 0.95 * randn(), 0.5 * y + 0.95 * randn(), y]); }
    } else {
      for (let i = 0; i < N; i++) { const sx = i % 2 ? 1 : -1, sy = (i >> 1) % 2 ? 1 : -1; pts.push([1.5 * sx + 0.55 * randn(), 1.5 * sy + 0.55 * randn(), sx * sy]); }
    }
    P.pts = pts.map(p => [Math.max(-3.1, Math.min(3.1, p[0])), Math.max(-3.1, Math.min(3.1, p[1])), p[2]]);
  }
  const wrong = p => p[2] * (P.w[0] * p[0] + P.w[1] * p[1] + P.b) <= 0;
  const nErr = () => P.pts.reduce((s, p) => s + (wrong(p) ? 1 : 0), 0);
  function reset() { stop(); P.w = [0, 0]; P.b = 0; P.ptr = 0; P.n = 0; P.last = -1; P.done = false; P.hist = [nErr()]; pDraw(); }
  function update(i) {
    const p = P.pts[i];
    P.w[0] += P.eta * p[2] * p[0]; P.w[1] += P.eta * p[2] * p[1]; P.b += P.eta * p[2];
    P.n++; P.last = i; P.hist.push(nErr());
  }
  function step() {
    if (P.done || P.n >= MAXU) return false;
    for (let k = 0; k < N; k++) {
      const i = (P.ptr + k) % N;
      if (wrong(P.pts[i])) { update(i); P.ptr = (i + 1) % N; return true; }
    }
    P.done = true; return false;
  }
  function epoch() {
    stop();
    if (P.done) return;
    let any = false;
    for (let k = 0; k < N && P.n < MAXU; k++) { const i = (P.ptr + k) % N; if (wrong(P.pts[i])) { update(i); any = true; } }
    if (!any) P.done = true; else if (!nErr()) P.done = true;
    pDraw();
  }
  function stop() { if (P.timer) { clearTimeout(P.timer); P.timer = 0; } $('perceptron-run').textContent = 'Ejecutar'; }
  function run() {
    if (P.timer) { stop(); return; }
    if (P.done || P.n >= MAXU) reset();
    $('perceptron-run').textContent = 'Detener';
    const tick = () => {
      if (M.current !== 'perceptron') { stop(); return; }
      for (let r = 0; r < (P.n > 200 ? 5 : 1); r++) step();
      if (!P.done && !nErr()) P.done = true;
      pDraw();
      if (P.done || P.n >= MAXU) { stop(); return; }
      P.timer = setTimeout(tick, P.n > 30 ? 30 : 140);
    };
    tick();
  }

  function pDraw() {
    if (!P.pts.length) return;
    const e = nErr();
    $('perceptron-eta-v').textContent = fmt(P.eta, P.eta % 1 ? 1 : 0);
    $('perceptron-r-n').textContent = P.n;
    $('perceptron-r-e').textContent = `${e} de ${N}`;
    $('perceptron-r-w').textContent = `(${sgn(P.w[0], 2)}; ${sgn(P.w[1], 2)})`;
    $('perceptron-r-b').textContent = sgn(P.b, 2);
    $('perceptron-head').textContent = P.done && !e ? 'convergió: todos bien clasificados' : P.n >= MAXU ? 'se detuvo tras ' + MAXU + ' correcciones sin converger' : P.n ? 'aprendiendo…' : 'w = 0, b = 0';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');

    let fr = fit($('perceptron-c'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const sc = Math.min(w, h) / (2 * LIM), ox = w / 2, oy = h / 2;
      const X = v => ox + v * sc, Y = v => oy - v * sc, ix = px => (px - ox) / sc, iy = py => (oy - py) / sc;
      // semiplanos
      const G = 48, off = P.off || (P.off = document.createElement('canvas'));
      off.width = G; off.height = G; const o = off.getContext('2d'); o.clearRect(0, 0, G, G); o.globalAlpha = .14;
      for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
        const x = ix((gx + .5) / G * w), y = iy((gy + .5) / G * h);
        o.fillStyle = P.w[0] * x + P.w[1] * y + P.b > 0 ? hot : accent; o.fillRect(gx, gy, 1, 1);
      }
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, h);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .5;
      for (let g = -3; g <= 3; g++) { ctx.beginPath(); ctx.moveTo(Math.round(X(g)) + .5, 0); ctx.lineTo(Math.round(X(g)) + .5, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, Math.round(Y(g)) + .5); ctx.lineTo(w, Math.round(Y(g)) + .5); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const nw = Math.hypot(P.w[0], P.w[1]);
      if (nw > 1e-9) {
        // frontera w·x + b = 0
        const u = [P.w[0] / nw, P.w[1] / nw], f = [-P.b * u[0] / nw, -P.b * u[1] / nw], t = [-u[1], u[0]], R = 3 * LIM;
        ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X(f[0] - t[0] * R), Y(f[1] - t[1] * R)); ctx.lineTo(X(f[0] + t[0] * R), Y(f[1] + t[1] * R)); ctx.stroke();
        // vector w desde la frontera
        const ax = X(f[0]), ay = Y(f[1]), bx = X(f[0] + u[0] * 1.1), by = Y(f[1] + u[1] * 1.1);
        if (ax > -20 && ax < w + 20 && ay > -20 && ay < h + 20) {
          ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          const an = Math.atan2(by - ay, bx - ax); ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 9 * Math.cos(an - .4), by - 9 * Math.sin(an - .4)); ctx.lineTo(bx - 9 * Math.cos(an + .4), by - 9 * Math.sin(an + .4)); ctx.closePath(); ctx.fill();
          ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('w', bx + 5, by - 5);
        }
      }
      P.pts.forEach((p, i) => {
        marker(ctx, X(p[0]), Y(p[1]), p[2], 3.8, p[2] > 0 ? hot : accent, bg);
        if (wrong(p) && nw > 1e-9) { ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.globalAlpha = .6; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 7, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      });
      if (P.last >= 0) { const p = P.pts[P.last]; ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 10, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
    }

    fr = fit($('perceptron-c-err'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 14, t: 14, b: 26 };
      const nx = Math.max(10, P.hist.length - 1), ymax = Math.max(4, Math.ceil(Math.max(...P.hist) / 4) * 4);
      const X = k => pad.l + k / nx * (w - pad.l - pad.r), Y = v => h - pad.b - v / ymax * (h - pad.t - pad.b);
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let q = 0; q <= 4; q++) { const v = ymax * q / 4, y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(v, pad.l - 6, y); }
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = accent; ctx.lineWidth = 1.8; ctx.beginPath();
      P.hist.forEach((v, k) => k ? ctx.lineTo(X(k), Y(v)) : ctx.moveTo(X(k), Y(v))); ctx.stroke();
      const lastV = P.hist[P.hist.length - 1];
      ctx.fillStyle = lastV ? hot : tok('--ok'); ctx.beginPath(); ctx.arc(X(P.hist.length - 1), Y(lastV), 4.5, 0, 7); ctx.fill();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const st = nx > 1000 ? 500 : nx > 400 ? 200 : nx > 100 ? 50 : nx > 40 ? 10 : nx > 20 ? 5 : 2;
      for (let k = 0; k <= nx; k += st) ctx.fillText(k, Math.min(X(k), w - pad.r - 12), h - 8);
    }
  }
  segBind('perceptron-data', b => { P.data = b.dataset.d; gen(); reset(); });
  $('perceptron-eta').addEventListener('input', e => { P.eta = +e.target.value; pDraw(); });
  $('perceptron-step').addEventListener('click', () => { stop(); step(); if (!nErr()) P.done = true; pDraw(); });
  $('perceptron-epoch').addEventListener('click', epoch);
  $('perceptron-run').addEventListener('click', run);
  $('perceptron-reset').addEventListener('click', reset);
  $('perceptron-again').addEventListener('click', () => { gen(); reset(); });

  // ---------- simulador 2: aproximación universal en 1D ----------
  const NG = 201, XS = Array.from({ length: NG }, (_, i) => i / (NG - 1));
  const U = { m: 4, act: 'relu', f: 'sin' };
  const TARGET = {
    sin: x => 0.8 * Math.sin(3 * Math.PI * x),
    step: x => x < 0.5 ? -0.6 : 0.6,
    bump: x => 0.9 * Math.exp(-(((x - 0.3) / 0.09) ** 2)) - 0.7 * Math.exp(-(((x - 0.72) / 0.11) ** 2)),
  };
  const sig = z => 1 / (1 + Math.exp(-z));
  function hidden(m) {
    if (U.act === 'relu') return Array.from({ length: m }, (_, j) => { const c = j / m; return { c, f: x => Math.max(0, x - c) }; });
    const s = 4 * m + 2;
    return Array.from({ length: m }, (_, j) => { const c = (j + .5) / m; return { c, f: x => sig(s * (x - c)) }; });
  }
  function solve(A, y, lam) { // mínimos cuadrados con una pequeña penalización (ecuaciones normales)
    const k = A[0].length, Q = Array.from({ length: k }, () => new Array(k + 1).fill(0));
    for (let r = 0; r < A.length; r++) for (let i = 0; i < k; i++) { Q[i][k] += A[r][i] * y[r]; for (let j = 0; j < k; j++) Q[i][j] += A[r][i] * A[r][j]; }
    for (let i = 0; i < k; i++) Q[i][i] += lam;
    for (let i = 0; i < k; i++) {
      let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(Q[r][i]) > Math.abs(Q[p][i])) p = r;
      [Q[i], Q[p]] = [Q[p], Q[i]];
      for (let r = 0; r < k; r++) if (r !== i) { const f = Q[r][i] / Q[i][i]; for (let c = i; c <= k; c++) Q[r][c] -= f * Q[i][c]; }
    }
    return Q.map((row, i) => row[k] / row[i]);
  }
  function uDraw() {
    const m = U.m, H = hidden(m), f = TARGET[U.f], yv = XS.map(f);
    const A = XS.map(x => [1, ...H.map(u => u.f(x))]);
    const beta = solve(A, yv, 1e-7);
    const yhat = A.map(r => r.reduce((s, v, i) => s + v * beta[i], 0));
    let mse = 0, mx = 0; yhat.forEach((v, i) => { const d = v - yv[i]; mse += d * d / NG; mx = Math.max(mx, Math.abs(d)); });
    $('perceptron-m-v').textContent = m; $('perceptron-u-m').textContent = m;
    $('perceptron-u-p').textContent = 3 * m + 1;
    $('perceptron-u-mse').textContent = mse < 1e-4 ? '< 0,0001' : fmt(mse, 4);
    $('perceptron-u-max').textContent = fmt(mx, 3);
    $('perceptron-ua-head').textContent = `ŷ(x) = v₀ + Σ vⱼ ${U.act === 'relu' ? 'ReLU' : 'σ'}(wⱼx + bⱼ)`;
    const fr = fit($('perceptron-c-ua')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 36, r: 14, t: 12, b: 26 }, lo = -1.2, hi = 1.2;
    const X = x => pad.l + x * (w - pad.l - pad.r), Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
    ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let v = -1; v <= 1.001; v += 0.5) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(sgn(v, 1), pad.l - 6, y); }
    ctx.textBaseline = 'alphabetic';
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    // aportes de cada neurona: vⱼ·hⱼ(x), centrados para que se vean
    ctx.strokeStyle = hot; ctx.lineWidth = 1.2; ctx.globalAlpha = m > 20 ? .18 : .32;
    H.forEach((u, j) => { const v = beta[j + 1]; const mean = XS.reduce((s, x) => s + v * u.f(x), 0) / NG; ctx.beginPath(); XS.forEach((x, i) => { const y = Y(v * u.f(x) - mean); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }); ctx.stroke(); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); XS.forEach((x, i) => { const y = Y(yv[i]); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.beginPath(); XS.forEach((x, i) => { const y = Y(yhat[i]); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }); ctx.stroke();
    ctx.restore();
    // posición de cada quiebre o centro
    ctx.fillStyle = hot; H.forEach(u => { ctx.beginPath(); ctx.moveTo(X(u.c), h - pad.b - 7); ctx.lineTo(X(u.c) + 4, h - pad.b); ctx.lineTo(X(u.c) - 4, h - pad.b); ctx.closePath(); ctx.fill(); });
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let x = 0; x <= 1.0001; x += 0.25) ctx.fillText(fmt(x, 2), X(x), h - 8);
  }
  $('perceptron-m').addEventListener('input', e => { U.m = +e.target.value; uDraw(); });
  segBind('perceptron-act-seg', b => { U.act = b.dataset.a; uDraw(); });
  segBind('perceptron-f', b => { U.f = b.dataset.f; uDraw(); });

  M.draw['perceptron'] = () => { pDraw(); uDraw(); };
  M.init.push(() => { gen(); reset(); uDraw(); });
})();
