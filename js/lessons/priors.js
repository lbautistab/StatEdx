/* StatEdx · sesión priors: Priors conjugados y elección del prior */
(() => {
  const { fit, tok, fmt, pct, randn, Phi, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1; let s = LZ[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) s += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
  }
  const dgamma = (x, a, b) => x <= 0 ? 0 : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a));
  // cuantiles y cola por integración numérica en una rejilla fina
  function gammaSummary(a, b, ps, thr) {
    const sd = Math.sqrt(a) / b, hi = a / b + 12 * sd + 1, N = 6000, dx = hi / N;
    const m = new Float64Array(N); let tot = 0;
    for (let i = 0; i < N; i++) { m[i] = dgamma((i + 0.5) * dx, a, b); tot += m[i]; }
    const out = []; let cum = 0, j = 0, tail = 0;
    for (let i = 0; i < N; i++) {
      const q = m[i] / tot, prev = cum; cum += q;
      if ((i + 0.5) * dx > thr) tail += q;
      while (j < ps.length && cum >= ps[j]) { out.push((i + (q ? (ps[j] - prev) / q : 0)) * dx); j++; }
    }
    while (out.length < ps.length) out.push(hi);
    return { q: out, tail };
  }
  const nf = v => fmt(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1);

  // ---------- simulador 1: Gamma-Poisson ----------
  const G = { m0: 4, b0: 2, n: 5, r: 6.2 };
  const el = { m0: $('priors-m0'), b0: $('priors-b0'), n: $('priors-n'), r: $('priors-r') };
  function gpSync(fromPreset) {
    for (const k of ['m0', 'b0', 'n', 'r']) { el[k].value = G[k]; $('priors-' + k + '-v').textContent = nf(G[k]); }
    if (!fromPreset) document.querySelectorAll('#priors-pre button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.m === G.m0 && +x.dataset.b === G.b0)));
    drawGP();
  }
  for (const k of ['m0', 'b0', 'n', 'r']) el[k].addEventListener('input', () => { G[k] = +el[k].value; gpSync(); });
  segBind('priors-pre', b => { G.m0 = +b.dataset.m; G.b0 = +b.dataset.b; gpSync(true); });

  function drawGP() {
    const S = Math.round(G.r * G.n), a0 = G.m0 * G.b0, b0 = G.b0, a1 = a0 + S, b1 = b0 + G.n;
    const sm = gammaSummary(a1, b1, [0.025, 0.975], 5);
    const [lo, hi] = sm.q;
    $('priors-gp-mean').textContent = fmt(a1 / b1, 2);
    $('priors-gp-ci').textContent = fmt(lo, 2) + ' – ' + fmt(hi, 2);
    $('priors-gp-w').textContent = pct(G.n / b1, 0);
    $('priors-gp-p').textContent = sm.tail > 0.999 ? '> 99,9 %' : sm.tail < 0.001 ? '< 0,1 %' : pct(sm.tail, 1);
    $('priors-gp-head').textContent = `Gamma(${nf(a0)}; ${nf(b0)}) → Gamma(${nf(a1)}; ${nf(b1)}) · S = ${S}`;

    const f = fit($('priors-c-gp')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 14, t: 16, b: 26 }, X0 = 0, X1 = 15;
    const X = v => pad.l + (v - X0) / (X1 - X0) * (w - pad.l - pad.r);
    const N = 500, xs = [], pr = [], lk = [], po = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + 0.0001 + (X1 - X0) * i / N; xs.push(x);
      pr.push(dgamma(x, a0, b0)); lk.push(dgamma(x, S + 1, G.n)); po.push(dgamma(x, a1, b1));
    }
    const mPo = Math.max(...po), mLk = Math.max(...lk), mPr = Math.max(...pr.slice(3));
    const top = Math.max(mPo, mLk, Math.min(mPr, 1.2 * Math.max(mPo, mLk))) * 1.08;
    const Y = d => h - pad.b - Math.min(d, top) / top * (h - pad.t - pad.b);
    const step = w < 420 ? 3 : 1;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = 0; v <= X1; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // IC 95 % sombreado
    ctx.fillStyle = accent; ctx.globalAlpha = .26; ctx.beginPath(); ctx.moveTo(X(lo), Y(0));
    for (let i = 0; i <= 160; i++) { const t = lo + (Math.min(hi, X1) - lo) * i / 160; ctx.lineTo(X(t), Y(dgamma(t, a1, b1))); }
    ctx.lineTo(X(Math.min(hi, X1)), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    const curve = (arr, color, lw, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      arr.forEach((d, i) => { const x = X(xs[i]), y = Y(d); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(pr, muted, 2, [5, 4]);
    curve(lk, hot, 2);
    curve(po, accent, 2.6);
    // umbral
    const xt = Math.round(X(5)) + .5;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xt, pad.t); ctx.lineTo(xt, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ink; ctx.font = '600 11px ' + tok('--f-mono'); ctx.textAlign = 'left'; ctx.fillText('λ = 5', xt + 5, pad.t + 10);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = 0; v <= X1; v += step) ctx.fillText(v, Math.min(Math.max(X(v), pad.l + 6), w - pad.r - 8), h - 8);
    ctx.textAlign = 'right'; ctx.fillText('llamadas/hora', w - pad.r, pad.t + 10);
  }

  // ---------- simulador 2: predictiva previa logística ----------
  const P = { s: 10, curves: [], ps: [], z: [] };
  const logistic = t => 1 / (1 + Math.exp(-t));
  function ppDraw() {
    P.z = [];
    for (let i = 0; i < 2000; i++) P.z.push([randn(), randn(), randn()]); // β0/σ, β1/σ, x
    drawPP();
  }
  function ppSync(fromPreset) {
    $('priors-s').value = P.s; $('priors-s-v').textContent = fmt(P.s, 1);
    if (!fromPreset) document.querySelectorAll('#priors-spre button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.s === P.s)));
    drawPP();
  }
  $('priors-s').addEventListener('input', () => { P.s = +$('priors-s').value; ppSync(); });
  segBind('priors-spre', b => { P.s = +b.dataset.s; ppSync(true); });
  $('priors-pp-new').addEventListener('click', ppDraw);

  function drawPP() {
    if (!P.z.length) return;
    const s = P.s, L = Math.log(99);
    const ps = P.z.map(([a, b, x]) => logistic(s * a + s * b * x));
    const ext = ps.filter(p => p < 0.01 || p > 0.99).length / ps.length;
    $('priors-pp-ext').textContent = pct(2 * (1 - Phi(L / s)), 1);
    $('priors-pp-sim').textContent = pct(ext, 1);
    const or = Math.exp(0.6745 * s);
    $('priors-pp-or').textContent = or > 1e4 ? '> 10 000' : fmt(or, or >= 100 ? 0 : 1);
    $('priors-pp-ci').textContent = fmt(logistic(-1.645 * s), 2) + ' – ' + fmt(logistic(1.645 * s), 2);
    $('priors-pp-head').textContent = `β₀, β₁ ~ N(0; ${fmt(s, 1)}²)`;

    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    // curvas
    let f = fit($('priors-c-curves'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 10, t: 10, b: 24 };
      const X = v => pad.l + (v + 3) / 6 * (w - pad.l - pad.r);
      const Y = p => h - pad.b - p * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (const p of [0, 0.25, 0.5, 0.75, 1]) { const y = Math.round(Y(p)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let v = -3; v <= 3; v++) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 1.4; ctx.globalAlpha = .55;
      for (let c = 0; c < 40; c++) {
        const [a, b] = P.z[c]; ctx.beginPath();
        for (let i = 0; i <= 120; i++) { const x = -3 + 6 * i / 120, y = Y(logistic(s * a + s * b * x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = -3; v <= 3; v++) ctx.fillText(v, X(v), h - 8);
      ctx.textAlign = 'right';
      for (const p of [0, 0.5, 1]) ctx.fillText(fmt(p, 1), pad.l - 6, Y(p) + 4);
    }
    // histograma de p
    f = fit($('priors-c-hist'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 10, t: 10, b: 24 }, B = 20, cnt = new Array(B).fill(0);
      ps.forEach(p => cnt[Math.min(B - 1, Math.floor(p * B))]++);
      const dens = cnt.map(c => c / ps.length * B), top = Math.max(1.2, ...dens) * 1.08;
      const X = p => pad.l + p * (w - pad.l - pad.r);
      const Y = d => h - pad.b - d / top * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      const st = top > 6 ? 2 : top > 3 ? 1 : 0.5;
      for (let d = 0; d <= top; d += st) { const y = Math.round(Y(d)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const bw = (w - pad.l - pad.r) / B;
      dens.forEach((d, i) => {
        ctx.fillStyle = (i === 0 || i === B - 1) ? hot : accent; ctx.globalAlpha = .6;
        ctx.fillRect(X(i / B) + 1, Y(d), bw - 2, h - pad.b - Y(d));
      });
      ctx.globalAlpha = 1;
      // referencia: uniforme
      ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (const p of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(fmt(p, 2), Math.min(Math.max(X(p), pad.l + 10), w - pad.r - 12), h - 8);
      ctx.textAlign = 'right';
      for (let d = 0; d <= top; d += st) ctx.fillText(fmt(d, st < 1 ? 1 : 0), pad.l - 6, Y(d) + 4);
      ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.fillText('┄ uniforme', X(0.36), Y(1) - 6);
    }
  }

  M.draw.priors = () => { drawGP(); drawPP(); };
  M.init.push(() => { gpSync(); ppDraw(); });
})();
