/* StatEdx · sesión kriging: Interpolación espacial y kriging */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const sgn = (v, d) => (v < 0 ? '−' : '') + fmt(Math.abs(v), d);

  // ---------- álgebra: resolver A x = b (eliminación con pivoteo parcial) ----------
  function solve(A, b) {
    const n = b.length, M2 = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
      [M2[c], M2[p]] = [M2[p], M2[c]];
      const d = M2[c][c] || 1e-12;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = M2[r][c] / d; if (!f) continue; for (let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k]; }
    }
    return M2.map((r, i) => r[n] / (r[i] || 1e-12));
  }
  function inverse(A) {
    const n = A.length, M2 = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
      [M2[c], M2[p]] = [M2[p], M2[c]];
      const d = M2[c][c] || 1e-12; for (let k = 0; k < 2 * n; k++) M2[c][k] /= d;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = M2[r][c]; if (!f) continue; for (let k = 0; k < 2 * n; k++) M2[r][k] -= f * M2[c][k]; }
    }
    return M2.map(r => r.slice(n));
  }
  // Kriging ordinario en forma de covarianzas. covZ(i,j) incluye la pepita en la diagonal;
  // covS(h) es la covarianza de la señal (sin pepita): predice la señal y filtra el error.
  function okSystem(n, covZ) {
    const A = []; for (let i = 0; i <= n; i++) { A.push([]); for (let j = 0; j <= n; j++) A[i].push(i < n && j < n ? covZ(i, j) + (i === j ? 1e-9 : 0) : (i === n && j === n ? 0 : 1)); }
    return inverse(A);
  }
  function okPredict(Ainv, n, c0vec, z, sill) { // c0vec: covarianzas señal muestra-punto
    const b = [...c0vec, 1], w = Ainv.map(r => r.reduce((s, v, k) => s + v * b[k], 0));
    let pred = 0, v = sill; for (let i = 0; i < n; i++) { pred += w[i] * z[i]; v -= w[i] * c0vec[i]; } v -= w[n];
    return { pred, var: Math.max(0, v), w: w.slice(0, n) };
  }
  function idwW(ds, p) { const k = ds.findIndex(d => d < 1e-9); if (k >= 0) return ds.map((_, i) => +(i === k)); const w = ds.map(d => d ** -p), s = w.reduce((a, b) => a + b, 0); return w.map(v => v / s); }

  // ---------- laboratorio 1: transecto ----------
  const NG = 201, LEN = 10, TRUE_A = 4;
  const T = { field: null, xs: [], p: 2, a: 4, c0: 0, x0: 5, show: true, res: null };
  const gx = i => i / (NG - 1) * LEN;
  function newField() {
    const n = NG, L = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) L[i * n + j] = Math.exp(-3 * Math.abs(gx(i) - gx(j)) / TRUE_A) + (i === j ? 1e-8 : 0);
    for (let j = 0; j < n; j++) { let s = L[j * n + j]; for (let k = 0; k < j; k++) s -= L[j * n + k] ** 2; const d = Math.sqrt(Math.max(s, 1e-12)); L[j * n + j] = d;
      for (let i = j + 1; i < n; i++) { let t = L[i * n + j]; for (let k = 0; k < j; k++) t -= L[i * n + k] * L[j * n + k]; L[i * n + j] = t / d; } }
    const u = Array.from({ length: n }, () => randn());
    T.field = Array.from({ length: n }, (_, i) => { let s = 0; for (let k = 0; k <= i; k++) s += L[i * n + k] * u[k]; return 5 + s; });
    // 8 muestras estratificadas y, para ver el desagrupamiento, un par muy junto
    const set = new Set(); for (let k = 0; k < 8; k++) set.add(Math.min(NG - 1, Math.floor((k + 0.15 + 0.7 * Math.random()) * (NG - 1) / 8)));
    const any = [...set][2]; if (any + 3 < NG) set.add(any + 3);
    T.xs = [...set].sort((a, b) => a - b);
    compute1d();
  }
  function compute1d() {
    const xs = T.xs.map(gx), z = T.xs.map(i => T.field[i]), n = xs.length;
    const c = 1 - T.c0, covS = h => c * Math.exp(-3 * h / T.a);
    const covZ = (i, j) => i === j ? 1 : covS(Math.abs(xs[i] - xs[j]));
    const res = { okp: [], oks: [], idw: [] };
    if (n >= 1) {
      const Ainv = okSystem(n, covZ);
      for (let g = 0; g < NG; g++) {
        const x = gx(g), r = okPredict(Ainv, n, xs.map(s => covS(Math.abs(s - x))), z, c);
        res.okp.push(r.pred); res.oks.push(Math.sqrt(r.var));
        const w = idwW(xs.map(s => Math.abs(s - x)), T.p); res.idw.push(w.reduce((s, v, i) => s + v * z[i], 0));
      }
      const r0 = okPredict(Ainv, n, xs.map(s => covS(Math.abs(s - T.x0))), z, c);
      res.x0 = { ok: r0.pred, sd: Math.sqrt(r0.var), wok: r0.w, widw: idwW(xs.map(s => Math.abs(s - T.x0)), T.p) };
      res.x0.idw = res.x0.widw.reduce((s, v, i) => s + v * z[i], 0);
      // LOO
      if (n >= 3) {
        let eo = 0, ei = 0;
        for (let k = 0; k < n; k++) {
          const xk = xs.filter((_, i) => i !== k), zk = z.filter((_, i) => i !== k), m = n - 1;
          const Ai = okSystem(m, (i, j) => i === j ? 1 : covS(Math.abs(xk[i] - xk[j])));
          eo += (okPredict(Ai, m, xk.map(s => covS(Math.abs(s - xs[k]))), zk, c).pred - z[k]) ** 2;
          const w = idwW(xk.map(s => Math.abs(s - xs[k])), T.p); ei += (w.reduce((s, v, i) => s + v * zk[i], 0) - z[k]) ** 2;
        }
        res.cvok = Math.sqrt(eo / n); res.cvidw = Math.sqrt(ei / n);
      }
    }
    T.res = res; draw1d();
  }
  function draw1d() {
    const R = T.res; if (!R) return;
    $('kriging-x0-v').textContent = fmt(T.x0, 1); $('kriging-p-v').textContent = fmt(T.p, T.p % 1 ? 1 : 0);
    $('kriging-a-v').textContent = fmt(T.a, 1); $('kriging-c0-v').textContent = fmt(T.c0, 2);
    const n = T.xs.length;
    $('kriging-head').textContent = `${n} muestras · modelo exponencial (real: a = ${fmt(TRUE_A, 1)}, c₀ = 0)`;
    $('kriging-r-ok').textContent = R.x0 ? fmt(R.x0.ok, 2) + ' ± ' + fmt(1.96 * R.x0.sd, 2) : '–';
    $('kriging-r-idw').textContent = R.x0 ? fmt(R.x0.idw, 2) : '–';
    $('kriging-r-cvok').textContent = R.cvok != null && n >= 3 ? fmt(R.cvok, 3) : 'n ≥ 3';
    $('kriging-r-cvidw').textContent = R.cvidw != null && n >= 3 ? fmt(R.cvidw, 3) : 'n ≥ 3';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    let f = fit($('kriging-c-1d'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 30, r: 12, t: 12, b: 26 };
      let lo = Infinity, hi = -Infinity;
      for (let g = 0; g < NG; g++) { lo = Math.min(lo, T.field[g], R.okp[g] - 1.96 * R.oks[g] || 99); hi = Math.max(hi, T.field[g], R.okp[g] + 1.96 * R.oks[g] || -99); }
      lo = Math.floor(lo); hi = Math.ceil(hi);
      const X = x => pad.l + x / LEN * (w - pad.l - pad.r), Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
      T.X = X; T.padL = pad.l; T.padR = pad.r;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = lo; v <= hi; v++) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let x = 2; x <= LEN; x += 2) { const xx = Math.round(X(x)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (n) {
        ctx.fillStyle = accent; ctx.globalAlpha = .16; ctx.beginPath();
        for (let g = 0; g < NG; g++) ctx.lineTo(X(gx(g)), Y(R.okp[g] + 1.96 * R.oks[g]));
        for (let g = NG - 1; g >= 0; g--) ctx.lineTo(X(gx(g)), Y(R.okp[g] - 1.96 * R.oks[g]));
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (T.show) { ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.beginPath(); for (let g = 0; g < NG; g++) g ? ctx.lineTo(X(gx(g)), Y(T.field[g])) : ctx.moveTo(X(gx(g)), Y(T.field[g])); ctx.stroke(); }
      if (n) {
        ctx.strokeStyle = hot; ctx.lineWidth = 1.8; ctx.setLineDash([5, 3]); ctx.beginPath(); for (let g = 0; g < NG; g++) g ? ctx.lineTo(X(gx(g)), Y(R.idw[g])) : ctx.moveTo(X(gx(g)), Y(R.idw[g])); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath(); for (let g = 0; g < NG; g++) g ? ctx.lineTo(X(gx(g)), Y(R.okp[g])) : ctx.moveTo(X(gx(g)), Y(R.okp[g])); ctx.stroke();
      }
      const xx0 = Math.round(X(T.x0)) + .5; ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(xx0, pad.t); ctx.lineTo(xx0, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      for (const i of T.xs) { ctx.fillStyle = ink; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(gx(i)), Y(T.field[i]), 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, LEN, 2, h - 8, muted);
      ctx.textAlign = 'right'; for (let v = lo; v <= hi; v++) ctx.fillText(v, pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'center'; ctx.fillStyle = ink; ctx.fillText('x₀', Math.min(Math.max(xx0, pad.l + 8), w - pad.r - 8), pad.t + 10);
    }
    f = fit($('kriging-c-w'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 14, b: 26 };
      const X = x => pad.l + x / LEN * (w - pad.l - pad.r);
      let wmin = -0.2, wmax = 0.6;
      if (R.x0) for (const v of R.x0.wok.concat(R.x0.widw)) { wmin = Math.min(wmin, v); wmax = Math.max(wmax, v); }
      wmin = Math.floor(wmin * 5) / 5; wmax = Math.ceil(wmax * 5) / 5;
      const Y = v => h - pad.b - (v - wmin) / (wmax - wmin) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = wmin; v <= wmax + 1e-9; v += 0.2) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      const xx0 = Math.round(X(T.x0)) + .5; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(xx0, pad.t); ctx.lineTo(xx0, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      if (R.x0) {
        const bw = Math.max(3, Math.min(10, (w - pad.l - pad.r) / 60));
        T.xs.forEach((g, i) => {
          const x = X(gx(g));
          ctx.fillStyle = hot; ctx.globalAlpha = .75; ctx.fillRect(x - bw - 1, Math.min(Y(0), Y(R.x0.widw[i])), bw, Math.abs(Y(R.x0.widw[i]) - Y(0)));
          ctx.fillStyle = accent; ctx.globalAlpha = 1; ctx.fillRect(x + 1, Math.min(Y(0), Y(R.x0.wok[i])), bw, Math.abs(Y(R.x0.wok[i]) - Y(0)));
        });
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, LEN, 2, h - 8, muted);
      ctx.textAlign = 'right'; for (let v = wmin; v <= wmax + 1e-9; v += 0.2) ctx.fillText(sgn(Math.round(v * 10) / 10, 1), pad.l - 6, Y(v) + 4);
    }
  }
  $('kriging-c-1d').addEventListener('click', e => {
    if (!T.X) return;
    const rect = e.currentTarget.getBoundingClientRect(), px = e.clientX - rect.left;
    const x = (px - T.padL) / (rect.width - T.padL - T.padR) * LEN; if (x < 0 || x > LEN) return;
    const g = Math.round(x / LEN * (NG - 1)), near = T.xs.findIndex(i => Math.abs(T.X(gx(i)) - px) < 8);
    if (near >= 0) T.xs.splice(near, 1); else if (!T.xs.includes(g)) { T.xs.push(g); T.xs.sort((a, b) => a - b); }
    compute1d();
  });
  $('kriging-x0').addEventListener('input', e => { T.x0 = +e.target.value; compute1d(); });
  $('kriging-p').addEventListener('input', e => { T.p = +e.target.value; compute1d(); });
  $('kriging-a').addEventListener('input', e => { T.a = +e.target.value; compute1d(); });
  $('kriging-c0').addEventListener('input', e => { T.c0 = +e.target.value; compute1d(); });
  segBind('kriging-ver', b => { T.show = b.dataset.v === '1'; draw1d(); });
  $('kriging-again').addEventListener('click', newField);

  // ---------- laboratorio 2: mapa ----------
  const G = 32, NC = 400;
  const K = { view: 'ok', des: 'rand', n: 40, a: 0.4, field: null, pts: [], res: null, comp: null };
  const cell = (i, j) => [(j + .5) / G, (i + .5) / G];
  function newMap() {
    K.comp = Array.from({ length: NC }, () => { const g = Math.abs(randn()) || 1e-3; return { ox: randn() / g, oy: randn() / g, ph: Math.random() * 2 * Math.PI }; });
    newPts();
  }
  function newPts() {
    K.pts = [];
    if (K.des === 'rand') for (let k = 0; k < K.n; k++) K.pts.push([Math.random(), Math.random()]);
    else {
      const centers = Array.from({ length: 4 }, () => [0.12 + Math.random() * 0.76, 0.12 + Math.random() * 0.76]);
      for (let k = 0; k < K.n; k++) { const c = centers[k % 4]; K.pts.push([Math.min(.999, Math.max(.001, c[0] + 0.05 * randn())), Math.min(.999, Math.max(.001, c[1] + 0.05 * randn()))]); }
    }
    computeMap();
  }
  function fieldAt(x, y) { const l = K.a / 3; let s = 0; for (const c of K.comp) s += Math.cos((c.ox * x + c.oy * y) / l + c.ph); return Math.sqrt(2 / NC) * s; }
  function computeMap() {
    const cov = h => Math.exp(-3 * h / K.a), P = K.pts, n = P.length, d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const truth = []; for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) truth.push(fieldAt(...cell(i, j)));
    const z = P.map(p => fieldAt(p[0], p[1]));
    const Ainv = okSystem(n, (i, j) => i === j ? 1 : cov(d(P[i], P[j])));
    const ok = [], sd = [], idw = [];
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const s0 = cell(i, j), r = okPredict(Ainv, n, P.map(p => cov(d(p, s0))), z, 1);
      ok.push(r.pred); sd.push(Math.sqrt(r.var));
      const w = idwW(P.map(p => d(p, s0)), 2); idw.push(w.reduce((s, v, k) => s + v * z[k], 0));
    }
    const rmse = (a, b) => Math.sqrt(a.reduce((s, v, k) => s + (v - b[k]) ** 2, 0) / a.length);
    const cvBy = fold => { // fold[k] = grupo de cada muestra
      let e = 0, m = 0;
      for (const gid of new Set(fold)) {
        const tr = P.filter((_, k) => fold[k] !== gid), zt = z.filter((_, k) => fold[k] !== gid); if (tr.length < 2) continue;
        const Ai = okSystem(tr.length, (i, j) => i === j ? 1 : cov(d(tr[i], tr[j])));
        P.forEach((p, k) => { if (fold[k] !== gid) return; e += (okPredict(Ai, tr.length, tr.map(q => cov(d(q, p))), zt, 1).pred - z[k]) ** 2; m++; });
      }
      return m ? Math.sqrt(e / m) : NaN;
    };
    K.res = { truth, ok, sd, idw, z, eIdw: rmse(idw, truth), eOk: rmse(ok, truth),
      loo: cvBy(P.map((_, k) => k)), blk: cvBy(P.map(p => (p[0] < .5 ? 0 : 1) + (p[1] < .5 ? 0 : 2))) };
    drawMap();
  }
  function drawMap() {
    const R = K.res; if (!R) return;
    $('kriging-m-n-v').textContent = K.n; $('kriging-m-a-v').textContent = fmt(K.a, 2);
    $('kriging-m-idw').textContent = fmt(R.eIdw, 3); $('kriging-m-ok').textContent = fmt(R.eOk, 3);
    $('kriging-m-loo').textContent = fmt(R.loo, 3); $('kriging-m-blk').textContent = isNaN(R.blk) ? '–' : fmt(R.blk, 3);
    const names = { real: 'campo real', idw: 'IDW (p = 2)', ok: 'kriging ordinario', sd: 'desviación estándar de kriging' };
    $('kriging-m-head').textContent = names[K.view];
    const f = fit($('kriging-c-map')); if (!f) return; const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), bg = tok('--bg'), line = tok('--line'), muted = tok('--muted');
    const side = Math.min(w, h) - 20, x0 = (w - side) / 2, y0 = (h - side) / 2, cs = side / G;
    const vals = K.view === 'real' ? R.truth : K.view === 'idw' ? R.idw : K.view === 'ok' ? R.ok : R.sd;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const v = vals[i * G + j];
      if (K.view === 'sd') { ctx.fillStyle = hot; ctx.globalAlpha = Math.min(1, v); }
      else { ctx.fillStyle = v >= 0 ? hot : accent; ctx.globalAlpha = Math.min(1, Math.abs(v) / 2); }
      ctx.fillRect(x0 + j * cs, y0 + side - (i + 1) * cs, cs + .4, cs + .4);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.moveTo(x0 + side / 2 + .5, y0); ctx.lineTo(x0 + side / 2 + .5, y0 + side); ctx.moveTo(x0, y0 + side / 2 + .5); ctx.lineTo(x0 + side, y0 + side / 2 + .5); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.strokeStyle = line; ctx.strokeRect(x0 + .5, y0 + .5, side - 1, side - 1);
    for (const p of K.pts) { ctx.fillStyle = ink; ctx.strokeStyle = bg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x0 + p[0] * side, y0 + (1 - p[1]) * side, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = muted; ctx.font = mono();
    if (w - side > 150) { ctx.textAlign = 'left'; const tx = x0 + side + 12; ctx.fillText(names[K.view], tx, y0 + 12); ctx.fillText('n = ' + K.n, tx, y0 + 28); ctx.fillText('a = ' + fmt(K.a, 2), tx, y0 + 44); }
  }
  segBind('kriging-m-vista', b => { K.view = b.dataset.v; drawMap(); });
  segBind('kriging-m-dis', b => { K.des = b.dataset.d; newPts(); });
  $('kriging-m-n').addEventListener('input', e => { K.n = +e.target.value; newPts(); });
  $('kriging-m-a').addEventListener('input', e => { K.a = +e.target.value; computeMap(); });
  $('kriging-m-again').addEventListener('click', newMap);

  M.draw['kriging'] = () => { draw1d(); drawMap(); };
  M.init.push(() => { newField(); newMap(); });
})();
