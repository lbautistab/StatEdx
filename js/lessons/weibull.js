/* StatEdx · sesión weibull: Modelos paramétricos: exponencial y Weibull */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + tok('--f-mono');
  const minus = s => String(s).replace('-', '−');
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // función gamma (aproximación de Lanczos)
  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
  function gridLines(ctx, X, Y, xs, ys, l, r, t, b) {
    ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of xs) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, b); ctx.stroke(); }
    for (const v of ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
  const TM = 60;

  // ================= simulador A: forma y escala =================
  const SH = { k: 1.5, l: 30 };
  const hW = (t, k, l) => (k / l) * Math.pow(Math.max(t, 1e-3) / l, k - 1);
  const SW = (t, k, l) => Math.exp(-Math.pow(t / l, k));
  function shSync() {
    $('weibull-sh-k').value = SH.k; $('weibull-sh-l').value = SH.l;
    $('weibull-sh-k-v').textContent = fmt(SH.k, 2); $('weibull-sh-l-v').textContent = SH.l;
    const med = SH.l * Math.pow(Math.LN2, 1 / SH.k), mean = SH.l * gamma(1 + 1 / SH.k);
    const out = v => v > 9999 ? '> 9 999 m' : fmt(v, 1) + ' m';
    $('weibull-sh-med').textContent = out(med);
    $('weibull-sh-mean').textContent = out(mean);
    $('weibull-sh-s24').textContent = fmt(SW(24, SH.k, SH.l), 3);
    $('weibull-sh-ratio').textContent = fmt(Math.pow(2, SH.k - 1), 2);
    const kind = Math.abs(SH.k - 1) < 0.026 ? 'riesgo constante (exponencial)' : SH.k < 1 ? 'riesgo decreciente' : 'riesgo creciente';
    $('weibull-sh-head').textContent = kind;
    drawSH();
  }
  $('weibull-sh-k').addEventListener('input', e => { SH.k = +e.target.value; document.querySelectorAll('#weibull-sh-pre button').forEach(b => b.setAttribute('aria-pressed', 'false')); shSync(); });
  $('weibull-sh-l').addEventListener('input', e => { SH.l = +e.target.value; shSync(); });
  segBind('weibull-sh-pre', b => { SH.k = +b.dataset.k; shSync(); });
  function drawSH() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), bg = tok('--bg');
    const pad = { l: 46, r: 12, t: 14, b: 30 };
    let f = fit($('weibull-c-h'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      let mx = 1 / SH.l; for (let t = 1; t <= TM; t += 0.5) mx = Math.max(mx, hW(t, SH.k, SH.l));
      const top = niceMax(mx * 1.08);
      const X = v => pad.l + v / TM * (w - pad.l - pad.r), Y = v => h - pad.b - Math.min(v, top) / top * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, [0, 12, 24, 36, 48, 60], [0, top / 2, top], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, top / 2, top]) ctx.fillText(fmt(v, top < 0.1 ? 3 : 2), pad.l - 5, Y(v) + 4);
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.moveTo(X(0), Y(1 / SH.l)); ctx.lineTo(X(TM), Y(1 / SH.l)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b + 1); ctx.clip();
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = Math.max(0.05, TM * i / 300), y = Y(hW(t, SH.k, SH.l)); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
      ctx.stroke(); ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TM, 12, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
    f = fit($('weibull-c-s'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const X = v => pad.l + v / TM * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, [0, 12, 24, 36, 48, 60], [0, .25, .5, .75, 1], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 5, Y(v) + 4);
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.globalAlpha = .7; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const t = TM * i / 200; i ? ctx.lineTo(X(t), Y(SW(t, 1, SH.l))) : ctx.moveTo(X(t), Y(SW(t, 1, SH.l))); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = TM * i / 300; i ? ctx.lineTo(X(t), Y(SW(t, SH.k, SH.l))) : ctx.moveTo(X(t), Y(SW(t, SH.k, SH.l))); }
      ctx.stroke();
      const med = SH.l * Math.pow(Math.LN2, 1 / SH.k);
      if (med <= TM) {
        ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(pad.l, Math.round(Y(.5)) + .5); ctx.lineTo(X(med), Math.round(Y(.5)) + .5); ctx.lineTo(X(med), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(med), Y(.5), 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(X(SH.l), Y(Math.exp(-1)), 4.5, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TM, 12, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
  }

  // ================= simulador B: ajuste y extrapolación =================
  const FT = { k: 2.5, n: 120, end: 24, seed: 9, data: [], km: [], wb: null, ex: null };
  const trueLam = k => 30 / Math.pow(Math.LN2, 1 / k);   // mediana real = 30 meses
  function ftData() {
    const r = rng(FT.seed), lam = trueLam(FT.k); FT.data = [];
    for (let i = 0; i < FT.n; i++) {
      const T = lam * Math.pow(-Math.log(1 - r()), 1 / FT.k), C = FT.end * (0.6 + 0.4 * r());
      FT.data.push({ y: Math.min(T, C), d: T <= C ? 1 : 0 });
    }
    FT.data.sort((a, b) => a.y - b.y || b.d - a.d);
  }
  function profile(k) {
    let d = 0, sl = 0, sk = 0;
    for (const s of FT.data) { sk += Math.pow(s.y, k); if (s.d) { d++; sl += Math.log(s.y); } }
    if (!d) return { ll: -Infinity, lam: NaN };
    const th = sk / d;
    return { ll: d * Math.log(k) + (k - 1) * sl - d * Math.log(th) - d, lam: Math.pow(th, 1 / k) };
  }
  function ftFit() {
    // máxima verosimilitud perfil en u = ln k (búsqueda de sección áurea)
    const f = u => profile(Math.exp(u)).ll; let a = Math.log(0.1), b = Math.log(10); const g = (Math.sqrt(5) - 1) / 2;
    let c = b - g * (b - a), e = a + g * (b - a), fc = f(c), fe = f(e);
    for (let i = 0; i < 80; i++) { if (fc > fe) { b = e; e = c; fe = fc; c = b - g * (b - a); fc = f(c); } else { a = c; c = e; fc = fe; e = a + g * (b - a); fe = f(e); } }
    const u = (a + b) / 2, hh = 1e-3, d2 = (f(u + hh) - 2 * f(u) + f(u - hh)) / (hh * hh), se = d2 < 0 ? 1 / Math.sqrt(-d2) : NaN;
    const p = profile(Math.exp(u));
    FT.wb = { k: Math.exp(u), lam: p.lam, ll: p.ll, lo: Math.exp(u - 1.96 * se), hi: Math.exp(u + 1.96 * se) };
    const e1 = profile(1); FT.ex = { rate: 1 / e1.lam, ll: e1.ll };
    // Kaplan-Meier
    FT.km = []; let n = FT.data.length, S = 1, i = 0;
    while (i < FT.data.length) { const t = FT.data[i].y; let dd = 0, cc = 0; while (i < FT.data.length && FT.data[i].y === t) { FT.data[i].d ? dd++ : cc++; i++; } if (dd) { S *= 1 - dd / n; FT.km.push([t, S]); } n -= dd + cc; }
    FT.last = FT.data.length ? FT.data[FT.data.length - 1].y : 0;
  }
  function ftSync() {
    ftData(); ftFit();
    $('weibull-fit-n-v').textContent = FT.n; $('weibull-fit-end-v').textContent = FT.end;
    const W = FT.wb;
    $('weibull-fit-k').textContent = isFinite(W.k) ? fmt(W.k, 2) : '–';
    $('weibull-fit-k-lbl').textContent = isFinite(W.lo) ? `forma k̂ · IC ${fmt(W.lo, 2)}–${fmt(W.hi, 2)}` : 'forma k̂';
    $('weibull-fit-l').textContent = isFinite(W.lam) ? fmt(W.lam, 1) + ' m' : '–';
    const dAIC = (-2 * FT.ex.ll + 2) - (-2 * W.ll + 4);
    $('weibull-fit-aic').textContent = isFinite(dAIC) ? minus(fmt(dAIC, 1)) : '–';
    const s48w = SW(48, W.k, W.lam), s48e = Math.exp(-FT.ex.rate * 48), s48r = SW(48, FT.k, trueLam(FT.k));
    $('weibull-fit-s48').textContent = fmt(s48w, 2) + ' · ' + fmt(s48e, 2);
    $('weibull-fit-s48-lbl').textContent = `S(48): Weibull · exp. (real ${fmt(s48r, 2)})`;
    const d = FT.data.filter(s => s.d).length;
    $('weibull-fit-head').textContent = `${d} fallas de ${FT.n} · ${Math.round(100 * (1 - d / FT.n))} % censurado`;
    drawFT();
  }
  segBind('weibull-fit-sc', b => { FT.k = +b.dataset.k; ftSync(); });
  $('weibull-fit-n').addEventListener('input', e => { FT.n = +e.target.value; ftSync(); });
  $('weibull-fit-end').addEventListener('input', e => { FT.end = +e.target.value; ftSync(); });
  $('weibull-fit-new').addEventListener('click', () => { FT.seed = (FT.seed * 7919 + 43) % 100003; ftSync(); });
  function drawFT() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    const pad = { l: 36, r: 12, t: 14, b: 30 };
    let f = fit($('weibull-c-wp'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const x0 = Math.log(0.5), x1 = Math.log(TM), y0 = -6, y1 = 2;
      const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r), Y = v => pad.t + (y1 - v) / (y1 - y0) * (h - pad.t - pad.b);
      const tk = [1, 3, 10, 30, 60];
      gridLines(ctx, X, Y, tk.map(Math.log), [-6, -4, -2, 0, 2], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [-4, -2, 0, 2]) ctx.fillText(minus(v), pad.l - 5, Y(v) + 4);
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      // rectas: Weibull ajustada y exponencial (pendiente 1)
      const W = FT.wb;
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x0), Y(W.k * (x0 - Math.log(W.lam)))); ctx.lineTo(X(x1), Y(W.k * (x1 - Math.log(W.lam)))); ctx.stroke();
      ctx.strokeStyle = hot; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(x0), Y(x0 + Math.log(FT.ex.rate))); ctx.lineTo(X(x1), Y(x1 + Math.log(FT.ex.rate))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ink; ctx.globalAlpha = .75;
      for (const [t, s] of FT.km) if (s > 0 && s < 1) { ctx.beginPath(); ctx.arc(X(Math.log(t)), Y(Math.log(-Math.log(s))), 2.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center'; tk.forEach(v => ctx.fillText(v, X(Math.log(v)), h - pad.b + 15));
      ctx.textAlign = 'right'; ctx.fillText('t (meses, log)', w - pad.r, h - 3);
    }
    f = fit($('weibull-c-fs'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const X = v => pad.l + v / TM * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, [0, 12, 24, 36, 48, 60], [0, .25, .5, .75, 1], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 5, Y(v) + 4);
      const end = FT.end, lamT = trueLam(FT.k), W = FT.wb;
      // curva real
      ctx.strokeStyle = muted; ctx.setLineDash([2, 3]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const t = TM * i / 200; i ? ctx.lineTo(X(t), Y(SW(t, FT.k, lamT))) : ctx.moveTo(X(t), Y(SW(t, FT.k, lamT))); }
      ctx.stroke(); ctx.setLineDash([]);
      // ajustes: sólidos hasta el fin del seguimiento, tenues después
      const curve = (S, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2;
        for (const [a, b, al] of [[0, end, 1], [end, TM, .4]]) {
          ctx.globalAlpha = al; ctx.beginPath();
          for (let i = 0; i <= 120; i++) { const t = a + (b - a) * i / 120; i ? ctx.lineTo(X(t), Y(S(t))) : ctx.moveTo(X(t), Y(S(t))); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      };
      curve(t => Math.exp(-FT.ex.rate * t), hot);
      curve(t => SW(t, W.k, W.lam), accent);
      // Kaplan-Meier
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(0), Y(1)); let S = 1;
      for (const [t, s] of FT.km) { ctx.lineTo(X(t), Y(S)); S = s; ctx.lineTo(X(t), Y(S)); }
      ctx.lineTo(X(FT.last), Y(S)); ctx.stroke();
      // fin del seguimiento
      const xe = Math.round(X(end)) + .5; ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, pad.t); ctx.lineTo(xe, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.textAlign = end > TM - 14 ? 'right' : 'left'; ctx.fillText('fin', xe + (end > TM - 14 ? -4 : 4), pad.t + 10);
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TM, 12, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
  }

  M.draw.weibull = () => { drawSH(); drawFT(); };
  M.init.push(() => { shSync(); ftSync(); });
})();
