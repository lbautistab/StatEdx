/* StatEdx · sesión anova: Análisis de varianza (ANOVA) */
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
  const lbeta = (a, b) => lgam(a) + lgam(b) - lgam(a + b);
  const fsf = (f, d1, d2) => f <= 0 ? 1 : ibeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
  const fpdf = (x, d1, d2) => x <= 0 ? 0 : Math.exp((d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log(1 + d1 * x / d2) - lbeta(d1 / 2, d2 / 2));
  function finv(p, d1, d2) { let lo = 0, hi = 1000; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; fsf(m, d1, d2) > p ? lo = m : hi = m; } return (lo + hi) / 2; }
  const tsf2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
  function tinv(p2, df) { let lo = 0, hi = 500; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; tsf2(m, df) > p2 ? lo = m : hi = m; } return (lo + hi) / 2; }
  const pfmt = p => p < 0.0001 ? '< 0,0001' : fmt(p, p < 0.01 ? 4 : 3);

  // ================= simulador 1: ANOVA =================
  const NMAX = 40, KMAX = 5;
  const S = { k: 3, sep: 0.5, sd: 0.4, n: 6, z: [], jy: [] };
  function newSample() {
    S.z = Array.from({ length: KMAX }, () => Array.from({ length: NMAX }, randn));
    S.jy = Array.from({ length: KMAX }, () => Array.from({ length: NMAX }, () => Math.random() - 0.5));
    draw();
  }
  const trueMean = i => 4.6 + (S.k > 1 ? S.sep * (2 * i / (S.k - 1) - 1) : 0);
  function anova(groups) {
    const k = groups.length, N = groups.reduce((s, g) => s + g.length, 0);
    const means = groups.map(g => g.reduce((s, v) => s + v, 0) / g.length);
    const gm = groups.reduce((s, g, i) => s + means[i] * g.length, 0) / N;
    let ssb = 0, ssw = 0;
    groups.forEach((g, i) => { ssb += g.length * (means[i] - gm) ** 2; for (const v of g) ssw += (v - means[i]) ** 2; });
    const d1 = k - 1, d2 = N - k, msw = ssw / d2, F = (ssb / d1) / msw;
    return { k, N, means, gm, ssb, ssw, d1, d2, msw, F, p: fsf(F, d1, d2), eta: ssb / (ssb + ssw) };
  }

  function draw() {
    if (!S.z.length) return;
    const groups = [];
    for (let i = 0; i < S.k; i++) { const g = []; for (let j = 0; j < S.n; j++) g.push(trueMean(i) + S.sd * S.z[i][j]); groups.push(g); }
    const A = anova(groups);
    // Bonferroni por pares con el CM dentro
    const m = A.k * (A.k - 1) / 2; let sig = 0;
    for (let i = 0; i < A.k; i++) for (let j = i + 1; j < A.k; j++) {
      const t = (A.means[i] - A.means[j]) / Math.sqrt(A.msw * (2 / S.n));
      if (Math.min(1, tsf2(t, A.d2) * m) < 0.05) sig++;
    }
    $('anova-r-f').textContent = fmt(A.F, 2);
    $('anova-r-p').textContent = pfmt(A.p);
    $('anova-r-eta').textContent = fmt(A.eta, 2);
    $('anova-r-pairs').textContent = `${sig} de ${m}`;
    $('anova-head').textContent = `SC entre = ${fmt(A.ssb, 2)} · SC dentro = ${fmt(A.ssw, 2)}`;
    $('anova-lbl-f').textContent = `gl = ${A.d1} y ${A.d2}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let f = fit($('anova-c-data'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 10, b: 26 };
      let lo = Infinity, hi = -Infinity;
      for (const g of groups) for (const v of g) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const span = hi - lo, step = span > 6 ? 2 : span > 3 ? 1 : 0.5;
      lo = Math.floor((lo - 0.05) / step) * step; hi = Math.ceil((hi + 0.05) / step) * step;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const rowH = (h - pad.t - pad.b) / A.k, Yc = i => pad.t + rowH * (i + 0.5);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = lo; v <= hi + 1e-9; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      for (let i = 1; i < A.k; i++) { const y = Math.round(pad.t + rowH * i) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // media general
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(Math.round(X(A.gm)) + .5, pad.t); ctx.lineTo(Math.round(X(A.gm)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      groups.forEach((g, i) => {
        const yc = Yc(i), jh = Math.min(rowH * 0.6, 34);
        ctx.fillStyle = accent; ctx.globalAlpha = .6;
        g.forEach((v, j) => { ctx.beginPath(); ctx.arc(X(v), yc + S.jy[i][j] * jh, 3.2, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1;
        // variación entre: de la media general a la media del grupo
        ctx.strokeStyle = hot; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(A.gm), yc); ctx.lineTo(X(A.means[i]), yc); ctx.stroke();
        ctx.strokeStyle = accent; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(X(A.means[i]), yc - jh * 0.6 - 4); ctx.lineTo(X(A.means[i]), yc + jh * 0.6 + 4); ctx.stroke();
        ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right'; ctx.fillText('G' + (i + 1), pad.l - 8, yc + 4);
      });
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = lo; v <= hi + 1e-9; v += step) ctx.fillText(fmt(v, step < 1 ? 1 : 0), Math.min(Math.max(X(v), pad.l + 10), w - pad.r - 10), h - 8);
    }

    f = fit($('anova-c-f'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 30, b: 26 };
      const fc = finv(0.05, A.d1, A.d2), xmax = Math.max(6, Math.ceil(fc * 2));
      const X = v => pad.l + v / xmax * (w - pad.l - pad.r);
      let peak = 0; for (let i = 1; i <= 200; i++) peak = Math.max(peak, fpdf(xmax * i / 200, A.d1, A.d2));
      peak = Math.min(peak, 1.2) * 1.1;
      const Y = d => h - pad.b - Math.min(d, peak) / peak * (h - pad.t - pad.b);
      const step = xmax > 12 ? 4 : xmax > 6 ? 2 : 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = 0; v <= xmax; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const Fv = Math.min(A.F, xmax);
      ctx.fillStyle = hot; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(X(Fv), Y(0));
      for (let i = 0; i <= 120; i++) { const v = Fv + (xmax - Fv) * i / 120; ctx.lineTo(X(v), Y(fpdf(v, A.d1, A.d2))); }
      ctx.lineTo(X(xmax), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 1; i <= 300; i++) { const v = xmax * i / 300, y = Y(fpdf(v, A.d1, A.d2)); i > 1 ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); }
      ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(Math.round(X(fc)) + .5, pad.t + 28); ctx.lineTo(Math.round(X(fc)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('crítico ' + fmt(fc, 2), X(fc) + 5, pad.t + 44);
      const fx = X(Fv);
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(fx, pad.t - 4); ctx.lineTo(fx, h - pad.b); ctx.stroke();
      ctx.fillStyle = hot; ctx.font = '600 12px ' + tok('--f-mono');
      ctx.textAlign = fx > w - 70 ? 'right' : fx < 60 ? 'left' : 'center';
      ctx.fillText('F = ' + fmt(A.F, 2) + (A.F > xmax ? ' →' : ''), fx, pad.t - 10);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = 0; v <= xmax; v += step) ctx.fillText(v, Math.min(Math.max(X(v), pad.l + 6), w - pad.r - 8), h - 8);
    }
  }
  const bind = (id, key, d) => { const el = $(id); el.addEventListener('input', () => { S[key] = +el.value; $(id + '-v').textContent = fmt(S[key], d); draw(); }); };
  bind('anova-sep', 'sep', 2); bind('anova-sd', 'sd', 2); bind('anova-n', 'n', 0);
  segBind('anova-k', b => { S.k = +b.dataset.k; draw(); });
  $('anova-again').addEventListener('click', newSample);

  // ================= simulador 2: inflación del error tipo I =================
  const FW = { k: 5, res: {} };
  function simulate(k, reps = 400, n = 10) {
    const m = k * (k - 1) / 2, df = 2 * n - 2;
    const tc = tinv(0.05, df), tcb = tinv(0.05 / m, df), fc = finv(0.05, k - 1, k * n - k);
    let raw = 0, bon = 0, an = 0;
    for (let r = 0; r < reps; r++) {
      const mu = [], vv = [];
      for (let i = 0; i < k; i++) { let s = 0, s2 = 0; for (let j = 0; j < n; j++) { const x = randn(); s += x; s2 += x * x; } const mm = s / n; mu.push(mm); vv.push((s2 - n * mm * mm) / (n - 1)); }
      let tmax = 0;
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const t = Math.abs(mu[i] - mu[j]) / Math.sqrt((vv[i] + vv[j]) / 2 * (2 / n)); if (t > tmax) tmax = t; }
      if (tmax > tc) raw++; if (tmax > tcb) bon++;
      const gm = mu.reduce((s, v) => s + v, 0) / k, ssb = n * mu.reduce((s, v) => s + (v - gm) ** 2, 0), ssw = (n - 1) * vv.reduce((s, v) => s + v, 0);
      if ((ssb / (k - 1)) / (ssw / (k * n - k)) > fc) an++;
    }
    FW.res[k] = { raw: raw / reps, bon: bon / reps, an: an / reps };
  }
  function drawFW() {
    const k = FW.k, m = k * (k - 1) / 2, r = FW.res[k];
    $('anova-fw-m').textContent = m;
    $('anova-fw-raw').textContent = r ? pct(r.raw, 1) : '–';
    $('anova-fw-bon').textContent = r ? pct(r.bon, 1) : '–';
    $('anova-fw-an').textContent = r ? pct(r.an, 1) : '–';
    $('anova-fw-head').textContent = `k = ${k} · 1 − 0,95ᵐ = ${pct(1 - 0.95 ** m, 1)}`;
    const f = fit($('anova-c-fw')); if (!f) return;
    const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    const pad = { l: 44, r: 16, t: 14, b: 30 };
    const X = kk => pad.l + (kk - 2) / 8 * (w - pad.l - pad.r);
    const Y = p => h - pad.b - p * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let p = 0; p <= 1.0001; p += 0.2) { const y = Math.round(Y(p)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hot; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0.05)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0.05)) + .5); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = muted; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let kk = 2; kk <= 10; kk += 0.1) { const y = Y(1 - 0.95 ** (kk * (kk - 1) / 2)); kk === 2 ? ctx.moveTo(X(kk), y) : ctx.lineTo(X(kk), y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.globalAlpha = .25; ctx.fillStyle = accent;
    const xk = Math.round(X(k)) + .5; ctx.beginPath(); ctx.moveTo(xk, pad.t); ctx.lineTo(xk, h - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
    const series = [['raw', hot], ['bon', accent], ['an', ink]];
    for (const [key, col] of series) {
      const ks = Object.keys(FW.res).map(Number).sort((a, b) => a - b);
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath();
      ks.forEach((kk, i) => { const y = Y(FW.res[kk][key]); i ? ctx.lineTo(X(kk), y) : ctx.moveTo(X(kk), y); }); if (ks.length > 1) ctx.stroke();
      ctx.fillStyle = col;
      ks.forEach(kk => { ctx.beginPath(); ctx.arc(X(kk), Y(FW.res[kk][key]), kk === k ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); });
    }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    for (let p = 0; p <= 1.0001; p += 0.2) ctx.fillText(fmt(p * 100, 0) + ' %', pad.l - 6, Y(p) + 4);
    ctx.textAlign = 'center';
    for (let kk = 2; kk <= 10; kk++) ctx.fillText(kk, X(kk), h - 12);
    ctx.textAlign = 'left'; ctx.fillText('5 %', pad.l + 4, Y(0.05) - 4);
  }
  const fwk = $('anova-fw-k');
  fwk.addEventListener('input', () => { FW.k = +fwk.value; $('anova-fw-k-v').textContent = FW.k; drawFW(); });
  $('anova-fw-run').addEventListener('click', () => { simulate(FW.k); drawFW(); });
  $('anova-fw-all').addEventListener('click', () => { for (let kk = 2; kk <= 10; kk++) simulate(kk); drawFW(); });

  M.draw['anova'] = () => { draw(); drawFW(); };
  M.init.push(() => { newSample(); simulate(FW.k); drawFW(); });
})();
