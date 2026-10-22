/* StatEdx · sesión cox: Regresión de riesgos proporcionales de Cox */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + tok('--f-mono');
  const minus = s => String(s).replace('-', '−');
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gridLines(ctx, X, Y, xs, ys, l, r, t, b) {
    ctx.strokeStyle = tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (const v of xs) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, b); ctx.stroke(); }
    for (const v of ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // datos ordenados por tiempo: [{y, d, x}] con x binaria
  // Cox de una covariable (empates de Breslow): log-verosimilitud parcial, score e información
  function coxStats(data, b) {
    let i = 0, ll = 0, U = 0, I = 0;
    // sumas sobre el conjunto en riesgo, recorriendo de atrás hacia adelante
    const n = data.length, s0 = new Array(n), s1 = new Array(n);
    let a0 = 0, a1 = 0;
    for (let k = n - 1; k >= 0; k--) { const e = Math.exp(b * data[k].x); a0 += e; a1 += data[k].x * e; s0[k] = a0; s1[k] = a1; }
    const res = [];
    while (i < n) {
      const t = data[i].y, first = i; let d = 0, sx = 0;
      while (i < n && data[i].y === t) { if (data[i].d) { d++; sx += data[i].x; } i++; }
      if (d) {
        const m = s1[first] / s0[first];       // x binaria: x² = x, así que la varianza es m(1 − m)
        ll += b * sx - d * Math.log(s0[first]); U += sx - d * m; I += d * m * (1 - m);
        for (let k = first; k < i; k++) if (data[k].d) res.push({ t, r: data[k].x - m });
      }
    }
    return { ll, U, I, res };
  }
  function coxFit(data) {
    let b = 0;
    for (let k = 0; k < 50; k++) { const s = coxStats(data, b); if (s.I <= 0) break; const st = Math.max(-2, Math.min(2, s.U / s.I)); b += st; if (Math.abs(st) < 1e-9) break; }
    return b;
  }
  function kmCurve(data, g) {
    const sub = data.filter(s => s.x === g); let n = sub.length, S = 1, i = 0; const pts = [];
    while (i < sub.length) {
      const t = sub[i].y; let d = 0, c = 0;
      while (i < sub.length && sub[i].y === t) { sub[i].d ? d++ : c++; i++; }
      if (d) { S *= 1 - d / n; pts.push([t, S]); }
      n -= d + c;
    }
    return { pts, end: sub.length ? sub[sub.length - 1].y : 0 };
  }
  function stepPath(ctx, X, Y, pts, end) {
    ctx.beginPath(); ctx.moveTo(X(0), Y(1)); let S = 1;
    for (const [t, s] of pts) { ctx.lineTo(X(t), Y(S)); S = s; ctx.lineTo(X(t), Y(S)); }
    ctx.lineTo(X(end), Y(S)); ctx.stroke();
  }

  // ================= simulador A: verosimilitud parcial =================
  const PL = { b: 0, seed: 32478, data: [], bhat: 0, llmax: 0, ll0: 0, anim: 0, TM: 24 };
  function plData() {
    const r = rng(PL.seed); PL.data = [];
    for (let i = 0; i < 24; i++) {
      const x = i % 2, lam = 0.08 * Math.exp(-0.8 * x);
      const T = -Math.log(1 - r()) / lam, C = 6 + 18 * r();
      PL.data.push({ y: Math.round(Math.min(T, C) * 10) / 10 + 0.1, d: T <= C ? 1 : 0, x });
    }
    PL.data.sort((a, b) => a.y - b.y || b.d - a.d);
    PL.bhat = coxFit(PL.data); PL.llmax = coxStats(PL.data, PL.bhat).ll; PL.ll0 = coxStats(PL.data, 0).ll;
    PL.TM = Math.ceil(PL.data[PL.data.length - 1].y / 6) * 6;
  }
  function plSync() {
    const el = $('cox-pl-b'); el.value = PL.b;
    $('cox-pl-b-v').textContent = minus(fmt(PL.b, 2));
    const s = coxStats(PL.data, PL.b);
    $('cox-pl-hr').textContent = fmt(Math.exp(PL.b), 2);
    $('cox-pl-ll').textContent = minus(fmt(s.ll, 3));
    $('cox-pl-lr').textContent = minus(fmt(2 * (s.ll - PL.ll0), 2));
    $('cox-pl-u').textContent = minus(fmt(s.U, 3));
    const D = PL.data.filter(d => d.d).length;
    $('cox-pl-head').textContent = `n = 24 · ${D} eventos · β̂ = ${minus(fmt(PL.bhat, 2))}`;
    drawPL();
  }
  $('cox-pl-b').addEventListener('input', e => { PL.anim++; PL.b = +e.target.value; plSync(); });
  $('cox-pl-new').addEventListener('click', () => { PL.anim++; PL.seed = (PL.seed * 7919 + 37) % 100003; plData(); plSync(); });
  $('cox-pl-fit').addEventListener('click', () => {
    const id = ++PL.anim, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; let k = 0;
    const step = () => {
      if (id !== PL.anim) return;
      const s = coxStats(PL.data, PL.b); const st = Math.max(-1.5, Math.min(1.5, s.U / s.I));
      PL.b = Math.max(-3, Math.min(1.5, PL.b + st)); k++; plSync();
      if (Math.abs(st) > 1e-6 && k < 20) reduce ? step() : setTimeout(step, 300);
    };
    step();
  });
  function lrCI() {
    const lim = PL.llmax - 1.92, f = b => coxStats(PL.data, b).ll - lim;
    const root = (a, c) => { if (f(a) * f(c) > 0) return NaN; for (let k = 0; k < 40; k++) { const m = (a + c) / 2; f(a) * f(m) <= 0 ? c = m : a = m; } return (a + c) / 2; };
    return [root(-3, PL.bhat), root(PL.bhat, 1.5)];
  }
  function drawPL() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    let f = fit($('cox-c-pl'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 46, r: 12, t: 14, b: 30 }, lo = -3, hi = 1.5;
      const curve = []; let mn = Infinity;
      for (let i = 0; i <= 120; i++) { const b = lo + (hi - lo) * i / 120, v = coxStats(PL.data, b).ll; curve.push([b, v]); mn = Math.min(mn, v); }
      const top = PL.llmax + 0.6, bot = Math.max(mn, PL.llmax - 12);
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r), Y = v => pad.t + (top - Math.max(v, bot)) / (top - bot) * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, [-3, -2, -1, 0, 1], [], pad.l, w - pad.r, pad.t, h - pad.b);
      const [cl, cu] = lrCI();
      if (isFinite(cl) && isFinite(cu)) { ctx.fillStyle = accent; ctx.globalAlpha = .14; ctx.fillRect(X(cl), pad.t, X(cu) - X(cl), h - pad.t - pad.b); ctx.globalAlpha = 1; }
      ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      const yl = Math.round(Y(PL.llmax - 1.92)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yl); ctx.lineTo(w - pad.r, yl); ctx.stroke();
      const x0 = Math.round(X(0)) + .5; ctx.beginPath(); ctx.moveTo(x0, pad.t); ctx.lineTo(x0, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      curve.forEach(([b, v], i) => i ? ctx.lineTo(X(b), Y(v)) : ctx.moveTo(X(b), Y(v))); ctx.stroke();
      // tangente (score) en el punto actual
      const s = coxStats(PL.data, PL.b), px = X(PL.b), py = Y(s.ll);
      ctx.strokeStyle = hot; ctx.globalAlpha = .7; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(X(PL.b - .5), Y(s.ll - .5 * s.U)); ctx.lineTo(X(PL.b + .5), Y(s.ll + .5 * s.U)); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(X(PL.bhat), Y(PL.llmax), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [PL.llmax, PL.llmax - 6]) if (v >= bot) ctx.fillText(minus(fmt(v, 1)), pad.l - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('máx − 1,92', pad.l + 4, yl - 4);
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.textAlign = 'center'; for (let v = -3; v <= 1; v++) ctx.fillText(minus(v), X(v), h - pad.b + 15);
      ctx.textAlign = 'right'; ctx.fillText('β', w - pad.r, h - 3);
    }
    f = fit($('cox-c-pls'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 14, b: 30 }, TM = PL.TM;
      const X = v => pad.l + v / TM * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      const xt = []; for (let v = 0; v <= TM; v += 6) xt.push(v);
      gridLines(ctx, X, Y, xt, [0, .25, .5, .75, 1], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 5, Y(v) + 4);
      // Kaplan-Meier por grupo (tenue)
      ctx.lineWidth = 1.5; ctx.globalAlpha = .5;
      for (const [g, col] of [[0, accent], [1, hot]]) { const k = kmCurve(PL.data, g); ctx.strokeStyle = col; stepPath(ctx, X, Y, k.pts, k.end); }
      ctx.globalAlpha = 1;
      // Breslow con el β actual: S(t|x) = exp(−H0(t) e^{βx})
      const b = PL.b, n = PL.data.length; let i = 0, H0 = 0; const pts0 = [], pts1 = [];
      const s0 = []; let acc = 0; for (let k = n - 1; k >= 0; k--) { acc += Math.exp(b * PL.data[k].x); s0[k] = acc; }
      while (i < n) { const t = PL.data[i].y, first = i; let d = 0; while (i < n && PL.data[i].y === t) { d += PL.data[i].d; i++; } if (d) { H0 += d / s0[first]; pts0.push([t, Math.exp(-H0)]); pts1.push([t, Math.exp(-H0 * Math.exp(b))]); } }
      const end = PL.data[n - 1].y;
      ctx.lineWidth = 2.4; ctx.strokeStyle = accent; stepPath(ctx, X, Y, pts0, end); ctx.strokeStyle = hot; stepPath(ctx, X, Y, pts1, end);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TM, 6, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
  }

  // ================= simulador B: diagnóstico de riesgos proporcionales =================
  const PH = { sc: 'ph', hr: 0.4, seed: 63393, data: [], fitb: 0 };
  function phData() {
    const r = rng(PH.seed), L = 0.07, c = 8; PH.data = [];
    for (let i = 0; i < 400; i++) {
      const x = i % 2, E = -Math.log(1 - r());
      let a = L, b = L;
      if (x) { if (PH.sc === 'ph') a = b = L * PH.hr; else if (PH.sc === 'fade') a = L * PH.hr; else b = L * PH.hr; }
      const T = E < a * c ? E / a : c + (E - a * c) / b, C = 12 + 24 * r();
      PH.data.push({ y: Math.min(T, C), d: T <= C ? 1 : 0, x });
    }
    PH.data.sort((u, v) => u.y - v.y || v.d - u.d);
  }
  function phSync() {
    phData();
    $('cox-ph-hr-v').textContent = fmt(PH.hr, 2);
    const b = coxFit(PH.data), s = coxStats(PH.data, b), se = 1 / Math.sqrt(s.I);
    PH.fitb = b; PH.se = se;
    $('cox-ph-hrhat').textContent = fmt(Math.exp(b), 2);
    $('cox-ph-ci').textContent = fmt(Math.exp(b - 1.96 * se), 2) + '–' + fmt(Math.exp(b + 1.96 * se), 2);
    // Grambsch-Therneau con g = rango del tiempo
    const res = s.res, D = res.length, g = res.map((_, k) => k + 1), gm = (D + 1) / 2;
    let num = 0, den = 0; res.forEach((q, k) => { num += (g[k] - gm) * q.r; den += (g[k] - gm) ** 2; });
    const T = num * num / ((s.I / D) * den), p = 2 * (1 - Phi(Math.sqrt(T)));
    $('cox-ph-gt').textContent = fmt(T, 2);
    $('cox-ph-p').textContent = p < 0.001 ? '< 0,001' : fmt(p, 3);
    PH.sch = res.map(q => ({ t: q.t, s: b + D * se * se * q.r }));
    const nm = { ph: 'HR constante', fade: 'HR real ' + fmt(PH.hr, 2) + ' hasta el mes 8, luego 1', late: 'HR real 1 hasta el mes 8, luego ' + fmt(PH.hr, 2) }[PH.sc];
    $('cox-ph-head').textContent = nm;
    drawPH();
  }
  segBind('cox-ph-sc', bt => { PH.sc = bt.dataset.s; phSync(); });
  $('cox-ph-hr').addEventListener('input', e => { PH.hr = +e.target.value; phSync(); });
  $('cox-ph-new').addEventListener('click', () => { PH.seed = (PH.seed * 7919 + 41) % 100003; phSync(); });
  function drawPH() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted');
    let f = fit($('cox-c-ll'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 14, b: 30 };
      const lx0 = Math.log(0.5), lx1 = Math.log(36), ly0 = -5, ly1 = 1;
      const X = v => pad.l + (v - lx0) / (lx1 - lx0) * (w - pad.l - pad.r), Y = v => pad.t + (ly1 - v) / (ly1 - ly0) * (h - pad.t - pad.b);
      const ticks = [1, 2, 6, 12, 24].map(Math.log);
      gridLines(ctx, X, Y, ticks, [-4, -3, -2, -1, 0, 1], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [-4, -2, 0]) ctx.fillText(minus(v), pad.l - 5, Y(v) + 4);
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      for (const [g, col] of [[0, accent], [1, hot]]) {
        const k = kmCurve(PH.data, g); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); let started = false, prev = null;
        for (const [t, s] of k.pts) {
          if (s <= 0 || s >= 1) continue; const lt = Math.log(t), ls = Math.log(-Math.log(s));
          if (!started) { ctx.moveTo(X(lt), Y(ls)); started = true; } else { ctx.lineTo(X(lt), Y(prev)); ctx.lineTo(X(lt), Y(ls)); }
          prev = ls;
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.textAlign = 'center'; [1, 2, 6, 12, 24].forEach(v => ctx.fillText(v, X(Math.log(v)), h - pad.b + 15));
      ctx.textAlign = 'right'; ctx.fillText('t (meses, log)', w - pad.r, h - 3);
    }
    f = fit($('cox-c-sch'));
    if (f && PH.sch) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 14, b: 30 }, D = PH.sch.length, lo = -4, hi = 3;
      const X = v => pad.l + v / D * (w - pad.l - pad.r), Y = v => pad.t + (hi - Math.max(lo, Math.min(hi, v))) / (hi - lo) * (h - pad.t - pad.b);
      gridLines(ctx, X, Y, [], [-3, -2, -1, 0, 1, 2], pad.l, w - pad.r, pad.t, h - pad.b);
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [-3, -1, 0, 1, 2]) ctx.fillText(minus(v), pad.l - 5, Y(v) + 4);
      ctx.globalAlpha = .45;
      PH.sch.forEach((q, k) => { ctx.fillStyle = q.s > PH.fitb ? hot : accent; ctx.beginPath(); ctx.arc(X(k + .5), Y(q.s), 2.2, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      // β̂ y β = 0
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.strokeStyle = ink; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(PH.fitb)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(PH.fitb)) + .5); ctx.stroke(); ctx.setLineDash([]);
      // suavizado: media móvil con ventana del 20 % de los eventos
      const win = Math.max(5, Math.round(D * 0.12)); ctx.strokeStyle = ink; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let k = 0; k < D; k++) { let s = 0, c = 0; for (let j = Math.max(0, k - win); j <= Math.min(D - 1, k + win); j++) { s += PH.sch[j].s; c++; } const y = Y(s / c); k ? ctx.lineTo(X(k + .5), y) : ctx.moveTo(X(k + .5), y); }
      ctx.stroke();
      // marcas de tiempo real sobre el eje (rango → meses)
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const m of [3, 6, 12, 24]) { const k = PH.sch.findIndex(q => q.t >= m); if (k > 0) ctx.fillText(m, X(k), h - pad.b + 15); }
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText('rango del tiempo (meses)', w - pad.r, h - 3);
    }
  }

  M.draw.cox = () => { drawPL(); drawPH(); };
  M.init.push(() => { plData(); plSync(); phSync(); });
})();
