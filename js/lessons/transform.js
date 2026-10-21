/* StatEdx · sesión transform: Transformación y escalamiento de variables */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const num = (v, d = 0) => { const [i, f] = fmt(Math.abs(v), d).replace(/\./g, '').split(','); return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? ',' + f : ''); };   // miles con espacio
  const sgn = (v, d) => (v < 0 ? '−' : '') + num(Math.abs(v), d);
  function niceStep(range, maxTicks) {
    const raw = range / Math.max(1, maxTicks), p = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
    return 10 * p;
  }
  const decs = step => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  // generador con semilla (para que el laboratorio 2 sea reproducible)
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0, y = 0; while (!x) x = u(); y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n };
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = (a, m = mean(a)) => Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  function skew(a) {
    const m = mean(a), n = a.length; let m2 = 0, m3 = 0;
    for (const v of a) { const d = v - m; m2 += d * d; m3 += d * d * d; }
    m2 /= n; m3 /= n; return m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
  }
  const quant = (sorted, p) => { const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); };

  // ================= laboratorio 1: Box-Cox =================
  const BC = { src: 'ing', lam: 1, x: [], grid: [], ll: [], lhat: 1, ci: [1, 1], sk0: 0 };
  const LMIN = -1, LMAX = 2.5, LSTEP = 0.01;
  const bc = (x, l) => Math.abs(l) < 1e-9 ? Math.log(x) : (Math.pow(x, l) - 1) / l;

  function bcSample() {
    const n = 300, x = [];
    for (let i = 0; i < n; i++) {
      let v;
      if (BC.src === 'ing') v = Math.exp(Math.log(2.5) + 0.6 * randn());              // miles de dólares, lognormal
      else if (BC.src === 'tie') v = -5 * Math.log((1 - Math.random()) * (1 - Math.random()));  // gamma(2, 5): suma de dos exponenciales
      else { do v = 50 + 8 * randn(); while (v <= 1); }
      x.push(Math.max(v, 1e-3));
    }
    BC.x = x;
    const slog = x.reduce((s, v) => s + Math.log(v), 0);
    BC.grid = []; BC.ll = [];
    let best = -Infinity, bi = 0;
    for (let l = LMIN, i = 0; l <= LMAX + 1e-9; l += LSTEP, i++) {
      const y = x.map(v => bc(v, l)), m = mean(y);
      const s2 = y.reduce((s, v) => s + (v - m) ** 2, 0) / n;
      const ll = -n / 2 * Math.log(s2) + (l - 1) * slog;
      BC.grid.push(l); BC.ll.push(ll);
      if (ll > best) { best = ll; bi = i; }
    }
    BC.lhat = BC.grid[bi];
    let lo = bi, hi = bi;
    while (lo > 0 && BC.ll[lo - 1] >= best - 1.92) lo--;
    while (hi < BC.grid.length - 1 && BC.ll[hi + 1] >= best - 1.92) hi++;
    BC.ci = [BC.grid[lo], BC.grid[hi], lo === 0, hi === BC.grid.length - 1];
    BC.sk0 = skew(x);
    drawBC();
  }
  const lamEl = $('transform-lam');
  function setLam(l) { BC.lam = Math.round(l * 20) / 20; lamEl.value = BC.lam; $('transform-lam-v').textContent = sgn(BC.lam, 2); drawBC(); }
  lamEl.addEventListener('input', () => setLam(+lamEl.value));
  $('transform-opt').addEventListener('click', () => setLam(BC.lhat));
  $('transform-new').addEventListener('click', bcSample);
  segBind('transform-src', b => { BC.src = b.dataset.s; bcSample(); });

  function lamName(l) {
    const near = [[0, 'log x'], [0.5, '√x'], [1, 'x (sin cambio)'], [-1, '−1/x'], [2, 'x²'], [-0.5, '−1/√x']];
    for (const [v, s] of near) if (Math.abs(l - v) < 0.026) return '≈ ' + s;
    return 'potencia ' + sgn(l, 2);
  }

  function drawBC() {
    if (!BC.x.length) return;
    const y = BC.x.map(v => bc(v, BC.lam)), m = mean(y), s = sd(y, m);
    $('transform-sk0').textContent = sgn(BC.sk0, 2);
    $('transform-sk1').textContent = sgn(skew(y), 2);
    $('transform-lhat').textContent = sgn(BC.lhat, 2);
    $('transform-lci').textContent = (BC.ci[2] ? '≤ ' : '') + sgn(BC.ci[0], 2) + ' a ' + (BC.ci[3] ? '≥ ' : '') + sgn(BC.ci[1], 2);
    $('transform-bc-head').textContent = 'n = 300 · λ = ' + sgn(BC.lam, 2);
    $('transform-bc-lbl').textContent = lamName(BC.lam);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // ---- histograma ----
    let f = fit($('transform-c-bc'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 12, b: 26 };
      let lo = Infinity, hi = -Infinity; for (const v of y) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const span = hi - lo || 1; lo -= span * 0.04; hi += span * 0.04;
      const B = 26, bw = (hi - lo) / B, cnt = new Array(B).fill(0);
      for (const v of y) cnt[Math.min(B - 1, Math.floor((v - lo) / bw))]++;
      const peak = Math.max(...cnt, y.length * bw * npdf(m, m, s)) * 1.08;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
      const step = niceStep(hi - lo, w < 300 ? 3 : 5), d = decs(step);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = .55; ctx.fillStyle = accent;
      cnt.forEach((c, i) => { if (!c) return; const x0 = X(lo + i * bw), x1 = X(lo + (i + 1) * bw); ctx.fillRect(x0 + .5, Y(c), Math.max(1, x1 - x0 - 1), h - pad.b - Y(c)); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 160; i++) { const v = lo + (hi - lo) * i / 160, yy = Y(y.length * bw * npdf(v, m, s)); i ? ctx.lineTo(X(v), yy) : ctx.moveTo(X(v), yy); }
      ctx.stroke();
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const xx = X(v); if (xx < pad.l + 10 || xx > w - pad.r - 10) continue; ctx.fillText(sgn(Math.abs(v) < step / 1e6 ? 0 : v, d), xx, h - 8); }
    }

    // ---- log-verosimilitud perfilada ----
    f = fit($('transform-c-ll'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 14, b: 26 };
      const best = Math.max(...BC.ll);
      const dl = BC.ll.map(v => v - best);
      const floor = Math.max(Math.min(...dl), -80), bottom = Math.min(floor, -6);
      const X = l => pad.l + (l - LMIN) / (LMAX - LMIN) * (w - pad.l - pad.r);
      const Y = v => pad.t + (Math.max(v, bottom)) / bottom * (h - pad.t - pad.b);
      // banda del IC
      ctx.fillStyle = accent; ctx.globalAlpha = .18; ctx.fillRect(X(BC.ci[0]), pad.t, X(BC.ci[1]) - X(BC.ci[0]), h - pad.t - pad.b); ctx.globalAlpha = 1;
      // rejilla
      const xs = w < 300 ? 1 : 0.5;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let l = LMIN; l <= LMAX + 1e-9; l += xs) { const xx = Math.round(X(l)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      const ys = niceStep(-bottom, 4);
      for (let v = 0; v >= bottom - 1e-9; v -= ys) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // umbral −1,92
      ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(-1.92)); ctx.lineTo(w - pad.r, Y(-1.92)); ctx.stroke(); ctx.setLineDash([]);
      // curva
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      dl.forEach((v, i) => { const xx = X(BC.grid[i]), yy = Y(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
      // λ óptimo
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(BC.lhat), pad.t); ctx.lineTo(X(BC.lhat), h - pad.b); ctx.stroke();
      // λ elegido
      const i = Math.round((BC.lam - LMIN) / LSTEP), vcur = dl[Math.max(0, Math.min(dl.length - 1, i))];
      ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(BC.lam), pad.t); ctx.lineTo(X(BC.lam), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(BC.lam), Y(vcur), 5, 0, 2 * Math.PI); ctx.fill();
      // ejes
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let l = LMIN; l <= LMAX + 1e-9; l += xs) ctx.fillText(sgn(l, xs < 1 ? 1 : 0), X(l), h - 8);
      ctx.textAlign = 'right';
      for (let v = 0; v >= bottom - 1e-9; v -= ys) ctx.fillText(sgn(v, decs(ys)), pad.l - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('Δℓ', pad.l + 4, pad.t + 10);
    }
  }

  // ================= laboratorio 2: escala y vecinos =================
  const KN = { m: 'raw', out: 0, pts: [] };
  (function makeClients() {
    const r = rng(20261021), pts = [{ edad: 30, ing: 2600, q: true }];
    for (let i = 0; i < 39; i++) {
      const edad = Math.round(18 + r.u() * 57);
      const ing = Math.round(Math.min(9000, Math.max(500, Math.exp(Math.log(2500) + 0.55 * r.n()))) / 10) * 10;
      pts.push({ edad, ing });
    }
    KN.pts = pts;
  })();
  const OUT = { edad: 52, ing: 60000, out: true };
  segBind('transform-sc', b => { KN.m = b.dataset.m; drawKN(); });
  segBind('transform-out', b => { KN.out = +b.dataset.o; drawKN(); });
  const DESC = { raw: 'sin escalar', z: "x' = (x − x̄) / s", mm: "x' = (x − mín) / (máx − mín)", rob: "x' = (x − mediana) / RIC" };

  function scaler(vals) {
    const s = [...vals].sort((a, b) => a - b);
    if (KN.m === 'raw') return v => v;
    if (KN.m === 'z') { const m = mean(vals), d = sd(vals, m); return v => (v - m) / d; }
    if (KN.m === 'mm') { const lo = s[0], hi = s[s.length - 1]; return v => (v - lo) / (hi - lo); }
    const med = quant(s, 0.5), iqr = quant(s, 0.75) - quant(s, 0.25); return v => (v - med) / iqr;
  }

  function drawKN() {
    const pts = KN.out ? [...KN.pts, OUT] : KN.pts;
    const fx = scaler(pts.map(p => p.ing)), fy = scaler(pts.map(p => p.edad));
    const sp = pts.map(p => ({ ...p, x: fx(p.ing), y: fy(p.edad) }));
    const q = sp[0];
    const nb = sp.slice(1).map(p => ({ p, d: Math.hypot(p.x - q.x, p.y - q.y) })).sort((a, b) => a.d - b.d).slice(0, 3).map(o => o.p);
    const reg = sp.filter(p => !p.out), vx = sd(reg.map(p => p.x)) ** 2, vy = sd(reg.map(p => p.y)) ** 2;   // entre los 40 clientes habituales
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of reg) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }   // el extremo queda fuera del encuadre
    const rx = x1 - x0, ry = y1 - y0;
    $('transform-wage').textContent = pct(vy / (vx + vy), vy / (vx + vy) < 0.01 ? 3 : 1);
    $('transform-nb').textContent = nb.map(p => p.edad).join(' · ');
    const dd = v => v >= 10 ? 0 : 2;
    $('transform-rx').textContent = num(ry, dd(ry));
    $('transform-ry').textContent = num(rx, dd(rx));
    $('transform-kn-head').textContent = DESC[KN.m];

    const f = fit($('transform-c-knn')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 44, r: 16, t: 16, b: 30 };
    const W = w - pad.l - pad.r, H = h - pad.t - pad.b;
    const s = Math.min(W / (rx || 1), H / (ry || 1));          // misma escala en ambos ejes
    const cx = pad.l + (W - rx * s) / 2, cy = pad.t + (H + ry * s) / 2;
    const X = v => cx + (v - x0) * s, Y = v => cy - (v - y0) * s;
    // marco de los datos
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(X(x0)) - 3.5, Math.round(Y(y1)) - 3.5, rx * s + 7, ry * s + 7);
    // rejilla y etiquetas x (ingreso)
    ctx.font = mono(); ctx.fillStyle = muted;
    const stx = niceStep(rx, Math.max(1, Math.min(6, Math.floor(rx * s / 60)))), dx = decs(stx);
    ctx.textAlign = 'center';
    for (let v = Math.ceil(x0 / stx) * stx; v <= x1 + 1e-9; v += stx) {
      const xx = Math.round(X(v)) + .5;
      ctx.globalAlpha = .45; ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(xx, Y(y1) - 3); ctx.lineTo(xx, Y(y0) + 3); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillText(sgn(Math.abs(v) < stx / 1e6 ? 0 : v, dx), xx, Y(y0) + 18);
    }
    // etiquetas y (edad), solo si hay altura suficiente
    const hpx = ry * s;
    ctx.textAlign = 'right';
    if (hpx > 40) {
      const sty = niceStep(ry, Math.max(2, Math.min(5, Math.floor(hpx / 34)))), dy = decs(sty);
      for (let v = Math.ceil(y0 / sty) * sty; v <= y1 + 1e-9; v += sty) {
        const yy = Math.round(Y(v)) + .5;
        ctx.globalAlpha = .45; ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(X(x0) - 3, yy); ctx.lineTo(X(x1) + 3, yy); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillText(sgn(Math.abs(v) < sty / 1e6 ? 0 : v, dy), X(x0) - 8, yy + 4);
      }
    } else {
      ctx.textAlign = 'left'; ctx.fillStyle = ink;
      ctx.fillText('la edad ocupa ' + Math.max(1, Math.round(hpx)) + ' px de alto', pad.l, Math.max(pad.t + 10, Y(y1) - 18));
    }
    ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText('ingreso →', w - pad.r, h - 2);
    ctx.save(); ctx.translate(12, pad.t + H / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('edad →', 0, 0); ctx.restore();
    // líneas a los vecinos
    ctx.strokeStyle = hot; ctx.lineWidth = 1.6;
    for (const p of nb) { ctx.beginPath(); ctx.moveTo(X(q.x), Y(q.y)); ctx.lineTo(X(p.x), Y(p.y)); ctx.stroke(); }
    // puntos
    for (const p of sp) {
      if (p.q || p.out) continue;
      ctx.globalAlpha = p.out ? 1 : .8; ctx.fillStyle = p.out ? ink : accent;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.out ? 5 : 3.6, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const p of nb) { ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 6.5, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = ink; ctx.font = '600 12px ' + tok('--f-mono'); ctx.textAlign = 'left';
    ctx.fillText('Q', X(q.x) + 8, Y(q.y) - 8);
    if (KN.out) {   // el cliente extremo, fuera del encuadre: flecha en el borde derecho a su altura
      const o = sp[sp.length - 1], yy = Math.max(pad.t + 8, Math.min(h - pad.b - 8, Y(o.y))), xe = w - pad.r;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(xe, yy); ctx.lineTo(xe - 9, yy - 6); ctx.lineTo(xe - 9, yy + 6); ctx.closePath(); ctx.fill();
      ctx.font = mono(); ctx.textAlign = 'right'; ctx.fillText('extremo en x = ' + num(o.x, o.x >= 100 ? 0 : 1), xe - 2, yy - 10);
    }
  }

  M.draw.transform = () => { drawBC(); drawKN(); };
  M.init.push(() => { setLam(1); bcSample(); drawKN(); });
})();
