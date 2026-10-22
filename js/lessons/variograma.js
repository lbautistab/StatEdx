/* StatEdx · sesión variograma: Geoestadística: el variograma */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const SIDE = 10, HMAX = 7, NB = 14, NMAX = 250;
  const V = { mt: 'sph', mf: 'sph', c0: 0.1, a: 3, n: 150, xy: [], u: [], z: [], emp: null, fitp: null };

  // forma normalizada (0 a 1) de cada modelo, con rango práctico a
  const shape = {
    sph: (h, a) => h >= a ? 1 : 1.5 * h / a - 0.5 * (h / a) ** 3,
    exp: (h, a) => 1 - Math.exp(-3 * h / a),
    gau: (h, a) => 1 - Math.exp(-3 * h * h / (a * a)),
  };
  const gam = (h, m, c0, c, a) => h <= 0 ? 0 : c0 + c * shape[m](h, a);

  function newSample() {
    V.xy = Array.from({ length: NMAX }, () => [Math.random() * SIDE, Math.random() * SIDE]);
    V.u = Array.from({ length: NMAX }, () => randn());
    simulate();
  }
  function simulate() {
    const n = V.n, xy = V.xy, c = 1 - V.c0, L = new Float64Array(n * n);
    // covarianza C(h) = c (1 − forma) + c0·1{h = 0}, con un pequeño refuerzo diagonal
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      const h = Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]);
      L[i * n + j] = i === j ? 1 + 1e-4 : c * (1 - shape[V.mt](h, V.a));
    }
    for (let j = 0; j < n; j++) {     // Cholesky en el lugar (triángulo inferior)
      let s = L[j * n + j]; for (let k = 0; k < j; k++) s -= L[j * n + k] ** 2;
      const d = Math.sqrt(Math.max(s, 1e-10)); L[j * n + j] = d;
      for (let i = j + 1; i < n; i++) { let t = L[i * n + j]; for (let k = 0; k < j; k++) t -= L[i * n + k] * L[j * n + k]; L[i * n + j] = t / d; }
    }
    V.z = Array.from({ length: n }, (_, i) => { let s = 0; for (let k = 0; k <= i; k++) s += L[i * n + k] * V.u[k]; return s; });
    empirical(); fitModel(); draw();
  }
  function empirical() {
    const n = V.n, sg = new Float64Array(NB), sh = new Float64Array(NB), cnt = new Float64Array(NB);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const h = Math.hypot(V.xy[i][0] - V.xy[j][0], V.xy[i][1] - V.xy[j][1]); if (h >= HMAX) continue;
      const k = Math.floor(h / HMAX * NB); sg[k] += 0.5 * (V.z[i] - V.z[j]) ** 2; sh[k] += h; cnt[k]++;
    }
    V.emp = []; for (let k = 0; k < NB; k++) if (cnt[k] > 0) V.emp.push({ h: sh[k] / cnt[k], g: sg[k] / cnt[k], N: cnt[k] });
  }
  // MCO ponderados (pesos N/h², como gstat): para cada a, c0 y c salen de una regresión lineal
  function fitModel() {
    const E = V.emp, m = V.mf; let best = null;
    for (let t = 0; t <= 120; t++) {
      const a = 0.3 * Math.pow(40, t / 120);
      let Sw = 0, Sf = 0, Sff = 0, Sg = 0, Sfg = 0;
      for (const e of E) { const w = e.N / (e.h * e.h), f = shape[m](e.h, a); Sw += w; Sf += w * f; Sff += w * f * f; Sg += w * e.g; Sfg += w * f * e.g; }
      const det = Sw * Sff - Sf * Sf; let c0, c;
      if (Math.abs(det) > 1e-12) { c0 = (Sff * Sg - Sf * Sfg) / det; c = (Sw * Sfg - Sf * Sg) / det; } else { c0 = -1; c = 0; }
      if (c0 < 0) { c0 = 0; c = Sfg / Sff; }
      if (c < 0) { c = 0; c0 = Sg / Sw; }
      let sse = 0; for (const e of E) sse += e.N / (e.h * e.h) * (e.g - c0 - c * shape[m](e.h, a)) ** 2;
      if (!best || sse < best.sse) best = { c0, c, a, sse };
    }
    V.fitp = best;
  }

  function draw() {
    if (!V.fitp) return;
    const F = V.fitp, names = { sph: 'esférico', exp: 'exponencial', gau: 'gaussiano' };
    $('variograma-c0-v').textContent = fmt(V.c0, 2);
    $('variograma-a-v').textContent = fmt(V.a, 1);
    $('variograma-n-v').textContent = V.n;
    $('variograma-r-c0').textContent = fmt(F.c0, 3);
    $('variograma-r-sill').textContent = fmt(F.c0 + F.c, 3);
    $('variograma-r-a').textContent = F.a > 11.9 ? '> 12 km' : fmt(F.a, 2) + ' km';
    $('variograma-r-prop').textContent = F.c0 + F.c > 0 ? pct(F.c0 / (F.c0 + F.c), 0) : '–';
    $('variograma-head').textContent = `real: ${names[V.mt]} · c₀ = ${fmt(V.c0, 2)} · a = ${fmt(V.a, 1)} km`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    let f = fit($('variograma-c-map'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const side = Math.min(w, h) - 20, x0 = (w - side) / 2, y0 = (h - side) / 2;
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let k = 0; k <= 10; k += 2) { const t = Math.round(x0 + k / 10 * side) + .5, u = Math.round(y0 + k / 10 * side) + .5; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(t, y0); ctx.lineTo(t, y0 + side); ctx.moveTo(x0, u); ctx.lineTo(x0 + side, u); ctx.stroke(); }
      ctx.globalAlpha = 1;
      let m = 0; for (const v of V.z) m += v; m /= V.n;
      let s = 0; for (const v of V.z) s += (v - m) ** 2; s = Math.sqrt(s / V.n) || 1;
      for (let i = 0; i < V.n; i++) {
        const zz = (V.z[i] - m) / s, X = x0 + V.xy[i][0] / SIDE * side, Y = y0 + (1 - V.xy[i][1] / SIDE) * side;
        ctx.fillStyle = zz >= 0 ? hot : accent; ctx.globalAlpha = Math.min(1, .2 + Math.abs(zz) / 2);
        ctx.beginPath(); ctx.arc(X, Y, 4.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    f = fit($('variograma-c-vg'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 14, t: 14, b: 28 };
      let ymax = 1.2; for (const e of V.emp) ymax = Math.max(ymax, e.g * 1.08); ymax = Math.ceil(ymax / 0.2) * 0.2;
      const X = v => pad.l + v / HMAX * (w - pad.l - pad.r);
      const Y = v => h - pad.b - v / ymax * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = 0; v <= ymax + 1e-9; v += 0.2) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let v = 1; v <= HMAX; v++) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const curve = (m, c0, c, a) => { ctx.beginPath(); ctx.moveTo(X(0), Y(0)); for (let i = 1; i <= 200; i++) { const hh = HMAX * i / 200; ctx.lineTo(X(hh), Y(gam(hh, m, c0, c, a))); } ctx.stroke(); };
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      // pepita y rango ajustados
      ctx.strokeStyle = hot; ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, Y(F.c0 + F.c)); ctx.lineTo(w - pad.r, Y(F.c0 + F.c)); ctx.stroke();
      if (F.a <= HMAX) { ctx.beginPath(); ctx.moveTo(X(F.a), pad.t); ctx.lineTo(X(F.a), h - pad.b); ctx.stroke(); }
      ctx.setLineDash([]);
      if (F.c0 > 0.005) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0) + 1.5, Y(0)); ctx.lineTo(X(0) + 1.5, Y(F.c0)); ctx.stroke(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); curve(V.mt, V.c0, 1 - V.c0, V.a); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.6; curve(V.mf, F.c0, F.c, F.a);
      let Nmax = 1; for (const e of V.emp) Nmax = Math.max(Nmax, e.N);
      ctx.fillStyle = accent;
      for (const e of V.emp) { ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(X(e.h), Y(e.g), 2.5 + 4 * Math.sqrt(e.N / Nmax), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.fillStyle = hot; ctx.font = mono(); ctx.textAlign = 'left';
      ctx.fillText('meseta', pad.l + 6, Y(F.c0 + F.c) - 5);
      if (F.a <= HMAX - 0.6) { ctx.textAlign = 'left'; ctx.fillText('rango', X(F.a) + 4, h - pad.b - 6); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.moveTo(pad.l + .5, pad.t); ctx.lineTo(pad.l + .5, h - pad.b); ctx.stroke();
      axisTicks(ctx, X, 0, HMAX, 1, h - 9, muted);
      ctx.textAlign = 'right';
      for (let v = 0; v <= ymax + 1e-9; v += 0.2) ctx.fillText(fmt(v, 1), pad.l - 6, Y(v) + 4);
    }
  }

  segBind('variograma-true', b => { V.mt = b.dataset.m; simulate(); });
  segBind('variograma-fit', b => { V.mf = b.dataset.m; fitModel(); draw(); });
  $('variograma-c0').addEventListener('input', e => { V.c0 = +e.target.value; simulate(); });
  $('variograma-a').addEventListener('input', e => { V.a = +e.target.value; simulate(); });
  $('variograma-n').addEventListener('input', e => { V.n = +e.target.value; simulate(); });
  $('variograma-again').addEventListener('click', newSample);

  M.draw['variograma'] = draw;
  M.init.push(newSample);
})();
