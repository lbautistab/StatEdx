/* Muestra · clase 7, inferencia bayesiana */
(() => {
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + M.tok('--f-mono');

  // ---------- matemáticas: log-gamma (Lanczos), densidad Beta, cuantiles por rejilla ----------
  const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1; let s = LZ[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) s += LZ[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
  }
  const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
  const dbeta = (t, a, b) => (t <= 0 || t >= 1) ? 0 : Math.exp((a - 1) * Math.log(t) + (b - 1) * Math.log(1 - t) - lbeta(a, b));
  function qbeta(a, b, ps) {
    const N = 4000, m = new Float64Array(N); let tot = 0;
    for (let i = 0; i < N; i++) { m[i] = dbeta((i + 0.5) / N, a, b); tot += m[i]; }
    const out = []; let cum = 0, j = 0;
    for (let i = 0; i < N && j < ps.length; i++) {
      const q = m[i] / tot, prev = cum; cum += q;
      while (j < ps.length && cum >= ps[j]) { out.push((i + (q ? (ps[j] - prev) / q : 0)) / N); j++; }
    }
    while (out.length < ps.length) out.push(1);
    return out;
  }
  // ---------- muestreador Gamma (Marsaglia-Tsang) y Beta por dos Gammas ----------
  function rgamma(k) {
    if (k < 1) return rgamma(k + 1) * Math.pow(Math.random(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v; do { x = M.randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = Math.random();
      if (u < 1 - 0.0331 * x ** 4) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  const rbeta = (a, b) => { const x = rgamma(a), y = rgamma(b); return x / (x + y); };

  // utilidades de ejes
  function grid(ctx, X, pad, h, from, to, step) {
    ctx.strokeStyle = M.tok('--line'); ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = from; v <= to + 1e-9; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function baseline(ctx, pad, w, h) {
    ctx.strokeStyle = M.tok('--muted'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
  }
  function labels(ctx, X, from, to, step, y, f, lo, hi) {
    ctx.fillStyle = M.tok('--muted'); ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = from; v <= to + 1e-9; v += step) { const x = X(v); ctx.fillText(f(v), Math.min(Math.max(x, lo), hi), y); }
  }
  function niceStep(range, maxTicks) {
    for (const s of [0.001, 0.002, 0.0025, 0.005, 0.01, 0.02, 0.025, 0.05, 0.1, 0.2]) if (range / s <= maxTicks) return s;
    return 0.25;
  }

  // ---------- simulador 1: Beta-Binomial ----------
  const BB = { a: 2, b: 8, n: 20, k: 7 };
  const el = { a: $('bayes-a'), b: $('bayes-b'), n: $('bayes-n'), k: $('bayes-k') };
  function bbSync(fromPreset) {
    if (BB.k > BB.n) BB.k = BB.n;
    el.k.max = BB.n;
    for (const key of ['a', 'b', 'n', 'k']) { el[key].value = BB[key]; $('bayes-' + key + '-v').textContent = key === 'a' || key === 'b' ? M.fmt(BB[key], BB[key] % 1 ? 1 : 0) : BB[key]; }
    if (!fromPreset) document.querySelectorAll('#bayes-pre button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.a === BB.a && +x.dataset.b === BB.b)));
    drawBB();
  }
  el.a.addEventListener('input', () => { BB.a = +el.a.value; bbSync(); });
  el.b.addEventListener('input', () => { BB.b = +el.b.value; bbSync(); });
  el.n.addEventListener('input', () => { const old = BB.n; BB.n = +el.n.value; BB.k = Math.round(BB.k * BB.n / old); bbSync(); });
  el.k.addEventListener('input', () => { BB.k = +el.k.value; bbSync(); });
  M.segBind('bayes-pre', btn => { BB.a = +btn.dataset.a; BB.b = +btn.dataset.b; bbSync(true); });

  function drawBB() {
    const a1 = BB.a + BB.k, b1 = BB.b + BB.n - BB.k;
    const mean = a1 / (a1 + b1);
    const [lo, hi] = qbeta(a1, b1, [0.025, 0.975]);
    $('bayes-bb-mean').textContent = M.fmt(mean, 3);
    $('bayes-bb-mode').textContent = a1 > 1 && b1 > 1 ? M.fmt((a1 - 1) / (a1 + b1 - 2), 3) : (a1 <= 1 && b1 > 1 ? M.fmt(0, 3) : a1 > 1 ? M.fmt(1, 3) : '–');
    $('bayes-bb-ci').textContent = M.fmt(lo, 2) + ' – ' + M.fmt(hi, 2);
    $('bayes-bb-w').textContent = M.pct(BB.n / (BB.a + BB.b + BB.n), 0);
    $('bayes-bb-head').textContent = `Beta(${M.fmt(a1, a1 % 1 ? 1 : 0)}, ${M.fmt(b1, b1 % 1 ? 1 : 0)})`;

    const f = M.fit($('bayes-c-bb')); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 14, t: 16, b: 26 };
    const X = t => pad.l + t * (w - pad.l - pad.r);
    const G = 500, ts = [], pr = [], lk = [], po = [];
    for (let i = 0; i <= G; i++) {
      const t = 0.0005 + 0.999 * i / G; ts.push(t);
      pr.push(dbeta(t, BB.a, BB.b)); lk.push(dbeta(t, BB.k + 1, BB.n - BB.k + 1)); po.push(dbeta(t, a1, b1));
    }
    const mPo = Math.max(...po), mLk = Math.max(...lk), mPr = Math.max(...pr);
    const top = Math.max(mPo, mLk, Math.min(mPr, 1.2 * Math.max(mPo, mLk))) * 1.08;
    const Y = d => h - pad.b - Math.min(d, top) / top * (h - pad.t - pad.b);
    const tstep = w < 420 ? 0.25 : 0.1;
    grid(ctx, X, pad, h, 0, 1, tstep);
    // intervalo de credibilidad sombreado
    ctx.fillStyle = accent; ctx.globalAlpha = .26; ctx.beginPath(); ctx.moveTo(X(lo), Y(0));
    for (let i = 0; i <= 160; i++) { const t = lo + (hi - lo) * i / 160; ctx.lineTo(X(t), Y(dbeta(t, a1, b1))); }
    ctx.lineTo(X(hi), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    const curve = (arr, color, lw, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath();
      arr.forEach((d, i) => { const x = X(ts[i]), y = Y(d); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(pr, muted, 2, [5, 4]);
    curve(lk, hot, 2);
    curve(po, accent, 2.6);
    // media posterior
    const xm = Math.round(X(mean)) + .5;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xm, Y(dbeta(mean, a1, b1))); ctx.lineTo(xm, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    // etiqueta 95 %
    ctx.fillStyle = ink; ctx.font = '600 12px ' + M.tok('--f-mono');
    if (X(mean) - X(lo) > 56) { ctx.textAlign = 'right'; ctx.fillText('95 %', X(mean) - 6, h - pad.b - 9); }
    else if (X(hi) - X(mean) > 56) { ctx.textAlign = 'left'; ctx.fillText('95 %', X(mean) + 6, h - pad.b - 9); }
    baseline(ctx, pad, w, h);
    labels(ctx, X, 0, 1, tstep, h - 8, v => M.fmt(v, w < 420 ? 2 : 1), pad.l + 8, w - pad.r - 8);
  }

  // ---------- simulador 2: A/B con Monte Carlo ----------
  const AB = { ra: 12, rb: 14.5, n: 1000, S: 20000, dif: null };
  function abSample() {
    const kA = Math.round(AB.ra / 100 * AB.n), kB = Math.round(AB.rb / 100 * AB.n);
    AB.kA = kA; AB.kB = kB;
    AB.pA = [1 + kA, 1 + AB.n - kA]; AB.pB = [1 + kB, 1 + AB.n - kB];
    const d = new Float64Array(AB.S); let win = 0, loss = 0, sum = 0;
    for (let i = 0; i < AB.S; i++) {
      const tA = rbeta(AB.pA[0], AB.pA[1]), tB = rbeta(AB.pB[0], AB.pB[1]);
      const x = tB - tA; d[i] = x; sum += x;
      if (x > 0) win++; else loss -= x;
    }
    AB.p = win / AB.S; AB.mean = sum / AB.S; AB.loss = loss / AB.S;
    AB.dif = d.slice().sort();
    drawAB();
  }
  const dec = step => Math.abs(step * 100 - Math.round(step * 100)) < 1e-9 ? 0 : 1;
  const th = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  const pp = (x, dec) => (x > 0 ? '+' : x < 0 ? '−' : '') + M.fmt(Math.abs(x) * 100, dec);
  function drawAB() {
    if (!AB.dif) return;
    const S = AB.S, q = p => AB.dif[Math.min(S - 1, Math.floor(p * S))];
    const lo95 = q(0.025), hi95 = q(0.975);
    $('bayes-ab-p').textContent = AB.p > 0.999 ? '> 99,9 %' : AB.p < 0.001 ? '< 0,1 %' : M.pct(AB.p, 1);
    $('bayes-ab-d').textContent = pp(AB.mean, 1) + ' pp';
    $('bayes-ab-ci').textContent = pp(lo95, 1) + ' a ' + pp(hi95, 1);
    $('bayes-ab-loss').textContent = M.fmt(AB.loss * 100, AB.loss * 100 < 0.1 ? 3 : 2) + ' pp';
    $('bayes-ab-head').textContent = `A ${th(AB.kA)} · B ${th(AB.kB)} de ${th(AB.n)}`;
    $('bayes-ab-lbl').textContent = '┄ A   — B';
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted');

    // posteriores
    let f = M.fit($('bayes-c-ab'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 14, r: 14, t: 14, b: 26 };
      const mom = ([a, b]) => ({ m: a / (a + b), s: Math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1))) });
      const A = mom(AB.pA), B = mom(AB.pB);
      const xlo = Math.max(0, Math.min(A.m - 4.2 * A.s, B.m - 4.2 * B.s)), xhi = Math.min(1, Math.max(A.m + 4.2 * A.s, B.m + 4.2 * B.s));
      const X = t => pad.l + (t - xlo) / (xhi - xlo) * (w - pad.l - pad.r);
      const peak = Math.max(dbeta(Math.min(Math.max(A.m, 1e-6), 1 - 1e-6), ...AB.pA), dbeta(Math.min(Math.max(B.m, 1e-6), 1 - 1e-6), ...AB.pB)) * 1.12;
      const Y = d => h - pad.b - d / peak * (h - pad.t - pad.b);
      const step = niceStep(xhi - xlo, w < 420 ? 5 : 7), first = Math.ceil(xlo / step - 1e-9) * step;
      grid(ctx, X, pad, h, first, xhi, step);
      const dens = (par, color, fill, dash) => {
        ctx.beginPath();
        for (let i = 0; i <= 240; i++) { const t = xlo + (xhi - xlo) * i / 240, x = X(t), y = Y(dbeta(t, par[0], par[1])); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        if (fill) { ctx.lineTo(X(xhi), Y(0)); ctx.lineTo(X(xlo), Y(0)); ctx.closePath(); ctx.fillStyle = color; ctx.globalAlpha = .16; ctx.fill(); ctx.globalAlpha = 1; return; }
        ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
      };
      dens(AB.pB, accent, true);
      dens(AB.pA, ink, false, [5, 4]);
      dens(AB.pB, accent, false);
      ctx.fillStyle = ink; ctx.font = '600 12px ' + M.tok('--f-mono'); ctx.textAlign = 'center';
      ctx.fillText('A', X(A.m), Math.max(Y(dbeta(A.m, ...AB.pA)) - 6, pad.t + 10));
      ctx.fillStyle = accent; ctx.fillText('B', X(B.m), Math.max(Y(dbeta(B.m, ...AB.pB)) - 6, pad.t + 10));
      baseline(ctx, pad, w, h);
      labels(ctx, X, first, xhi, step, h - 8, v => M.fmt(v * 100, dec(step)) + '\u2009%', pad.l + 14, w - pad.r - 14);
    }

    // histograma de la diferencia
    f = M.fit($('bayes-c-diff'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 14, r: 14, t: 14, b: 26 };
      let dlo = q(0.001), dhi = q(0.999);
      const span = dhi - dlo; dlo -= span * 0.06; dhi += span * 0.06;
      const B = 48, bw = (dhi - dlo) / B, counts = new Array(B).fill(0);
      for (let i = 0; i < S; i++) { const j = Math.floor((AB.dif[i] - dlo) / bw); if (j >= 0 && j < B) counts[j]++; }
      const peak = Math.max(...counts) * 1.1;
      const X = v => pad.l + (v - dlo) / (dhi - dlo) * (w - pad.l - pad.r);
      const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
      const step = niceStep(dhi - dlo, w < 420 ? 5 : 7), first = Math.ceil(dlo / step - 1e-9) * step;
      grid(ctx, X, pad, h, first, dhi, step);
      const px = (w - pad.l - pad.r) / B;
      counts.forEach((c, j) => {
        if (!c) return; const mid = dlo + (j + 0.5) * bw, pos = mid > 0;
        ctx.fillStyle = pos ? accent : hot; ctx.globalAlpha = pos ? .8 : .9;
        ctx.fillRect(pad.l + j * px + .5, Y(c), Math.max(px - 1, 1), h - pad.b - Y(c));
      });
      ctx.globalAlpha = 1;
      if (dlo < 0 && dhi > 0) {
        const x0 = Math.round(X(0)) + .5;
        ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, pad.t - 4); ctx.lineTo(x0, h - pad.b); ctx.stroke();
      }
      // texto P(B > A)
      ctx.fillStyle = ink; ctx.font = '600 12px ' + M.tok('--f-mono'); ctx.textAlign = 'right';
      ctx.fillText('P(B > A) ' + ($('bayes-ab-p').textContent.match(/^[<>]/) ? '' : '= ') + $('bayes-ab-p').textContent, w - pad.r - 4, pad.t + 12);
      baseline(ctx, pad, w, h);
      labels(ctx, X, first, dhi, step, h - 8, v => (Math.abs(v) < 1e-12 ? '0' : pp(v, dec(step))), pad.l + 12, w - pad.r - 12);
    }
  }
  const ra = $('bayes-ra'), rb = $('bayes-rb');
  const abLabels = () => {
    $('bayes-ra-v').textContent = M.fmt(AB.ra, 1) + ' %';
    $('bayes-rb-v').textContent = M.fmt(AB.rb, 1) + ' %';
  };
  ra.addEventListener('input', () => { AB.ra = +ra.value; abLabels(); abSample(); });
  rb.addEventListener('input', () => { AB.rb = +rb.value; abLabels(); abSample(); });
  M.segBind('bayes-abn', btn => { AB.n = +btn.dataset.n; abSample(); });
  $('bayes-ab-again').addEventListener('click', abSample);

  M.draw['bayes'] = () => { drawBB(); drawAB(); };
  M.init.push(() => { bbSync(); abLabels(); abSample(); });
})();
