/* StatEdx · sesión rnn: Redes recurrentes y LSTM */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = (px = 11) => px + 'px ' + tok('--f-mono');
  const sgm = z => 1 / (1 + Math.exp(-z));
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);
  const sci = x => {
    if (!isFinite(x) || x > 1e12) return '> 10¹²';
    if (x < 1e-12) return '< 10⁻¹²';
    if (x >= 0.01 && x < 1000) return fmt(x, x < 1 ? 3 : 1);
    const e = Math.floor(Math.log10(x)), m = x / 10 ** e;
    const sup = String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return fmt(m, 1) + '·10' + sup;
  };

  const MAXT = 120;
  const R = { w: 0.9, act: 'tanh', bf: 3, T: 50, noise: [] };
  function newNoise() { R.noise = Array.from({ length: MAXT + 1 }, () => 0.1 * randn()); }

  function simulate() {
    const T = R.T, x = Array.from({ length: T + 1 }, (_, t) => t === 0 ? 1 : R.noise[t]);
    // RNN simple: h_t = act(w h_{t-1} + x_t)
    const h = [], dh = [];          // dh[t] = ∂h_t/∂h_{t-1}
    let hp = 0;
    for (let t = 0; t <= T; t++) {
      const a = R.w * hp + x[t];
      const v = R.act === 'tanh' ? Math.tanh(a) : a;
      h.push(v); dh.push(R.act === 'tanh' ? R.w * (1 - v * v) : R.w);
      hp = v;
    }
    // LSTM escalar con pesos fijos; solo b_f cambia
    const c = [], ft = []; let cp = 0, hl = 0;
    for (let t = 0; t <= T; t++) {
      const f = sgm(R.bf + 0.5 * x[t] + 0.3 * hl), i = sgm(-1 + 4 * x[t]), g = Math.tanh(2 * x[t]), o = sgm(0.5);
      const cv = f * cp + i * g; c.push(cv); ft.push(f); hl = o * Math.tanh(cv); cp = cv;
    }
    // sensibilidades |∂s_T/∂s_k| para k = 0..T
    const g1 = new Array(T + 1), g2 = new Array(T + 1);
    g1[T] = 1; g2[T] = 1;
    for (let k = T - 1; k >= 0; k--) { g1[k] = g1[k + 1] * Math.abs(dh[k + 1]); g2[k] = g2[k + 1] * ft[k + 1]; }
    const mem = g => { let n = 0; for (let k = T - 1; k >= 0; k--) { if (g[k] > 0.01) n++; else break; } return n; };
    return { x, h, c, g1, g2, m1: mem(g1), m2: mem(g2), f: sgm(R.bf) };
  }

  function draw() {
    const S = simulate(), T = R.T;
    $('rnn-w-v').textContent = fmt(R.w, 2);
    $('rnn-bf-v').textContent = sgn(R.bf, 1);
    $('rnn-T-v').textContent = T;
    $('rnn-head').textContent = `f ≈ σ(b_f) = ${fmt(S.f, 3)}`;
    $('rnn-r-g1').textContent = sci(S.g1[0]);
    $('rnn-r-g2').textContent = sci(S.g2[0]);
    $('rnn-r-m1').textContent = S.m1 >= T ? 'toda (' + T + ')' : S.m1 + ' pasos';
    $('rnn-r-m2').textContent = S.m2 >= T ? 'toda (' + T + ')' : S.m2 + ' pasos';
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line');
    const pad = { l: 40, r: 10, t: 12, b: 26 };

    // ---------- estados ----------
    let f = fit($('rnn-c-state'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const lim = 1.5;
      const X = t => pad.l + t / T * (w - pad.l - pad.r), Y = v => pad.t + (lim - Math.max(-lim, Math.min(lim, v))) / (2 * lim) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (const v of [-1, -0.5, 0, 0.5, 1]) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = v ? .5 : 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // entradas
      ctx.fillStyle = muted; ctx.globalAlpha = .55;
      const bw = Math.max(1.5, (w - pad.l - pad.r) / T * 0.5);
      for (let t = 0; t <= T; t++) { const y0 = Y(0), y1 = Y(S.x[t]); ctx.fillRect(X(t) - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); }
      ctx.globalAlpha = 1;
      const curve = (arr, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
        arr.forEach((v, t) => { const px = X(t), py = Y(v); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      };
      curve(S.h, accent); curve(S.c, hot);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (const v of [-1, 0, 1]) ctx.fillText(sgn(v, 0), pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'center';
      const step = T > 60 ? 20 : 10;
      for (let t = 0; t <= T; t += step) ctx.fillText(t, X(t), h - 8);
      if (S.h.some(v => Math.abs(v) > lim)) { ctx.textAlign = 'left'; ctx.fillStyle = accent; ctx.fillText('h fuera de escala', pad.l + 6, pad.t + 10); }
    }

    // ---------- gradientes (log) ----------
    f = fit($('rnn-c-grad'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const lo = -10, hi = 6;
      const X = k => pad.l + k / T * (w - pad.l - pad.r);
      const Y = g => { const l = Math.log10(Math.max(g, 1e-300)); return pad.t + (hi - Math.max(lo, Math.min(hi, l))) / (hi - lo) * (h - pad.t - pad.b); };
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (let e = lo; e <= hi; e += 2) {
        const y = Math.round(Y(10 ** e)) + .5; ctx.globalAlpha = e === 0 ? 1 : .5;
        ctx.strokeStyle = e === 0 ? muted : line; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillText(e === 0 ? '1' : '10' + String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]), pad.l - 6, y + 4);
      }
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(0.01) + .5); ctx.lineTo(w - pad.r, Y(0.01) + .5); ctx.stroke(); ctx.setLineDash([]);
      const curve = (arr, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
        arr.forEach((g, k) => { const px = X(k), py = Y(g); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      };
      curve(S.g1, accent); curve(S.g2, hot);
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const step = T > 60 ? 20 : 10;
      for (let k = 0; k <= T; k += step) ctx.fillText(k, X(k), h - 8);
      ctx.textAlign = 'right'; ctx.fillText('k →  T', w - pad.r, pad.t + 10);
    }
  }

  M.draw['rnn'] = draw;
  M.init.push(() => {
    newNoise();
    $('rnn-w').addEventListener('input', e => { R.w = +e.target.value; draw(); });
    $('rnn-bf').addEventListener('input', e => { R.bf = +e.target.value; draw(); });
    $('rnn-T').addEventListener('input', e => { R.T = +e.target.value; draw(); });
    segBind('rnn-act', b => { R.act = b.dataset.a; draw(); });
    $('rnn-again').addEventListener('click', () => { newNoise(); draw(); });
    draw();
  });
})();
