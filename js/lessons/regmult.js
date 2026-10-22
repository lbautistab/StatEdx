/* StatEdx · sesión regmult: Regresión lineal múltiple */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  // ---------- distribuciones (gamma y beta incompletas) ----------
  function lgam(x) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgam(1 - x);
    x -= 1; let a = c[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const tiny = 1e-30, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < tiny) d = tiny; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const ln = -x + a * Math.log(x) - lgam(a);
    if (x < a + 1) { let s = 1 / a, t = s; for (let n = 1; n < 500; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < Math.abs(s) * 1e-15) break; } return s * Math.exp(ln); }
    const tiny = 1e-30; let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < tiny) d = tiny; c = b + an / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(ln) * h;
  }
  const tsf2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);
  const pfmt = p => p < 0.0001 ? '< 0,0001' : fmt(p, p < 0.01 ? 4 : 3);
  function inv(A) { // Gauss-Jordan
    const n = A.length, M2 = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => +(i === j))));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
      [M2[c], M2[p]] = [M2[p], M2[c]]; const d = M2[c][c]; if (Math.abs(d) < 1e-12) return null;
      for (let j = 0; j < 2 * n; j++) M2[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M2[r][c]; for (let j = 0; j < 2 * n; j++) M2[r][j] -= f * M2[c][j]; }
    }
    return M2.map(r => r.slice(n));
  }
  function ols(X, y) {
    const n = X.length, k = X[0].length;
    const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
    const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i] * y[t], 0));
    const Ai = inv(XtX); if (!Ai) return null;
    const b = Ai.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
    let sse = 0, my = y.reduce((s, v) => s + v, 0) / n, sst = 0;
    X.forEach((r, t) => { const e = y[t] - r.reduce((s, v, j) => s + v * b[j], 0); sse += e * e; sst += (y[t] - my) ** 2; });
    const s2 = sse / (n - k), se = Ai.map((r, i) => Math.sqrt(s2 * r[i]));
    return { b, se, df: n - k, r2: 1 - sse / sst, r2a: 1 - (sse / (n - k)) / (sst / (n - 1)) };
  }

  // ================= simulador 1: variable omitida y VIF =================
  const S = { rho: 0.6, b2: 1.5, n: 50, reps: 200, seed: [] };
  const newSeeds = () => { S.seed = Array.from({ length: S.reps }, () => Array.from({ length: 3 * 400 }, randn)); draw(); };
  function sampleAt(r) {
    const z = S.seed[r], c = Math.sqrt(1 - S.rho * S.rho), X1 = [], X2 = [], Yv = [];
    for (let i = 0; i < S.n; i++) { const x1 = z[3 * i], x2 = S.rho * x1 + c * z[3 * i + 1]; X1.push(x1); X2.push(x2); Yv.push(x1 + S.b2 * x2 + z[3 * i + 2]); }
    return { X1, X2, Yv };
  }
  function fit2(X1, X2, Y) {
    const n = X1.length, m = a => a.reduce((s, v) => s + v, 0) / n;
    const m1 = m(X1), m2 = m(X2), my = m(Y);
    let s11 = 0, s22 = 0, s12 = 0, s1y = 0, s2y = 0;
    for (let i = 0; i < n; i++) { const a = X1[i] - m1, b = X2[i] - m2, c = Y[i] - my; s11 += a * a; s22 += b * b; s12 += a * b; s1y += a * c; s2y += b * c; }
    const det = s11 * s22 - s12 * s12;
    return { bs: s1y / s11, bm: (s22 * s1y - s12 * s2y) / det, r12: s12 / Math.sqrt(s11 * s22), m1, my };
  }
  function draw() {
    if (!S.seed.length) return;
    const ests = [];
    for (let r = 0; r < S.reps; r++) { const s = sampleAt(r); ests.push(fit2(s.X1, s.X2, s.Yv)); }
    const s0 = sampleAt(0), f0 = ests[0];
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    const BS = ests.map(e => e.bs), BM = ests.map(e => e.bm);
    const vif = 1 / (1 - f0.r12 ** 2);
    $('regmult-r-s').textContent = sgn(mean(BS), 2);
    $('regmult-r-m').textContent = sgn(mean(BM), 2);
    $('regmult-r-vif').textContent = fmt(vif, vif > 10 ? 1 : 2);
    $('regmult-r-se').textContent = '× ' + fmt(Math.sqrt(vif), 2);
    $('regmult-head').textContent = `sesgo teórico de la simple = β₂·ρ = ${sgn(S.b2 * S.rho, 2)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let f = fit($('regmult-c-xy'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 10, t: 10, b: 26 };
      let ylo = Infinity, yhi = -Infinity; for (const v of s0.Yv) { ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
      const ys = yhi - ylo > 16 ? 4 : 2; ylo = Math.floor(ylo / ys) * ys; yhi = Math.ceil(yhi / ys) * ys;
      const X = v => pad.l + (v + 3.2) / 6.4 * (w - pad.l - pad.r), Y = v => h - pad.b - (v - ylo) / (yhi - ylo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = ylo; v <= yhi + 1e-9; v += ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let v = -3; v <= 3; v++) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      s0.X1.forEach((x1, i) => { const x2 = s0.X2[i]; ctx.fillStyle = x2 > 0 ? hot : accent; ctx.globalAlpha = 0.2 + Math.min(Math.abs(x2) / 2, 1) * 0.65; ctx.beginPath(); ctx.arc(X(x1), Y(s0.Yv[i]), 3.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      const lineAt = (b, col, wd, dash) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(X(-3.2), Y(f0.my + b * (-3.2 - f0.m1))); ctx.lineTo(X(3.2), Y(f0.my + b * (3.2 - f0.m1))); ctx.stroke(); ctx.setLineDash([]); };
      lineAt(1, ink, 1.4, [4, 4]); lineAt(f0.bs, hot, 2.6, []); lineAt(f0.bm, accent, 2.6, []);
      ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = -3; v <= 3; v++) ctx.fillText(sgn(v, 0), X(v), h - 8);
      ctx.textAlign = 'right';
      for (let v = ylo; v <= yhi + 1e-9; v += ys) ctx.fillText(sgn(v, 0), pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 8), h - pad.b));
    }

    f = fit($('regmult-c-dist'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 14, b: 26 };
      let lo = Math.min(...BS, ...BM, 1), hi = Math.max(...BS, ...BM, 1);
      const span = hi - lo; lo -= span * 0.05; hi += span * 0.05;
      const step = span > 8 ? 2 : span > 4 ? 1 : span > 2 ? 0.5 : span > 0.8 ? 0.25 : 0.1;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const NB = 36, bw = (hi - lo) / NB;
      const hist = arr => { const c = new Array(NB).fill(0); arr.forEach(v => c[Math.min(NB - 1, Math.floor((v - lo) / bw))]++); return c; };
      const hs = hist(BS), hm = hist(BM), top = Math.max(...hs, ...hm) * 1.1;
      const Y = c => h - pad.b - c / top * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const [c, col] of [[hs, hot], [hm, accent]]) {
        ctx.fillStyle = col; ctx.globalAlpha = .5;
        c.forEach((v, i) => { if (v) ctx.fillRect(X(lo + i * bw) + 0.5, Y(v), Math.max(1, X(lo + (i + 1) * bw) - X(lo + i * bw) - 1), Y(0) - Y(v)); });
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(Math.round(X(1)) + .5, pad.t); ctx.lineTo(Math.round(X(1)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      const dec = step < 0.25 ? 1 : step < 1 ? 2 : 0;
      let lastX = -99;
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = X(v); if (x - lastX < 38) continue; ctx.fillText(sgn(Math.abs(v) < 1e-9 ? 0 : v, dec), Math.min(Math.max(x, pad.l + 12), w - pad.r - 12), h - 8); lastX = x; }
    }
  }
  const bind = (id, key, d, fn) => { const el = $(id); el.addEventListener('input', () => { S[key] = +el.value; $(id + '-v').textContent = d === null ? S[key] : sgn(S[key], d); (fn || draw)(); }); };
  bind('regmult-rho', 'rho', 2); bind('regmult-b2', 'b2', 1); bind('regmult-n', 'n', null);
  $('regmult-again').addEventListener('click', newSeeds);

  // ================= simulador 2: interacción =================
  const I = { b3: 0.8, mod: 'int', pts: [] };
  function iNew() {
    I.pts = Array.from({ length: 40 }, (_, i) => ({ m2: 40 + Math.random() * 80, D: i % 2, z: randn() }));
    drawInt();
  }
  function drawInt() {
    if (!I.pts.length) return;
    const ys = I.pts.map(p => 20 + 1.5 * p.m2 + 40 * p.D + I.b3 * (p.m2 - 80) * p.D + 12 * p.z);
    const Xa = I.pts.map(p => [1, p.m2, p.D]), Xi = I.pts.map(p => [1, p.m2, p.D, p.m2 * p.D]);
    const fa = ols(Xa, ys), fi = ols(Xi, ys);
    const F = I.mod === 'int' ? fi : fa;
    const b = F.b, slopeA = b[1], slopeC = b[1] + (I.mod === 'int' ? b[3] : 0);
    const pInt = tsf2(fi.b[3] / fi.se[3], fi.df);
    $('regmult-i-b1').textContent = fmt(slopeA, 2);
    $('regmult-i-b13').textContent = fmt(slopeC, 2);
    $('regmult-i-p').textContent = pfmt(pInt);
    $('regmult-i-r2').textContent = fmt(F.r2a, 3);
    $('regmult-i-head').textContent = I.mod === 'int' ? `β̂₃ = ${sgn(fi.b[3], 2)}` : 'rectas paralelas';
    $('regmult-i-lbl').textContent = I.mod === 'int' ? 'cada zona con su pendiente' : 'misma pendiente en ambas zonas';
    const f = fit($('regmult-c-int')); if (!f) return;
    const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line');
    const pad = { l: 40, r: 12, t: 12, b: 26 };
    let lo = Infinity, hi = -Infinity; ys.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    lo = Math.floor(lo / 50) * 50; hi = Math.ceil(hi / 50) * 50; const st = hi - lo > 300 ? 100 : 50;
    const X = v => pad.l + (v - 40) / 80 * (w - pad.l - pad.r), Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = lo; v <= hi; v += st) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    for (let v = 40; v <= 120; v += 20) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    I.pts.forEach((p, i) => { ctx.fillStyle = p.D ? hot : accent; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(X(p.m2), Y(ys[i]), 3.6, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const pred = (m2, D) => b[0] + b[1] * m2 + b[2] * D + (I.mod === 'int' ? b[3] * m2 * D : 0);
    for (const [D, col] of [[0, accent], [1, hot]]) { ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(X(40), Y(pred(40, D))); ctx.lineTo(X(120), Y(pred(120, D))); ctx.stroke(); }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = 40; v <= 120; v += 20) ctx.fillText(v + (v === 120 ? ' m²' : ''), Math.min(X(v), w - pad.r - 16), h - 8);
    ctx.textAlign = 'right';
    for (let v = lo; v <= hi; v += st) ctx.fillText(v, pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 8), h - pad.b));
  }
  const idl = $('regmult-i-d');
  idl.addEventListener('input', () => { I.b3 = +idl.value; $('regmult-i-d-v').textContent = sgn(I.b3, 1); drawInt(); });
  segBind('regmult-i-mod', btn => { I.mod = btn.dataset.m; drawInt(); });
  $('regmult-i-again').addEventListener('click', iNew);

  M.draw['regmult'] = () => { draw(); drawInt(); };
  M.init.push(() => { newSeeds(); iNew(); });
})();
