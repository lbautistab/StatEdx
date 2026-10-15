/* Muestra · clase 9, regresión logística */
(() => {
  const $ = id => document.getElementById(id);
  // reproducible RNG (mulberry32) so the lesson always opens with the same data
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0, y = 0; while (!x) x = u(); y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n };
  }
  const sig = z => 1 / (1 + Math.exp(-z));
  const font = () => '11px ' + M.tok('--f-mono');
  const minus = s => String(s).replace('-', '−');

  // ================= simulator A: curve + log-loss =================
  const LG = { b0: -2, b1: 0.1, xs: [], ys: [], opt: null, anim: 0, seed: 7 };
  function lgData() {
    const r = rng(LG.seed); LG.xs = []; LG.ys = []; LG.jit = [];
    for (let i = 0; i < 60; i++) { const x = r.u() * 30; LG.xs.push(x); LG.ys.push(r.u() < sig(-4 + 0.3 * x) ? 1 : 0); LG.jit.push(r.u()); }
    LG.opt = newton(-0, 0, 60);
  }
  function loglik(b0, b1) {
    let l = 0;
    for (let i = 0; i < LG.xs.length; i++) { const z = b0 + b1 * LG.xs[i]; // stable log σ
      l += LG.ys[i] ? -Math.log1p(Math.exp(-z)) : -Math.log1p(Math.exp(z)); }
    return l;
  }
  const logloss = (b0, b1) => -loglik(b0, b1) / LG.xs.length;
  function newtonStep(b0, b1) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    for (let i = 0; i < LG.xs.length; i++) { const x = LG.xs[i], p = sig(b0 + b1 * x), w = p * (1 - p), e = LG.ys[i] - p;
      g0 += e; g1 += e * x; h00 += w; h01 += w * x; h11 += w * x * x; }
    const det = h00 * h11 - h01 * h01 || 1e-12;
    let d0 = (h11 * g0 - h01 * g1) / det, d1 = (-h01 * g0 + h00 * g1) / det;
    const l0 = loglik(b0, b1); let t = 1;
    while (t > 1e-4 && loglik(b0 + t * d0, b1 + t * d1) < l0) t /= 2; // step halving
    return [b0 + t * d0, b1 + t * d1];
  }
  function newton(b0, b1, it) { for (let k = 0; k < it; k++) [b0, b1] = newtonStep(b0, b1); return { b0, b1, ll: logloss(b0, b1) }; }

  const lgB0 = $('logit-lg-b0'), lgB1 = $('logit-lg-b1');
  function lgSync() {
    lgB0.value = LG.b0; lgB1.value = LG.b1;
    $('logit-lg-b0-v').textContent = minus(M.fmt(LG.b0, 1));
    $('logit-lg-b1-v').textContent = minus(M.fmt(LG.b1, 2));
    const ll = logloss(LG.b0, LG.b1);
    $('logit-lg-ll').textContent = isFinite(ll) ? M.fmt(ll, 3) : '∞';
    $('logit-lg-llmin').textContent = M.fmt(LG.opt.ll, 3);
    $('logit-lg-or').textContent = M.fmt(Math.exp(LG.b1), 2);
    const x50 = Math.abs(LG.b1) > 1e-6 ? -LG.b0 / LG.b1 : NaN;
    $('logit-lg-x50').textContent = isFinite(x50) && x50 >= 0 && x50 <= 30 ? M.fmt(x50, 1) + ' min' : 'fuera de rango';
    $('logit-lg-head').textContent = `p(x) = σ(${minus(M.fmt(LG.b0, 2))} + ${minus(M.fmt(LG.b1, 3))}·x)`;
    drawLG();
  }
  lgB0.addEventListener('input', () => { LG.anim++; LG.b0 = +lgB0.value; lgSync(); });
  lgB1.addEventListener('input', () => { LG.anim++; LG.b1 = +lgB1.value; lgSync(); });
  $('logit-lg-fit').addEventListener('click', () => {
    const id = ++LG.anim; let k = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = () => {
      if (id !== LG.anim) return;
      [LG.b0, LG.b1] = newtonStep(LG.b0, LG.b1); k++; lgSync();
      const done = Math.abs(logloss(LG.b0, LG.b1) - LG.opt.ll) < 1e-7 || k > 30;
      if (!done) reduce ? step() : setTimeout(step, 260);
    };
    step();
  });
  $('logit-lg-new').addEventListener('click', () => { LG.anim++; LG.seed = (LG.seed * 7919 + 13) % 100003; lgData(); lgSync(); });

  function drawLG() {
    const f = M.fit($('logit-c-lg')); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 38, r: 14, t: 18, b: 40 };
    const X = v => pad.l + v / 30 * (w - pad.l - pad.r);
    const Y = p => pad.t + (1 - p) * (h - pad.t - pad.b);
    // grid
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = 0; v <= 30; v += 5) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    for (const p of [0, .25, .5, .75, 1]) { const y = Math.round(Y(p)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (const p of [0, .5, 1]) ctx.fillText(M.fmt(p, p % 1 ? 1 : 0), pad.l - 6, Y(p) + 4);
    // 50 % reference
    ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(.5)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(.5)) + .5); ctx.stroke();
    const x50 = Math.abs(LG.b1) > 1e-6 ? -LG.b0 / LG.b1 : NaN;
    if (isFinite(x50) && x50 >= 0 && x50 <= 30) { const x = Math.round(X(x50)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.setLineDash([]);
    // points
    for (let i = 0; i < LG.xs.length; i++) {
      const x = LG.xs[i], y = LG.ys[i], p = sig(LG.b0 + LG.b1 * x);
      const wrong = (p >= .5 ? 1 : 0) !== y;
      const py = y ? Y(1) + 4 + LG.jit[i] * 10 : Y(0) - 4 - LG.jit[i] * 10;
      ctx.fillStyle = wrong ? hot : (y ? accent : muted); ctx.globalAlpha = wrong ? 1 : (y ? .85 : .6);
      ctx.beginPath(); ctx.arc(X(x), py, wrong ? 4 : 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // optimum (faint) and current curve
    const curve = (b0, b1) => { ctx.beginPath(); for (let i = 0; i <= 200; i++) { const x = 30 * i / 200, y = Y(sig(b0 + b1 * x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); } ctx.stroke(); };
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.globalAlpha = .35; ctx.setLineDash([5, 4]); curve(LG.opt.b0, LG.opt.b1); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2; curve(LG.b0, LG.b1);
    // axis
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + 8.5); ctx.lineTo(w - pad.r, h - pad.b + 8.5); ctx.stroke();
    M.axisTicks(ctx, X, 0, 30, 5, h - pad.b + 24, muted);
    ctx.textAlign = 'right'; ctx.fillText('minutos', w - pad.r, h - 3);
    ctx.textAlign = 'left'; ctx.fillText('┄ curva óptima', pad.l, h - 3);
  }

  // ================= simulator B: threshold, confusion matrix, ROC =================
  const RC = { c: 0.5, pos: 100, seed: 11, items: [], roc: [], auc: 0 };
  function rcData() {
    const r = rng(RC.seed), n = 200, nPos = RC.pos, nNeg = n - nPos;
    const m0 = 10, m1 = 17, s = 4, prior = Math.log(nPos / nNeg);
    const a = (m1 - m0) / (s * s), b = prior - (m1 * m1 - m0 * m0) / (2 * s * s);
    RC.items = [];
    for (let i = 0; i < n; i++) { const y = i < nPos ? 1 : 0; const x = (y ? m1 : m0) + s * r.n(); RC.items.push({ y, p: sig(b + a * x), j: r.u() }); }
    // ROC from sorted scores
    const sorted = RC.items.slice().sort((u, v) => v.p - u.p);
    RC.roc = [[0, 0]]; let tp = 0, fp = 0;
    for (const it of sorted) { it.y ? tp++ : fp++; RC.roc.push([fp / nNeg, tp / nPos]); }
    let auc = 0; for (let i = 1; i < RC.roc.length; i++) auc += (RC.roc[i][0] - RC.roc[i - 1][0]) * (RC.roc[i][1] + RC.roc[i - 1][1]) / 2;
    RC.auc = auc;
  }
  function rcCounts() {
    let vp = 0, fn = 0, fp = 0, vn = 0;
    for (const it of RC.items) { const pr = it.p >= RC.c; if (it.y) pr ? vp++ : fn++; else pr ? fp++ : vn++; }
    return { vp, fn, fp, vn };
  }
  const rcC = $('logit-rc-c');
  rcC.addEventListener('input', () => { RC.c = +rcC.value / 100; rcSync(); });
  M.segBind('logit-rc-mix', b => { RC.pos = +b.dataset.pos; rcData(); rcSync(); });
  $('logit-rc-new').addEventListener('click', () => { RC.seed = (RC.seed * 7919 + 29) % 100003; rcData(); rcSync(); });
  const ratio = (a, b) => b ? M.pct(a / b, 1) : '–';
  function rcSync() {
    $('logit-rc-c-v').textContent = M.fmt(RC.c, 2);
    const k = rcCounts(), n = RC.items.length;
    $('logit-rc-acc').textContent = M.pct((k.vp + k.vn) / n, 1);
    $('logit-rc-sens').textContent = ratio(k.vp, k.vp + k.fn);
    $('logit-rc-spec').textContent = ratio(k.vn, k.vn + k.fp);
    $('logit-rc-prec').textContent = ratio(k.vp, k.vp + k.fp);
    $('logit-rc-head').textContent = 'AUC = ' + M.fmt(RC.auc, 3);
    $('logit-rc-n').textContent = `n = ${n} · ${RC.pos} compran`;
    drawRC();
  }
  function drawRC() {
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line'), surface = M.tok('--surface-2');
    const k = rcCounts();
    // --- strip of scores
    let f = M.fit($('logit-c-rc-s'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 14, r: 14, t: 8, b: 24 };
      const X = p => pad.l + p * (w - pad.l - pad.r);
      const bandH = (h - pad.t - pad.b) / 2;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = 0; v <= 1.001; v += .25) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(pad.t + bandH) + .5); ctx.lineTo(w - pad.r, Math.round(pad.t + bandH) + .5); ctx.stroke();
      ctx.globalAlpha = 1;
      // threshold shading (predicted yes zone)
      ctx.fillStyle = accent; ctx.globalAlpha = .08; ctx.fillRect(X(RC.c), pad.t, X(1) - X(RC.c), h - pad.t - pad.b); ctx.globalAlpha = 1;
      for (const it of RC.items) {
        const y = pad.t + (it.y ? 0 : bandH) + 16 + it.j * (bandH - 22);
        const pr = it.p >= RC.c, wrong = pr !== !!it.y;
        ctx.fillStyle = wrong ? hot : (it.y ? accent : muted); ctx.globalAlpha = wrong ? .95 : .6;
        ctx.beginPath(); ctx.arc(X(it.p), y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = font(); ctx.textAlign = 'left';
      for (const [txt, yy] of [['compran', pad.t + 11], ['no compran', pad.t + bandH + 11]]) {
        ctx.fillStyle = M.tok('--bg'); ctx.globalAlpha = .85; ctx.fillRect(pad.l + 1, yy - 10, ctx.measureText(txt).width + 7, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = muted; ctx.fillText(txt, pad.l + 4, yy);
      }
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.round(X(RC.c)) + .5, pad.t); ctx.lineTo(Math.round(X(RC.c)) + .5, h - pad.b); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const v of [0, .25, .5, .75, 1]) ctx.fillText(M.fmt(v, v % 1 ? 2 : 0), X(v), h - 8);
    }
    // --- confusion matrix
    f = M.fit($('logit-c-rc-m'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const left = 56, top = 34, gap = 6, right = 12, bottom = 12;
      const cw = (w - left - right - gap) / 2, ch = (h - top - bottom - gap) / 2;
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'center';
      ctx.fillText('real: sí', left + cw / 2, top - 12); ctx.fillText('real: no', left + cw + gap + cw / 2, top - 12);
      ctx.textAlign = 'right';
      ctx.fillText('pred.', left - 8, top + ch / 2 - 2); ctx.fillText('sí', left - 8, top + ch / 2 + 12);
      ctx.fillText('pred.', left - 8, top + ch + gap + ch / 2 - 2); ctx.fillText('no', left - 8, top + ch + gap + ch / 2 + 12);
      const cells = [
        { lab: 'VP', v: k.vp, good: true, cx: 0, cy: 0 }, { lab: 'FP', v: k.fp, good: false, cx: 1, cy: 0 },
        { lab: 'FN', v: k.fn, good: false, cx: 0, cy: 1 }, { lab: 'VN', v: k.vn, good: true, cx: 1, cy: 1 },
      ];
      const maxV = Math.max(1, ...cells.map(c => c.v));
      for (const c of cells) {
        const x = left + c.cx * (cw + gap), y = top + c.cy * (ch + gap);
        ctx.fillStyle = surface; ctx.fillRect(x, y, cw, ch);
        ctx.fillStyle = c.good ? accent : hot; ctx.globalAlpha = .12 + .5 * c.v / maxV; ctx.fillRect(x, y, cw, ch); ctx.globalAlpha = 1;
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = '600 22px ' + M.tok('--f-mono');
        ctx.fillText(c.v, x + cw / 2, y + ch / 2 + 6);
        ctx.font = font(); ctx.fillStyle = muted; ctx.fillText(c.lab, x + cw / 2, y + ch / 2 + 24);
      }
    }
    // --- ROC
    f = M.fit($('logit-c-rc-r'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 46, r: 14, t: 12, b: 38 };
      const X = v => pad.l + v * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = 0; v <= 1.001; v += .25) {
        ctx.beginPath(); ctx.moveTo(Math.round(X(v)) + .5, pad.t); ctx.lineTo(Math.round(X(v)) + .5, h - pad.b); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(v)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(v)) + .5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = accent; ctx.globalAlpha = .14; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (const [a, b] of RC.roc) ctx.lineTo(X(a), Y(b)); ctx.lineTo(X(1), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      RC.roc.forEach(([a, b], i) => i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))); ctx.stroke();
      const tpr = k.vp / (k.vp + k.fn || 1), fpr = k.fp / (k.fp + k.vn || 1);
      ctx.fillStyle = hot; ctx.strokeStyle = M.tok('--bg'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(fpr), Y(tpr), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = '600 13px ' + M.tok('--f-mono'); ctx.textAlign = 'right';
      ctx.fillText('AUC ' + M.fmt(RC.auc, 2), X(1) - 6, Y(0) - 10);
      ctx.fillStyle = muted; ctx.font = font();
      for (const v of [0, .5, 1]) { ctx.textAlign = 'right'; ctx.fillText(M.fmt(v, v % 1 ? 1 : 0), pad.l - 6, Y(v) + 4); ctx.textAlign = 'center'; ctx.fillText(M.fmt(v, v % 1 ? 1 : 0), X(v), h - pad.b + 16); }
      ctx.textAlign = 'center'; ctx.fillText('1 − especificidad', (pad.l + w - pad.r) / 2, h - 5);
      ctx.save(); ctx.translate(11, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('sensibilidad', 0, 0); ctx.restore();
    }
  }

  M.draw['logit'] = () => { drawLG(); drawRC(); };
  M.init.push(() => { lgData(); lgSync(); rcData(); rcSync(); });
})();
