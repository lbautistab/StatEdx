/* StatEdx · sesión glm: Modelos lineales generalizados: regresión de Poisson */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // ---------- utilidades numéricas ----------
  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1; let s = LZ[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) s += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
  }
  const lfact = y => lgamma(y + 1);
  function rgamma(k) {
    if (k < 1) return rgamma(k + 1) * Math.pow(Math.random(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v; do { x = randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = Math.random();
      if (u < 1 - 0.0331 * x ** 4) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function rpois(l) {
    if (l > 30) { const h = l / 2; return rpois(h) + rpois(h); }
    const L = Math.exp(-l); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  const dpois = (y, m) => Math.exp(y * Math.log(m) - m - lfact(y));
  const dnb = (y, m, k) => Math.exp(lgamma(y + k) - lgamma(k) - lfact(y) + k * Math.log(k / (k + m)) + y * Math.log(m / (k + m)));
  function qpois(p, m) { let c = 0, y = 0; for (;; y++) { c += dpois(y, m); if (c >= p || y > 400) return y; } }

  function grid(ctx, X, Y, pad, w, h, xs, ys) {
    ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of xs) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (const v of ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // ---------- simulador 1: ajustar una regresión de Poisson ----------
  const TRUE = { b0: -0.8, b1: 0.06 };
  const F = { b0: 0, b1: 0.02, scale: 'lin', x: [], y: [], mle: null, timer: null };
  const el = { b0: $('glm-b0'), b1: $('glm-b1') };

  function newData() {
    F.x = []; F.y = [];
    for (let i = 0; i < 40; i++) { const x = 5 + 35 * Math.random(); F.x.push(x); F.y.push(rpois(Math.exp(TRUE.b0 + TRUE.b1 * x))); }
    F.mle = irlsFull([Math.log(Math.max(0.1, mean(F.y))), 0]);
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  function irlsStep(b) {
    let a11 = 0, a12 = 0, a22 = 0, r1 = 0, r2 = 0;
    for (let i = 0; i < F.x.length; i++) {
      const x = F.x[i], eta = b[0] + b[1] * x, mu = Math.exp(eta), z = eta + (F.y[i] - mu) / mu;
      a11 += mu; a12 += mu * x; a22 += mu * x * x; r1 += mu * z; r2 += mu * x * z;
    }
    const det = a11 * a22 - a12 * a12;
    return [(a22 * r1 - a12 * r2) / det, (a11 * r2 - a12 * r1) / det];
  }
  function irlsFull(b) { for (let t = 0; t < 50; t++) b = irlsStep(b); return b; }
  function stats(b0, b1) {
    let ll = 0, dev = 0;
    for (let i = 0; i < F.x.length; i++) {
      const y = F.y[i], eta = b0 + b1 * F.x[i], mu = Math.exp(eta);
      ll += y * eta - mu - lfact(y);
      dev += 2 * ((y > 0 ? y * Math.log(y / mu) : 0) - (y - mu));
    }
    return { ll, dev };
  }
  function syncFit() {
    el.b0.value = F.b0; el.b1.value = F.b1;
    $('glm-b0-v').textContent = fmt(F.b0, 2);
    $('glm-b1-v').textContent = fmt(F.b1, 3);
    drawFit();
  }
  function stopIrls() { if (F.timer) { clearInterval(F.timer); F.timer = null; } }
  el.b0.addEventListener('input', () => { stopIrls(); F.b0 = +el.b0.value; syncFit(); });
  el.b1.addEventListener('input', () => { stopIrls(); F.b1 = +el.b1.value; syncFit(); });
  segBind('glm-scale', b => { F.scale = b.dataset.s; drawFit(); });
  $('glm-new').addEventListener('click', () => { stopIrls(); newData(); syncFit(); });
  $('glm-irls').addEventListener('click', () => {
    stopIrls();
    let b = [F.b0, F.b1], it = 0;
    F.timer = setInterval(() => {
      let nb = irlsStep(b);
      if (!isFinite(nb[0]) || !isFinite(nb[1]) || Math.abs(nb[1]) > 1) nb = irlsStep([Math.log(Math.max(0.1, mean(F.y))), 0]);
      const done = Math.abs(nb[0] - b[0]) + Math.abs(nb[1] - b[1]) < 1e-6 || ++it > 25;
      b = nb; F.b0 = b[0]; F.b1 = b[1]; syncFit();
      if (done || M.current !== 'glm') stopIrls();
    }, 380);
  });

  function drawFit() {
    const s = stats(F.b0, F.b1), sm = stats(F.mle[0], F.mle[1]);
    $('glm-ll').textContent = fmt(s.ll, 1);
    $('glm-dev').textContent = fmt(s.dev, 1);
    $('glm-irr').textContent = fmt(Math.exp(F.b1), 3);
    $('glm-ddev').textContent = fmt(Math.max(0, s.dev - sm.dev), 2);
    $('glm-fit-head').textContent = `log μ = ${fmt(F.b0, 2)} ${F.b1 < 0 ? '−' : '+'} ${fmt(Math.abs(F.b1), 3)}·x`;

    const f = fit($('glm-c-fit')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14, t: 14, b: 40 };
    const x0 = 0, x1 = 45;
    const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r);
    const ymaxData = Math.max(...F.y);
    const ymax = Math.max(8, Math.ceil(ymaxData * 1.15));
    const isLog = F.scale === 'log';
    const lmin = Math.log(0.25), lmax = Math.log(ymax * 1.4);
    const Y = v => {
      if (isLog) { const lv = Math.log(Math.max(v, 0.25)); return h - pad.b - (lv - lmin) / (lmax - lmin) * (h - pad.t - pad.b); }
      return h - pad.b - Math.min(v, ymax) / ymax * (h - pad.t - pad.b);
    };
    const xt = [0, 10, 20, 30, 40];
    const yt = isLog ? [0.5, 1, 2, 5, 10, 20, 50].filter(v => v <= ymax * 1.4) : (() => { const st = ymax > 25 ? 10 : ymax > 12 ? 5 : 2; const a = []; for (let v = 0; v <= ymax; v += st) a.push(v); return a; })();
    grid(ctx, X, Y, pad, w, h, xt, yt);
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    // banda del 80 % (cuantiles 10 y 90 de Poisson)
    const G = 90, lo = [], hi = [];
    for (let i = 0; i <= G; i++) { const x = x0 + (x1 - x0) * i / G, mu = Math.exp(F.b0 + F.b1 * x); lo.push([x, qpois(0.1, mu)]); hi.push([x, qpois(0.9, mu)]); }
    ctx.fillStyle = hot; ctx.globalAlpha = .13; ctx.beginPath();
    hi.forEach(([x, q], i) => { i ? ctx.lineTo(X(x), Y(q)) : ctx.moveTo(X(x), Y(q)); });
    for (let i = G; i >= 0; i--) ctx.lineTo(X(lo[i][0]), Y(isLog ? Math.max(lo[i][1], 0.25) : lo[i][1]));
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // curva verdadera
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let i = 0; i <= G; i++) { const x = x0 + (x1 - x0) * i / G, y = Y(Math.exp(TRUE.b0 + TRUE.b1 * x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
    ctx.stroke(); ctx.setLineDash([]);
    // curva del usuario
    ctx.strokeStyle = hot; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i <= G; i++) { const x = x0 + (x1 - x0) * i / G, y = Y(Math.exp(F.b0 + F.b1 * x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
    ctx.stroke();
    ctx.restore();
    // puntos
    ctx.fillStyle = accent;
    for (let i = 0; i < F.x.length; i++) {
      const yv = F.y[i], py = isLog && yv === 0 ? h - pad.b - 4 : Y(yv);
      ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(X(F.x[i]), py, 3.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ejes
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.moveTo(pad.l - .5, pad.t); ctx.lineTo(pad.l - .5, h - pad.b); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (const v of xt) ctx.fillText(v, X(v), h - pad.b + 15);
    ctx.fillText('tráfico (miles de vehículos/día)', (pad.l + w - pad.r) / 2, h - 6);
    ctx.textAlign = 'right';
    for (const v of yt) ctx.fillText(fmt(v, v > 0 && v < 1 ? 1 : 0), pad.l - 6, Y(v) + 4);
    if (isLog) ctx.fillText('0', pad.l - 6, h - pad.b);
    ctx.save(); ctx.translate(11, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('accidentes', 0, 0); ctx.restore();
  }

  // ---------- simulador 2: sobredispersión ----------
  const O = { mu: 4, k: 2, ys: [] };
  function odSample() {
    O.ys = [];
    for (let i = 0; i < 400; i++) { const lam = O.k ? rgamma(O.k) * O.mu / O.k : O.mu; O.ys.push(rpois(lam)); }
    drawOD();
  }
  $('glm-mu').addEventListener('input', () => { O.mu = +$('glm-mu').value; $('glm-mu-v').textContent = fmt(O.mu, O.mu % 1 ? 1 : 0); odSample(); });
  segBind('glm-k', b => { O.k = +b.dataset.k; odSample(); });
  $('glm-od-new').addEventListener('click', odSample);

  function drawOD() {
    if (!O.ys.length) return;
    const n = O.ys.length, m = mean(O.ys);
    const v = O.ys.reduce((s, y) => s + (y - m) ** 2, 0) / (n - 1);
    const z0 = O.ys.filter(y => y === 0).length / n;
    $('glm-od-m').textContent = fmt(m, 2);
    $('glm-od-v').textContent = fmt(v, 2);
    $('glm-od-r').textContent = fmt(v / Math.max(m, 1e-9), 2);
    $('glm-od-z').textContent = pct(z0, 0) + ' / ' + pct(Math.exp(-m), 0);
    $('glm-od-head').textContent = O.k ? `Var teórica = ${fmt(O.mu + O.mu * O.mu / O.k, 1)}` : `Var teórica = ${fmt(O.mu, 1)}`;

    const f = fit($('glm-c-od')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 38, r: 12, t: 14, b: 26 };
    let xmax = Math.max(8, Math.ceil(O.mu + 4 * Math.sqrt(O.mu + (O.k ? O.mu * O.mu / O.k : 0))));
    xmax = Math.min(xmax, 60);
    const counts = new Array(xmax + 1).fill(0); let over = 0;
    for (const y of O.ys) { if (y <= xmax) counts[y]++; else over++; }
    const pr = counts.map(c => c / n);
    const pp = counts.map((_, y) => dpois(y, m));
    const pn = counts.map((_, y) => O.k ? dnb(y, O.mu, O.k) : dpois(y, O.mu));
    const top = Math.max(...pr, ...pp, ...pn) * 1.12;
    const bw = (w - pad.l - pad.r) / (xmax + 1);
    const X = y => pad.l + (y + 0.5) * bw;
    const Y = p => h - pad.b - p / top * (h - pad.t - pad.b);
    const st = top > 0.4 ? 0.1 : top > 0.2 ? 0.05 : top > 0.08 ? 0.02 : 0.01;
    const yt = []; for (let p = 0; p <= top; p += st) yt.push(p);
    grid(ctx, X, Y, pad, w, h, [], yt);
    ctx.fillStyle = accent; ctx.globalAlpha = .55;
    pr.forEach((p, y) => { if (p > 0) ctx.fillRect(X(y) - bw * 0.42, Y(p), bw * 0.84, h - pad.b - Y(p)); });
    ctx.globalAlpha = 1;
    const curve = (arr, color, dash, dots) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      arr.forEach((p, y) => { y ? ctx.lineTo(X(y), Y(p)) : ctx.moveTo(X(y), Y(p)); }); ctx.stroke(); ctx.setLineDash([]);
      if (dots) { ctx.fillStyle = color; arr.forEach((p, y) => { ctx.beginPath(); ctx.arc(X(y), Y(p), 2.6, 0, 7); ctx.fill(); }); }
    };
    if (O.k) curve(pn, hot, [5, 4], false);
    curve(pp, ink, [], true);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    const lstep = xmax > 40 ? 10 : xmax > 20 ? 5 : xmax > 10 ? 2 : 1;
    for (let y = 0; y <= xmax; y += lstep) ctx.fillText(y, X(y), h - 8);
    ctx.textAlign = 'right';
    for (const p of yt) ctx.fillText(fmt(p, 2), pad.l - 6, Y(p) + 4);
    if (over) { ctx.textAlign = 'right'; ctx.fillStyle = muted; ctx.fillText(`${over} valores > ${xmax}`, w - pad.r - 2, pad.t + 10); }
  }

  M.draw.glm = () => { drawFit(); drawOD(); };
  M.init.push(() => { newData(); syncFit(); odSample(); });
})();
