/* StatEdx · sesión discretas: Distribuciones discretas */
(() => {
  const { fit, tok, fmt, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // ---------- matemáticas ----------
  const LF = [0]; for (let i = 1; i <= 200; i++) LF[i] = LF[i - 1] + Math.log(i);   // log k!
  const lch = (n, k) => k < 0 || k > n ? -Infinity : LF[n] - LF[k] - LF[n - k];
  const URN = 40, SLOTS = 600;
  const pmf = {
    bin: (k, s) => Math.exp(lch(s.n, k) + k * Math.log(s.p) + (s.n - k) * Math.log(1 - s.p)),
    geo: (k, s) => k < 1 ? 0 : Math.pow(1 - s.p, k - 1) * s.p,
    hip: (k, s) => Math.exp(lch(s.K, k) + lch(URN - s.K, s.n - k) - lch(URN, s.n)),
    poi: (k, s) => Math.exp(-s.l + k * Math.log(s.l) - LF[k]),
  };
  const moments = {
    bin: s => [s.n * s.p, s.n * s.p * (1 - s.p)],
    geo: s => [1 / s.p, (1 - s.p) / (s.p * s.p)],
    hip: s => { const q = s.K / URN; return [s.n * q, s.n * q * (1 - q) * (URN - s.n) / (URN - 1)]; },
    poi: s => [s.l, s.l],
  };
  const APX = {
    bin: { name: 'aproximación Poisson(np)', f: (k, s) => pmf.poi(k, { l: s.n * s.p }) },
    hip: { name: 'aproximación Binomial(n, K/N)', f: (k, s) => pmf.bin(k, { n: s.n, p: s.K / URN }) },
    poi: { name: 'aproximación Normal(λ, λ)', f: (k, s) => M.Phi((k + .5 - s.l) / Math.sqrt(s.l)) - M.Phi((k - .5 - s.l) / Math.sqrt(s.l)) },
    geo: null,
  };
  function support(s, d) {
    if (d === 'bin') return [0, s.n];
    if (d === 'hip') return [Math.max(0, s.n - URN + s.K), Math.min(s.n, s.K)];
    if (d === 'geo') return [1, Math.max(10, Math.min(120, Math.ceil(Math.log(0.004) / Math.log(1 - s.p))))];
    return [0, Math.min(200, Math.max(8, Math.ceil(s.l + 4.5 * Math.sqrt(s.l) + 2)))];
  }

  // ---------- estado y controles ----------
  const S = { d: 'bin', n: 10, p: 0.3, K: 12, l: 4.5, sims: [], last: null };
  const el = { n: $('discretas-n'), p: $('discretas-p'), K: $('discretas-k'), l: $('discretas-l') };
  const wrap = { n: $('discretas-n-wrap'), p: $('discretas-p-wrap'), K: $('discretas-k-wrap'), l: $('discretas-l-wrap') };
  const USES = { bin: ['n', 'p'], geo: ['p'], hip: ['n', 'K'], poi: ['l'] };
  function reset() { S.sims = []; S.last = null; draw(); }
  function sync() {
    for (const k of ['n', 'p', 'K', 'l']) wrap[k].hidden = !USES[S.d].includes(k);
    $('discretas-n-v').textContent = S.n;
    $('discretas-n-name').textContent = S.d === 'hip' ? 'EXTRACCIONES' : 'ENSAYOS';
    $('discretas-p-v').textContent = fmt(S.p, 2);
    $('discretas-k-v').textContent = S.K;
    $('discretas-l-v').textContent = fmt(S.l, 1);
    S.sims = []; S.last = null; simulate(500);   // cada cambio de parámetros arranca con 500 simulaciones nuevas
  }
  el.n.addEventListener('input', () => { S.n = +el.n.value; sync(); });
  el.p.addEventListener('input', () => { S.p = +el.p.value / 100; sync(); });
  el.K.addEventListener('input', () => { S.K = +el.K.value; sync(); });
  el.l.addEventListener('input', () => { S.l = +el.l.value; sync(); });
  segBind('discretas-dist', b => { S.d = b.dataset.d; sync(); });

  // ---------- simulación de un experimento ----------
  function experiment() {
    if (S.d === 'bin') { const t = []; for (let i = 0; i < S.n; i++) t.push(Math.random() < S.p); return { x: t.filter(Boolean).length, t }; }
    if (S.d === 'geo') { const t = []; do t.push(Math.random() < S.p); while (!t[t.length - 1] && t.length < 5000); return { x: t.length, t }; }
    if (S.d === 'hip') {
      const balls = Array.from({ length: URN }, (_, i) => i < S.K), order = balls.map((_, i) => i);
      for (let i = URN - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const drawn = new Set(order.slice(0, S.n));
      let x = 0; drawn.forEach(i => { if (balls[i]) x++; });
      return { x, balls, drawn };
    }
    const ev = []; const q = S.l / SLOTS;
    for (let i = 0; i < SLOTS; i++) if (Math.random() < q) ev.push(i);
    return { x: ev.length, ev };
  }
  function simulate(times) { for (let i = 0; i < times; i++) { S.last = experiment(); S.sims.push(S.last.x); } draw(); }
  $('discretas-one').addEventListener('click', () => simulate(1));
  $('discretas-many').addEventListener('click', () => simulate(500));
  $('discretas-reset').addEventListener('click', reset);

  // ---------- dibujo ----------
  function draw() {
    const d = S.d, [mt, vt] = moments[d](S);
    const n = S.sims.length;
    let ms = NaN, vs = NaN;
    if (n) { ms = S.sims.reduce((a, b) => a + b, 0) / n; vs = n > 1 ? S.sims.reduce((a, b) => a + (b - ms) ** 2, 0) / (n - 1) : NaN; }
    const f2 = v => isNaN(v) ? '–' : fmt(v, 2);
    $('discretas-ms').textContent = f2(ms); $('discretas-vs').textContent = f2(vs);
    $('discretas-mt').textContent = f2(mt); $('discretas-vt').textContent = f2(vt);
    $('discretas-nsim').textContent = fmt(n, 0).replace(/\./g, ' ') + (n === 1 ? ' simulación' : ' simulaciones');
    const head = { bin: `X ~ Bin(${S.n}; ${fmt(S.p, 2)})`, geo: `X ~ Geom(${fmt(S.p, 2)})`, hip: `X ~ Hiper(N = ${URN}, K = ${S.K}, n = ${S.n})`, poi: `X ~ Poisson(${fmt(S.l, 1)})` };
    $('discretas-head').textContent = head[d];
    const apx = APX[d];
    $('discretas-apx-leg').hidden = !apx;
    if (apx) $('discretas-apx-name').textContent = apx.name;
    const lastTxt = { bin: 'éxitos', geo: 'ensayos hasta el primer éxito', hip: 'defectuosas en la muestra', poi: 'eventos en la hora' };
    const one = { bin: 'éxito', geo: 'ensayo (éxito al primer intento)', hip: 'defectuosa en la muestra', poi: 'evento en la hora' };
    $('discretas-last').textContent = S.last ? `X = ${S.last.x} ${S.last.x === 1 ? one[d] : lastTxt[d]}` : 'sin simular';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // ---- franja del último experimento ----
    let f = fit($('discretas-c-strip'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      ctx.font = mono(); ctx.textAlign = 'center';
      const L = S.last;
      if (!L) { ctx.fillStyle = muted; ctx.fillText('pulsa “Simular 1” para ver un experimento', w / 2, h / 2 + 4); }
      else if (d === 'bin' || d === 'geo') {
        const t = L.t, show = Math.min(t.length, 80), perRow = Math.min(40, Math.max(10, Math.floor((w - 12) / 16)));
        const rows = Math.ceil(show / perRow), cell = Math.min((w - 12) / perRow, (h - 8) / Math.max(rows, 2));
        const sz = Math.max(4, cell - 3);
        for (let i = 0; i < show; i++) {
          const c = i % perRow, r = Math.floor(i / perRow);
          const x = 6 + c * cell, y = 4 + r * cell;
          ctx.fillStyle = t[i] ? accent : line; ctx.globalAlpha = t[i] ? 1 : .8;
          ctx.fillRect(x, y, sz, sz);
        }
        ctx.globalAlpha = 1;
        if (t.length > show) { ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText(`… y ${t.length - show} ensayos más`, w - 6, h - 6); }
      } else if (d === 'hip') {
        const cols = 20, cell = Math.min((w - 12) / cols, (h - 8) / 2), r = Math.max(3, cell * 0.36);
        for (let i = 0; i < URN; i++) {
          const c = i % cols, rr = Math.floor(i / cols), x = 6 + (c + .5) * cell, y = 4 + (rr + .5) * cell;
          ctx.globalAlpha = L.drawn.has(i) ? 1 : .35;
          ctx.fillStyle = L.balls[i] ? hot : muted;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
          if (L.drawn.has(i)) { ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 2 * Math.PI); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      } else {
        const x0 = 10, x1 = w - 10, y = h / 2;
        ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        for (const m of [0, 15, 30, 45, 60]) { const xx = x0 + (x1 - x0) * m / 60; ctx.beginPath(); ctx.moveTo(xx, y - 4); ctx.lineTo(xx, y + 4); ctx.stroke(); ctx.fillStyle = muted; ctx.fillText(m + ' min', Math.min(Math.max(xx, x0 + 18), x1 - 18), y + 22); }
        ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
        for (const e of L.ev) { const xx = x0 + (x1 - x0) * (e + .5) / SLOTS; ctx.beginPath(); ctx.moveTo(xx, y - 16); ctx.lineTo(xx, y + 2); ctx.stroke(); }
      }
    }

    // ---- frecuencias simuladas vs exacta ----
    f = fit($('discretas-c-pmf'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const [k0, k1] = support(S, d);
      const pad = { l: 40, r: 12, t: 12, b: 26 };
      const ks = []; for (let k = k0; k <= k1; k++) ks.push(k);
      const exact = ks.map(k => pmf[d](k, S));
      const cnt = new Map(); for (const x of S.sims) cnt.set(x, (cnt.get(x) || 0) + 1);
      const freq = ks.map(k => n ? (cnt.get(k) || 0) / n : 0);
      const ap = apx ? ks.map(k => apx.f(k, S)) : [];
      const top = Math.max(...exact, ...freq, ...ap, 0.05) * 1.12;
      const slot = (w - pad.l - pad.r) / ks.length;
      const X = k => pad.l + (k - k0 + .5) * slot, Y = v => h - pad.b - v / top * (h - pad.t - pad.b);
      const ys = top > 0.6 ? 0.2 : top > 0.3 ? 0.1 : top > 0.12 ? 0.05 : 0.02;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = 0; v <= top; v += ys) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // barras simuladas
      ctx.fillStyle = accent; ctx.globalAlpha = .6;
      const bw = Math.max(1, slot * 0.72);
      ks.forEach((k, i) => { if (freq[i]) ctx.fillRect(X(k) - bw / 2, Y(freq[i]), bw, h - pad.b - Y(freq[i])); });
      ctx.globalAlpha = 1;
      // aproximación
      if (apx) {
        ctx.strokeStyle = hot; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.beginPath();
        ks.forEach((k, i) => { const yy = Y(ap[i]); i ? ctx.lineTo(X(k), yy) : ctx.moveTo(X(k), yy); });
        ctx.stroke(); ctx.setLineDash([]);
      }
      // exacta: tallos y puntos
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.2;
      const rad = slot > 10 ? 3.5 : 2.2;
      ks.forEach((k, i) => { if (exact[i] < 1e-5) return; ctx.beginPath(); ctx.arc(X(k), Y(exact[i]), rad, 0, 2 * Math.PI); ctx.fill(); });
      // media teórica
      if (mt >= k0 - .5 && mt <= k1 + .5) {
        const xm = pad.l + (mt - k0 + .5) * slot;
        ctx.strokeStyle = muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xm, pad.t); ctx.lineTo(xm, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = xm > w - 70 ? 'right' : 'left'; ctx.fillText('E[X]', xm + (xm > w - 70 ? -4 : 4), pad.t + 10);
      }
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      const every = Math.max(1, Math.ceil(26 / slot)), nice = [1, 2, 5, 10, 20, 25, 50].find(s => s >= every) || 50;
      for (const k of ks) if (k % nice === 0 || (k === k0 && nice === 1)) ctx.fillText(String(k), X(k), h - 8);
      ctx.textAlign = 'right';
      for (let v = 0; v <= top; v += ys) ctx.fillText(fmt(v, 2), pad.l - 5, Y(v) + 4);
    }
  }

  M.draw.discretas = draw;
  M.init.push(sync);
})();
