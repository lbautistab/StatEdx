/* StatEdx · sesión backprop: Descenso de gradiente y retropropagación */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = (px = 11) => px + 'px ' + tok('--f-mono');
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);

  // =====================================================================
  // Simulador 1: tres optimizadores sobre una superficie de pérdida
  // =====================================================================
  const SURF = {
    cuenco: {
      label: 'L = ½(θ₁² + 10·θ₂²)', dom: [-3.5, 3.5, -2, 2], start: [-3, 1.5], min: [0, 0],
      f: (x, y) => 0.5 * (x * x + 10 * y * y),
      g: (x, y) => [x, 10 * y],
    },
    rosen: {
      label: 'L = (1 − θ₁)² + 5(θ₂ − θ₁²)²', dom: [-2, 2, -1, 3], start: [-1.6, 2.6], min: [1, 1],
      f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2,
      g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)],
    },
    dos: {
      label: 'L = (θ₁² − 1)² + 0,3θ₁ + 0,8θ₂²', dom: [-2, 2, -1.5, 1.5], start: [1.8, 1.2], min: [-1.0361, 0],
      f: (x, y) => (x * x - 1) ** 2 + 0.3 * x + 0.8 * y * y,
      g: (x, y) => [4 * x * (x * x - 1) + 0.3, 1.6 * y],
    },
  };
  const S = { surf: 'cuenco', lr: 0.02, beta: 0.9, noise: 0, start: null, it: 0, runs: [], playing: true, raf: 0 };
  const MAXIT = 300;
  const lrFrom = v => Math.pow(10, -3 + 3 * v / 100);

  function newRun(kind, p) { return { kind, p: p.slice(), v: [0, 0], m: [0, 0], s: [0, 0], t: 0, path: [p.slice()], dead: false }; }
  function reset() {
    const sf = SURF[S.surf]; const p = S.start || sf.start;
    S.it = 0; S.runs = ['gd', 'mom', 'adam'].map(k => newRun(k, p));
    if (!S.playing) setPlaying(true);
    surfDraw(); loop();
  }
  function stepAll() {
    const sf = SURF[S.surf];
    for (const r of S.runs) {
      if (r.dead) continue;
      const g = sf.g(r.p[0], r.p[1]);
      if (S.noise) { g[0] += S.noise * randn(); g[1] += S.noise * randn(); }
      if (r.kind === 'gd') { r.p[0] -= S.lr * g[0]; r.p[1] -= S.lr * g[1]; }
      else if (r.kind === 'mom') {
        for (let k = 0; k < 2; k++) { r.v[k] = S.beta * r.v[k] + g[k]; r.p[k] -= S.lr * r.v[k]; }
      } else {
        r.t++;
        for (let k = 0; k < 2; k++) {
          r.m[k] = 0.9 * r.m[k] + 0.1 * g[k]; r.s[k] = 0.999 * r.s[k] + 0.001 * g[k] * g[k];
          const mh = r.m[k] / (1 - 0.9 ** r.t), sh = r.s[k] / (1 - 0.999 ** r.t);
          r.p[k] -= S.lr * mh / (Math.sqrt(sh) + 1e-8);
        }
      }
      if (!isFinite(r.p[0]) || !isFinite(r.p[1]) || Math.abs(r.p[0]) > 1e4 || Math.abs(r.p[1]) > 1e4) r.dead = true;
      else r.path.push(r.p.slice());
    }
    S.it++;
  }
  function setPlaying(on) { S.playing = on; $('backprop-play').textContent = on ? 'Pausa' : 'Reproducir'; }
  function loop() {
    if (S.raf) return;
    const tick = () => {
      S.raf = 0;
      if (M.current !== 'backprop' || !S.playing || S.it >= MAXIT) { if (S.it >= MAXIT) setPlaying(false); return; }
      stepAll(); stepAll();
      surfDraw();
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }

  // fondo (mapa de curvas de nivel) en caché
  let bgCache = null;
  function background(w, h, pad, X, Y) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const accent = tok('--accent'), muted = tok('--muted');
    const key = [S.surf, w, h, dpr, accent, muted].join('|');
    if (bgCache && bgCache.key === key) return bgCache.cv;
    const cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sf = SURF[S.surf], [x0, x1, y0, y1] = sf.dom, cell = 2;
    const cols = Math.ceil((w - pad.l - pad.r) / cell), rows = Math.ceil((h - pad.t - pad.b) / cell);
    const fmin = sf.f(sf.min[0], sf.min[1]);
    const vals = new Float64Array(cols * rows); let fmax = 0;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = x0 + (i + .5) / cols * (x1 - x0), y = y1 - (j + .5) / rows * (y1 - y0);
      const v = sf.f(x, y) - fmin; vals[j * cols + i] = v; if (v > fmax) fmax = v;
    }
    const lf = Math.log(1 + fmax), NB = 16;
    const band = new Int16Array(cols * rows), u = new Float64Array(cols * rows);
    for (let k = 0; k < vals.length; k++) { u[k] = Math.log(1 + Math.max(vals[k], 0)) / lf; band[k] = Math.floor(u[k] * NB); }
    ctx.fillStyle = accent;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i; ctx.globalAlpha = 0.03 + 0.34 * Math.pow(1 - u[k], 2.2);
      ctx.fillRect(pad.l + i * cell, pad.t + j * cell, cell, cell);
    }
    ctx.fillStyle = muted; ctx.globalAlpha = 0.6;
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const k = j * cols + i;
      if (band[k] !== band[k + 1] || band[k] !== band[k + cols]) ctx.fillRect(pad.l + i * cell + .5, pad.t + j * cell + .5, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
    bgCache = { key, cv };
    return cv;
  }

  function fmtLoss(r) {
    if (r.dead) return 'diverge';
    const L = SURF[S.surf].f(r.p[0], r.p[1]);
    if (Math.abs(L) >= 1000) return '≫ 1 000';
    return sgn(L, Math.abs(L) < 10 ? 4 : 2);
  }

  function surfDraw() {
    const sf = SURF[S.surf];
    $('backprop-head').textContent = sf.label;
    $('backprop-lr-v').textContent = fmt(S.lr, 3);
    $('backprop-beta-v').textContent = fmt(S.beta, 2);
    $('backprop-r-it').textContent = S.it + ' / ' + MAXIT;
    $('backprop-r-gd').textContent = S.runs[0] ? fmtLoss(S.runs[0]) : '–';
    $('backprop-r-mom').textContent = S.runs[1] ? fmtLoss(S.runs[1]) : '–';
    $('backprop-r-adam').textContent = S.runs[2] ? fmtLoss(S.runs[2]) : '–';
    const f = fit($('backprop-c-surf')); if (!f) return; const { ctx, w, h } = f;
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 10, t: 8, b: 24 }, [x0, x1, y0, y1] = sf.dom;
    const X = x => pad.l + (x - x0) / (x1 - x0) * (w - pad.l - pad.r);
    const Y = y => pad.t + (y1 - y) / (y1 - y0) * (h - pad.t - pad.b);
    ctx.drawImage(background(w, h, pad, X, Y), 0, 0, w, h);
    // marco y ejes
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(pad.l + .5, pad.t + .5, w - pad.l - pad.r - 1, h - pad.t - pad.b - 1);
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = Math.ceil(x0); v <= x1; v++) ctx.fillText(sgn(v, 0), X(v), h - 8);
    ctx.textAlign = 'right';
    for (let v = Math.ceil(y0); v <= y1; v++) ctx.fillText(sgn(v, 0), pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 9), h - pad.b));
    // mínimo global
    const mx = X(sf.min[0]), my = Y(sf.min[1]);
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 5, my - 5); ctx.lineTo(mx + 5, my + 5); ctx.moveTo(mx + 5, my - 5); ctx.lineTo(mx - 5, my + 5); ctx.stroke();
    // trayectorias
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    const col = { gd: ink, mom: accent, adam: hot };
    for (const r of S.runs) {
      ctx.strokeStyle = col[r.kind]; ctx.lineWidth = 2; ctx.globalAlpha = .9; ctx.beginPath();
      r.path.forEach((p, i) => { const px = X(Math.max(-1e3, Math.min(1e3, p[0]))), py = Y(Math.max(-1e3, Math.min(1e3, p[1]))); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.globalAlpha = 1;
      const last = r.path[r.path.length - 1];
      ctx.fillStyle = col[r.kind]; ctx.strokeStyle = bg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 4.5, 0, 7); ctx.fill(); ctx.stroke();
    }
    // punto de partida
    if (S.runs[0]) { const p0 = S.runs[0].path[0]; ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p0[0]), Y(p0[1]), 7, 0, 7); ctx.stroke(); }
    ctx.restore();
  }

  function surfInit() {
    const lr = $('backprop-lr'), beta = $('backprop-beta');
    lr.addEventListener('input', () => { S.lr = lrFrom(+lr.value); reset(); });
    beta.addEventListener('input', () => { S.beta = +beta.value; reset(); });
    segBind('backprop-surf', b => { S.surf = b.dataset.s; S.start = null; bgCache = null; reset(); });
    segBind('backprop-noise', b => { S.noise = +b.dataset.n; reset(); });
    $('backprop-play').addEventListener('click', () => {
      if (S.it >= MAXIT) { reset(); return; }
      setPlaying(!S.playing); if (S.playing) loop();
    });
    $('backprop-reset').addEventListener('click', () => { S.start = null; reset(); });
    $('backprop-c-surf').addEventListener('click', e => {
      const cv = e.currentTarget, rc = cv.getBoundingClientRect(), [x0, x1, y0, y1] = SURF[S.surf].dom;
      const pad = { l: 34, r: 10, t: 8, b: 24 };
      const fx = (e.clientX - rc.left - pad.l) / (rc.width - pad.l - pad.r), fy = (e.clientY - rc.top - pad.t) / (rc.height - pad.t - pad.b);
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
      S.start = [x0 + fx * (x1 - x0), y1 - fy * (y1 - y0)];
      reset();
    });
    S.lr = lrFrom(+lr.value);
    reset();
  }

  // =====================================================================
  // Simulador 2: una red 1 → 2 → 1 por dentro
  // =====================================================================
  const P0 = { w: [0.8, -0.5], b: [0.1, 0.3], v: [1.0, -0.7], c: 0 };
  const N = { x: 1, y: 1.5, eta: 0.1, view: 'fwd', P: null, hist: [] };
  const clone = P => ({ w: P.w.slice(), b: P.b.slice(), v: P.v.slice(), c: P.c });
  function forward(P, x) {
    const z = [0, 1].map(j => P.w[j] * x + P.b[j]), a = z.map(Math.tanh);
    const yh = P.v[0] * a[0] + P.v[1] * a[1] + P.c;
    return { z, a, yh, L: 0.5 * (yh - N.y) ** 2 };
  }
  function backward(P, F, x) {
    const dy = F.yh - N.y, dv = F.a.map(a => dy * a), da = P.v.map(v => dy * v);
    const dz = da.map((d, j) => d * (1 - F.a[j] ** 2));
    return { dy, dv, dc: dy, dz, dw: dz.map(d => d * x), db: dz.slice() };
  }
  function netStep(k) {
    for (let i = 0; i < k; i++) {
      const F = forward(N.P, N.x), G = backward(N.P, F, N.x);
      for (let j = 0; j < 2; j++) { N.P.w[j] -= N.eta * G.dw[j]; N.P.b[j] -= N.eta * G.db[j]; N.P.v[j] -= N.eta * G.dv[j]; }
      N.P.c -= N.eta * G.dc;
      N.hist.push(forward(N.P, N.x).L);
      if (N.hist.length > 200) N.hist.shift();
    }
    netDraw();
  }

  function netDraw() {
    const P = N.P, F = forward(P, N.x), G = backward(P, F, N.x);
    // gradiente numérico de w1 (diferencias centradas)
    const hh = 1e-5, Pp = clone(P), Pm = clone(P); Pp.w[0] += hh; Pm.w[0] -= hh;
    const num = (forward(Pp, N.x).L - forward(Pm, N.x).L) / (2 * hh);
    const rel = Math.abs(G.dw[0] - num) / Math.max(Math.abs(G.dw[0]) + Math.abs(num), 1e-12);
    $('backprop-x-v').textContent = sgn(N.x, 1);
    $('backprop-y-v').textContent = sgn(N.y, 1);
    $('backprop-eta2-v').textContent = fmt(N.eta, 2);
    $('backprop-r-loss').textContent = fmt(F.L, 4);
    $('backprop-r-ana').textContent = sgn(G.dw[0], 5);
    $('backprop-r-num').textContent = sgn(num, 5);
    $('backprop-r-rel').textContent = rel < 1e-12 ? '< 1e−12' : rel.toExponential(1).replace('-', '−').replace('.', ',');
    $('backprop-net-head').textContent = 'ŷ = ' + sgn(F.yh, 3) + ' · y = ' + sgn(N.y, 1) + ' · pasos: ' + (N.hist.length - 1);

    const f = fit($('backprop-c-net')); if (!f) return; const { ctx, w, h } = f;
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line'), surface = tok('--surface'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 480, R = narrow ? 19 : 23, fs = narrow ? 10 : 11;
    const gh = 228; // alto del diagrama
    const nx = { x: [w * 0.08, gh / 2], h1: [w * 0.4, 52], h2: [w * 0.4, gh - 40], o: [w * 0.7, gh / 2], L: [w * 0.915, gh / 2] };
    nx.x[0] = Math.max(nx.x[0], R + 4); nx.L[0] = Math.min(nx.L[0], w - 26);
    const bwd = N.view === 'bwd';
    const edgeVal = bwd ? [G.dw[0], G.dw[1], G.dv[0], G.dv[1]] : [P.w[0], P.w[1], P.v[0], P.v[1]];
    const scale = Math.max(...edgeVal.map(Math.abs), 0.2);
    const edges = [[nx.x, nx.h1], [nx.x, nx.h2], [nx.h1, nx.o], [nx.h2, nx.o]];
    // aristas
    edges.forEach(([a, b], i) => {
      const v = edgeVal[i];
      ctx.strokeStyle = v >= 0 ? accent : hot; ctx.lineWidth = 1 + 6 * Math.abs(v) / scale; ctx.globalAlpha = bwd ? .55 : .7;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1;
    });
    ctx.strokeStyle = muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(nx.o[0] + R, nx.o[1]); ctx.lineTo(nx.L[0] - 22, nx.L[1]); ctx.stroke(); ctx.setLineDash([]);
    // etiquetas de aristas
    const tag = (txt, x, y, color) => {
      ctx.font = mono(fs); const tw = ctx.measureText(txt).width + 8;
      ctx.fillStyle = surface; ctx.globalAlpha = .92; ctx.fillRect(x - tw / 2, y - 9, tw, 17); ctx.globalAlpha = 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x - tw / 2 + .5, y - 8.5, tw - 1, 16);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + .5); ctx.textBaseline = 'alphabetic';
    };
    const names = bwd ? ['∂w₁', '∂w₂', '∂v₁', '∂v₂'] : ['w₁', 'w₂', 'v₁', 'v₂'];
    edges.forEach(([a, b], i) => {
      const t = 0.5, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      tag((narrow ? '' : names[i] + ' ') + sgn(edgeVal[i], 2), x, y, edgeVal[i] >= 0 ? accent : hot);
    });
    // nodos
    const node = (p, label, val, sub) => {
      ctx.fillStyle = bg; ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = '600 ' + mono(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(val, p[0], p[1] + .5); ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = muted; ctx.font = mono(fs); ctx.fillText(label, p[0], p[1] - R - 6);
      if (sub) ctx.fillText(sub, p[0], p[1] + R + 14);
    };
    node(nx.x, 'x', sgn(N.x, 1), '');
    if (bwd) {
      node(nx.h1, 'δ₁', sgn(G.dz[0], 2), '∂b₁ ' + sgn(G.db[0], 2));
      node(nx.h2, 'δ₂', sgn(G.dz[1], 2), '∂b₂ ' + sgn(G.db[1], 2));
      node(nx.o, 'ŷ − y', sgn(G.dy, 2), '∂c ' + sgn(G.dc, 2));
    } else {
      node(nx.h1, 'h₁ = tanh', sgn(F.a[0], 2), 'b₁ ' + sgn(P.b[0], 2));
      node(nx.h2, 'h₂ = tanh', sgn(F.a[1], 2), 'b₂ ' + sgn(P.b[1], 2));
      node(nx.o, 'ŷ', sgn(F.yh, 2), 'c ' + sgn(P.c, 2));
    }
    // caja de la pérdida
    const lw = 44, lh = 30;
    ctx.fillStyle = bg; ctx.strokeStyle = hot; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(nx.L[0] - lw / 2, nx.L[1] - lh / 2, lw, lh, 6) : ctx.rect(nx.L[0] - lw / 2, nx.L[1] - lh / 2, lw, lh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '600 ' + mono(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(F.L, 2), nx.L[0], nx.L[1] + .5); ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = muted; ctx.font = mono(fs); ctx.fillText('L', nx.L[0], nx.L[1] - lh / 2 - 6);
    if (bwd) { ctx.fillText('← δ', (nx.o[0] + nx.L[0]) / 2, nx.o[1] + 22); }

    // curva de la pérdida por paso
    const top = gh + 26, bot = h - 18, l = 34, r = w - 10;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, bot + .5); ctx.lineTo(r, bot + .5); ctx.moveTo(l + .5, top); ctx.lineTo(l + .5, bot); ctx.stroke();
    const hs = N.hist, Lmax = Math.max(...hs, 1e-6), n = Math.max(hs.length - 1, 10);
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    ctx.fillText(fmt(Lmax, Lmax < 1 ? 2 : 1), l - 4, top + 8); ctx.fillText('0', l - 4, bot);
    ctx.textAlign = 'left'; ctx.fillText('pérdida por paso', l + 6, top - 6);
    ctx.textAlign = 'right'; ctx.fillText(String(hs.length - 1), r, bot + 14);
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
    hs.forEach((v, i) => { const px = l + i / n * (r - l), py = bot - v / Lmax * (bot - top); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
    const lx = l + (hs.length - 1) / n * (r - l), ly = bot - hs[hs.length - 1] / Lmax * (bot - top);
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, 7); ctx.fill();
  }

  function netReset() { N.P = clone(P0); N.hist = [forward(N.P, N.x).L]; netDraw(); }
  function netInit() {
    const xs = $('backprop-x'), ys = $('backprop-y'), es = $('backprop-eta2');
    xs.addEventListener('input', () => { N.x = +xs.value; N.hist = [forward(N.P, N.x).L]; netDraw(); });
    ys.addEventListener('input', () => { N.y = +ys.value; N.hist = [forward(N.P, N.x).L]; netDraw(); });
    es.addEventListener('input', () => { N.eta = +es.value; netDraw(); });
    segBind('backprop-view', b => { N.view = b.dataset.v; netDraw(); });
    $('backprop-step').addEventListener('click', () => netStep(1));
    $('backprop-step10').addEventListener('click', () => netStep(10));
    $('backprop-reset2').addEventListener('click', netReset);
    netReset();
  }

  M.draw['backprop'] = () => { surfDraw(); if (N.P) netDraw(); if (S.playing) loop(); };
  M.init.push(() => { surfInit(); netInit(); });
})();
