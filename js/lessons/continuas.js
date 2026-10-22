/* StatEdx · sesión continuas: Distribuciones continuas */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // ---------- matemáticas: log-gamma, gamma y beta incompletas regularizadas ----------
  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1; let s = LZ[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) s += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
  }
  function pgammaReg(a, x) {           // P(a, x)
    if (x <= 0) return 0;
    if (x < a + 1) { let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 300; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; } return sum * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, hh = d;
    for (let i = 1; i < 300; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; hh *= del; if (Math.abs(del - 1) < 1e-12) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * hh;
  }
  function betacf(a, b, x) {
    const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let hh = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; hh *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; hh *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return hh;
  }
  function pbetaReg(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  const dgamma = (x, a, r) => x <= 0 ? (a < 1 ? Infinity : a === 1 ? r : 0) : Math.exp(a * Math.log(r) + (a - 1) * Math.log(x) - r * x - lgamma(a));
  const dbeta = (x, a, b) => x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lgamma(a) - lgamma(b) + lgamma(a + b));

  // ---------- distribuciones del laboratorio 1 ----------
  const D = {
    uni: { p: [['MÍNIMO · a', 0, 8, 0.5, 2], ['MÁXIMO · b', 0.5, 12, 0.5, 10]],
      pdf: (x, a, b) => x >= a && x <= b ? 1 / (b - a) : 0, cdf: (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a))),
      mom: (a, b) => [(a + b) / 2, (b - a) / Math.sqrt(12)], range: () => [0, 12], name: (a, b) => `U(${fmt(a, 1)}; ${fmt(b, 1)})` },
    exp: { p: [['TASA · λ', 0.1, 3, 0.1, 0.5]],
      pdf: (x, l) => x < 0 ? 0 : l * Math.exp(-l * x), cdf: (x, l) => x < 0 ? 0 : 1 - Math.exp(-l * x),
      mom: l => [1 / l, 1 / l], range: l => [0, Math.max(5, Math.ceil(-Math.log(0.005) / l))], name: l => `Exp(${fmt(l, 1)})` },
    gam: { p: [['FORMA · α', 0.5, 10, 0.5, 2], ['TASA · β', 0.25, 3, 0.25, 0.5]],
      pdf: (x, a, r) => dgamma(x, a, r), cdf: (x, a, r) => pgammaReg(a, r * x),
      mom: (a, r) => [a / r, Math.sqrt(a) / r], range: (a, r) => [0, Math.max(10, Math.ceil((a + 4.5 * Math.sqrt(a) + 2) / r))], name: (a, r) => `Gamma(${fmt(a, 1)}; ${fmt(r, 2)})` },
    bet: { p: [['FORMA · α', 0.5, 10, 0.5, 2], ['FORMA · β', 0.5, 10, 0.5, 5]],
      pdf: (x, a, b) => dbeta(x, a, b), cdf: (x, a, b) => pbetaReg(x, a, b),
      mom: (a, b) => [a / (a + b), Math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1)))], range: () => [0, 1], name: (a, b) => `Beta(${fmt(a, 1)}; ${fmt(b, 1)})` },
  };
  const S = { d: 'gam', v: 'pdf', p: [2, 0.5], xf: 0.25 };
  const pEl = [$('continuas-p1'), $('continuas-p2')], xEl = $('continuas-x');
  const dec = st => st < 0.1 ? 2 : st < 1 ? (String(st).length > 3 ? 2 : 1) : 0;
  function setDist(d) {
    S.d = d; const spec = D[d].p;
    for (let i = 0; i < 2; i++) {
      $('continuas-p' + (i + 1) + '-wrap').hidden = !spec[i];
      if (!spec[i]) continue;
      const [name, lo, hi, st, v] = spec[i];
      $('continuas-p' + (i + 1) + '-name').textContent = name;
      Object.assign(pEl[i], { min: lo, max: hi, step: st }); pEl[i].value = v; S.p[i] = v;
    }
    S.xf = 0.25; xEl.value = 250;
    syncLab();
  }
  function syncLab() {
    if (S.d === 'uni' && S.p[1] <= S.p[0]) { S.p[1] = S.p[0] + 0.5; pEl[1].value = S.p[1]; }
    D[S.d].p.forEach((sp, i) => { $('continuas-p' + (i + 1) + '-v').textContent = fmt(S.p[i], dec(sp[3])); });
    drawLab();
  }
  pEl.forEach((e, i) => e.addEventListener('input', () => {
    S.p[i] = +e.value;
    if (S.d === 'uni' && i === 0 && S.p[0] >= S.p[1]) { S.p[1] = Math.min(12, S.p[0] + 0.5); pEl[1].value = S.p[1]; if (S.p[0] >= S.p[1]) { S.p[0] = S.p[1] - 0.5; pEl[0].value = S.p[0]; } }
    if (S.d === 'uni' && i === 1 && S.p[1] <= S.p[0]) { S.p[0] = Math.max(0, S.p[1] - 0.5); pEl[0].value = S.p[0]; }
    syncLab();
  }));
  xEl.addEventListener('input', () => { S.xf = +xEl.value / 1000; drawLab(); });
  segBind('continuas-dist', b => setDist(b.dataset.d));
  segBind('continuas-view', b => { S.v = b.dataset.v; drawLab(); });

  function median(dd, ps, lo, hi) {
    let a = lo, b = hi; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (dd.cdf(m, ...ps) < 0.5) a = m; else b = m; } return (a + b) / 2;
  }
  function drawLab() {
    const dd = D[S.d], ps = S.p.slice(0, dd.p.length);
    const [lo, hi] = dd.range(...ps), x = lo + (hi - lo) * S.xf;
    const [mu, sd] = dd.mom(...ps), Fx = dd.cdf(x, ...ps);
    const dx = hi <= 1 ? 2 : hi < 20 ? 2 : 1;
    $('continuas-x-v').textContent = fmt(x, dx);
    $('continuas-mean').textContent = fmt(mu, mu < 10 ? 3 : 2);
    $('continuas-sd').textContent = fmt(sd, sd < 10 ? 3 : 2);
    $('continuas-cdf').textContent = pct(Fx, 1);
    const med = median(dd, ps, lo, Math.max(hi, mu + 10 * sd));
    $('continuas-med').textContent = fmt(med, med < 10 ? 3 : 2);
    $('continuas-head').textContent = 'X ~ ' + dd.name(...ps);

    const f = fit($('continuas-c-pdf')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 42, r: 14, t: 14, b: 26 };
    const G = 400, xs = [], ys = [];
    for (let i = 0; i <= G; i++) { const t = lo + (hi - lo) * i / G; xs.push(t); ys.push(S.v === 'pdf' ? dd.pdf(t, ...ps) : dd.cdf(t, ...ps)); }
    let top;
    if (S.v === 'cdf') top = 1.05;
    else { const finite = ys.filter(v => isFinite(v)).sort((a, b) => a - b); top = Math.min(finite[finite.length - 1], finite[Math.floor(finite.length * 0.97)] * 2.2 || 1) * 1.1; if (!(top > 0)) top = 1; }
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const Y = v => h - pad.b - Math.min(v, top * 1.02) / top * (h - pad.t - pad.b);
    const xstepC = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100].find(s => (hi - lo) / s <= (w < 420 ? 5 : 10)) || 100;
    const ystep = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5].find(s => top / s <= 5) || 5;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = lo; v <= hi + 1e-9; v += xstepC) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
    for (let v = 0; v <= top + 1e-9; v += ystep) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (S.v === 'pdf') {
      // área hasta x
      ctx.fillStyle = accent; ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(X(lo), Y(0));
      for (let i = 0; i <= G && xs[i] <= x; i++) ctx.lineTo(X(xs[i]), Y(isFinite(ys[i]) ? ys[i] : top * 2));
      ctx.lineTo(X(x), Y(Math.min(dd.pdf(x, ...ps), top * 2))); ctx.lineTo(X(x), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = hot; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(Fx)); ctx.lineTo(pad.l, Y(Fx)); ctx.stroke(); ctx.setLineDash([]);
    }
    // curva (con saltos en la uniforme)
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.beginPath();
    if (S.d === 'uni' && S.v === 'pdf') {   // escalón exacto de la uniforme
      const [a, b] = ps, d = 1 / (b - a);
      ctx.moveTo(X(lo), Y(0)); ctx.lineTo(X(a), Y(0)); ctx.lineTo(X(a), Y(d)); ctx.lineTo(X(b), Y(d)); ctx.lineTo(X(b), Y(0)); ctx.lineTo(X(hi), Y(0));
    } else {
      for (let i = 0; i <= G; i++) { const v = isFinite(ys[i]) ? ys[i] : top * 2; i ? ctx.lineTo(X(xs[i]), Y(v)) : ctx.moveTo(X(xs[i]), Y(v)); }
    }
    ctx.stroke();
    // media
    if (mu <= hi) { const xm = Math.round(X(mu)) + .5; ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xm, pad.t); ctx.lineTo(xm, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = xm > w - 60 ? 'right' : 'left'; ctx.fillText('media', xm + (xm > w - 60 ? -4 : 4), pad.t + 10); }
    // valor x
    ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x), pad.t); ctx.lineTo(X(x), h - pad.b); ctx.stroke();
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(x), Y(S.v === 'pdf' ? Math.min(dd.pdf(x, ...ps), top) : Fx), 4.5, 0, 2 * Math.PI); ctx.fill();
    // ejes
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = lo; v <= hi + 1e-9; v += xstepC) ctx.fillText(fmt(v, xstepC < 1 ? (xstepC < 0.25 ? 1 : 2) : 0), X(v), h - 8);
    ctx.textAlign = 'right';
    for (let v = 0; v <= top + 1e-9; v += ystep) ctx.fillText(fmt(v, ystep < 0.1 ? 2 : ystep < 1 ? (ystep === 0.25 ? 2 : 1) : 0), pad.l - 5, Y(v) + 4);
    ctx.textAlign = 'left'; ctx.fillText(S.v === 'pdf' ? 'f(x)' : 'F(x)', pad.l + 4, pad.t + 10);
    if (S.v === 'pdf') { ctx.fillStyle = ink; ctx.font = '600 13px ' + tok('--f-mono'); const tx = X(x) - 8; if (tx > pad.l + 60) { ctx.textAlign = 'right'; ctx.fillText(pct(Fx, 1), tx, h - pad.b - 10); } else { ctx.textAlign = 'left'; ctx.fillText(pct(Fx, 1), X(x) + 8, h - pad.b - 10); } }
  }

  // ================= laboratorio 2: proceso de Poisson → gamma =================
  const PP = { lam: 4.5, k: 3, t: [], last: null };
  const HOR = 2;   // horas que se muestran en la línea de tiempo
  function runProcess() { const ev = []; let t = 0; while (ev.length < Math.max(PP.k, 1) || t < HOR) { t += -Math.log(1 - Math.random()) / PP.lam; ev.push(t); if (ev.length > 400) break; } return ev; }
  function ppSim(times) { for (let i = 0; i < times; i++) { const ev = runProcess(); PP.t.push(ev[PP.k - 1]); PP.last = ev; } drawPP(); }
  function ppReset(auto) { PP.t = []; PP.last = null; auto ? ppSim(500) : drawPP(); }
  const lamEl = $('continuas-lam'), kEl = $('continuas-k');
  lamEl.addEventListener('input', () => { PP.lam = +lamEl.value; $('continuas-lam-v').textContent = fmt(PP.lam, 1); ppReset(true); });
  kEl.addEventListener('input', () => { PP.k = +kEl.value; $('continuas-k-v').textContent = PP.k; ppReset(true); });
  $('continuas-pp-more').addEventListener('click', () => ppSim(500));
  $('continuas-pp-reset').addEventListener('click', () => ppReset(false));

  function drawPP() {
    const { lam, k, t } = PP, n = t.length;
    const mt = k / lam, vt = k / (lam * lam);
    let ms = NaN, vs = NaN;
    if (n) { ms = t.reduce((a, b) => a + b, 0) / n; if (n > 1) vs = t.reduce((a, b) => a + (b - ms) ** 2, 0) / (n - 1); }
    const f3 = v => isNaN(v) ? '–' : fmt(v, 3);
    $('continuas-pp-ms').textContent = f3(ms); $('continuas-pp-vs').textContent = f3(vs);
    $('continuas-pp-mt').textContent = f3(mt); $('continuas-pp-vt').textContent = f3(vt);
    $('continuas-pp-head').textContent = `T${k} ~ Gamma(${k}; ${fmt(lam, 1)}) · horas`;
    $('continuas-pp-n').textContent = fmt(n, 0).replace(/\./g, ' ') + ' simulaciones';
    $('continuas-pp-last').textContent = PP.last ? `evento ${k} a las ${fmt(PP.last[k - 1], 2)} h` : 'sin simular';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let f = fit($('continuas-c-proc'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const x0 = 12, x1 = w - 12, y = 30, X = v => x0 + v / HOR * (x1 - x0);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = 0; v <= HOR + 1e-9; v += 0.5) { ctx.beginPath(); ctx.moveTo(X(v), y - 4); ctx.lineTo(X(v), y + 4); ctx.stroke(); ctx.fillText(fmt(v, 1) + ' h', Math.min(Math.max(X(v), x0 + 16), x1 - 16), y + 22); }
      if (PP.last) {
        PP.last.forEach((e, i) => {
          if (e > HOR) return;
          const hit = i === k - 1;
          ctx.strokeStyle = hit ? hot : accent; ctx.lineWidth = hit ? 3 : 2;
          ctx.beginPath(); ctx.moveTo(X(e), y - (hit ? 20 : 14)); ctx.lineTo(X(e), y); ctx.stroke();
        });
        const tk = PP.last[k - 1];
        if (tk <= HOR) { ctx.fillStyle = hot; ctx.textAlign = X(tk) > w - 40 ? 'right' : 'left'; ctx.fillText('k', X(tk) + (X(tk) > w - 40 ? -5 : 5), y - 14); }
        else { ctx.fillStyle = hot; ctx.textAlign = 'right'; ctx.fillText('evento k después de 2 h →', x1, y - 12); }
      }
    }

    f = fit($('continuas-c-gam'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 12, b: 26 };
      const hi = Math.max(0.5, (k + 4.5 * Math.sqrt(k) + 1) / lam);
      const B = 36, bw = hi / B, cnt = new Array(B).fill(0);
      for (const v of t) if (v < hi) cnt[Math.floor(v / bw)]++;
      const dens = cnt.map(c => n ? c / (n * bw) : 0);
      const G = 300, dg = []; for (let i = 0; i <= G; i++) { const x = hi * i / G; dg.push(k === 1 && i === 0 ? lam : dgamma(x, k, lam)); }
      const top = Math.max(...dens, ...dg) * 1.1;
      const X = v => pad.l + v / hi * (w - pad.l - pad.r), Y = v => h - pad.b - v / top * (h - pad.t - pad.b);
      const xs = [0.1, 0.2, 0.25, 0.5, 1, 2, 5].find(s => hi / s <= (w < 420 ? 5 : 8)) || 5;
      const ys = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5].find(s => top / s <= 5) || 5;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = 0; v <= hi + 1e-9; v += xs) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      for (let v = 0; v <= top + 1e-9; v += ys) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = .6; ctx.fillStyle = accent;
      dens.forEach((d, i) => { if (d) { const a = X(i * bw), b = X((i + 1) * bw); ctx.fillRect(a + .5, Y(d), Math.max(1, b - a - 1), h - pad.b - Y(d)); } });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.beginPath();
      dg.forEach((d, i) => { const xx = X(hi * i / G), yy = Y(d); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
      const xm = Math.round(X(mt)) + .5; ctx.strokeStyle = hot; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xm, pad.t); ctx.lineTo(xm, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = hot; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('k/λ', xm + 4, pad.t + 10);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let v = 0; v <= hi + 1e-9; v += xs) ctx.fillText(fmt(v, xs < 1 ? (xs === 0.25 ? 2 : 1) : 0), X(v), h - 8);
      ctx.textAlign = 'right';
      for (let v = 0; v <= top + 1e-9; v += ys) ctx.fillText(fmt(v, ys < 0.1 ? 2 : ys < 1 ? (ys === 0.25 ? 2 : 1) : 0), pad.l - 5, Y(v) + 4);
      ctx.textAlign = 'right'; ctx.fillText('horas →', w - pad.r, pad.t + 10);
    }
  }

  M.draw.continuas = () => { drawLab(); drawPP(); };
  M.init.push(() => { setDist('gam'); ppSim(500); });
})();
