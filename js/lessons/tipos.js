/* StatEdx · sesión tipos: Tipos de variables y escalas de medición */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);

  // conteos de respuestas 1..5 en cada sucursal (n = 20)
  const CNT = { A: [6, 2, 2, 3, 7], B: [0, 3, 5, 10, 2] };
  const K = [1, 2, 3, 4, 5];
  const S = { esc: 'ord', t: K.slice(), label: 'y = x (sin transformar)', flips: null };

  const mean = (c, t) => c.reduce((a, n, i) => a + n * t[i], 0) / c.reduce((a, b) => a + b, 0);
  function median(c, t) {
    const v = []; c.forEach((n, i) => { for (let j = 0; j < n; j++) v.push(t[i]); });
    v.sort((a, b) => a - b); const m = v.length / 2;
    return v.length % 2 ? v[Math.floor(m)] : (v[m - 1] + v[m]) / 2;
  }
  const sgn = x => (x < 0 ? '−' : '') + fmt(Math.abs(x), Math.abs(x) >= 100 ? 0 : 1);

  // una transformación admisible al azar para la escala elegida
  function randomT(esc) {
    if (esc === 'nom') {
      const p = K.slice();
      for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
      return { t: p, label: 'reetiquetar: ' + p.join(' · ') };
    }
    if (esc === 'ord') {
      const t = []; let v = Math.random() * 2;
      for (let i = 0; i < 5; i++) { v += i ? 0.1 + Math.exp(1.3 * randn()) : 0; t.push(v); }
      return { t, label: 'y = f(x), f creciente' };
    }
    const b = Math.exp((Math.random() - 0.3) * 3), a = esc === 'int' ? Math.round((Math.random() * 2 - 1) * 40) : 0;
    const t = K.map(x => a + b * x);
    return { t, label: 'y = ' + (a ? sgn(a) + ' + ' : '') + fmt(b, 2) + '·x' };
  }

  function countFlips(esc) {
    const m0 = Math.sign(mean(CNT.A, K) - mean(CNT.B, K)), d0 = Math.sign(median(CNT.A, K) - median(CNT.B, K));
    let fm = 0, fd = 0; const N = 1000;
    for (let i = 0; i < N; i++) {
      const { t } = randomT(esc);
      if (Math.sign(mean(CNT.A, t) - mean(CNT.B, t)) !== m0) fm++;
      if (Math.sign(median(CNT.A, t) - median(CNT.B, t)) !== d0) fd++;
    }
    return { fm: fm / N, fd: fd / N };
  }

  const lab = v => { const r = Math.round(v); return Math.abs(v - r) < 0.05 ? (r < 0 ? '−' : '') + Math.abs(r) : sgn(v); };
  const cmp = (a, b) => Math.abs(a - b) < 1e-9 ? 'A = B' : a < b ? 'A < B' : 'A > B';

  function draw() {
    const mA0 = mean(CNT.A, K), mB0 = mean(CNT.B, K), dA0 = median(CNT.A, K), dB0 = median(CNT.B, K);
    const mA = mean(CNT.A, S.t), mB = mean(CNT.B, S.t), dA = median(CNT.A, S.t), dB = median(CNT.B, S.t);
    const cm0 = cmp(mA0, mB0), cm1 = cmp(mA, mB), cd0 = cmp(dA0, dB0), cd1 = cmp(dA, dB);
    $('tipos-r-mean').textContent = cm0 + ' → ' + cm1;
    $('tipos-r-med').textContent = cd0 + ' → ' + cd1;
    $('tipos-r-mean').style.color = cm0 !== cm1 ? tok('--hot') : '';
    $('tipos-r-med').style.color = cd0 !== cd1 ? tok('--hot') : '';
    const r0 = mB0 / mA0, r1 = mB / mA;
    $('tipos-r-ratio').textContent = fmt(r0, 2) + ' → ' + (Math.abs(mA) < 1e-9 ? '∞' : (r1 < 0 ? '−' : '') + fmt(Math.abs(r1), 2));
    $('tipos-r-ratio').style.color = Math.abs(r0 - r1) > 0.005 ? tok('--hot') : '';
    if (!S.flips) S.flips = countFlips(S.esc);
    $('tipos-r-flip').textContent = Math.round(S.flips.fm * 100) + ' % · ' + Math.round(S.flips.fd * 100) + ' %';
    $('tipos-head').textContent = S.label;

    const f = fit($('tipos-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line');
    const mono = '11px ' + tok('--f-mono');
    ctx.clearRect(0, 0, w, h);
    const pl = 30, pr = 30, maxC = 10, bh = 50, bw = Math.min(16, (w - pl - pr) / 16);
    // panel superior (original) y panel inferior (transformado)
    const P1 = { base: 92, lab: 107, mk: 28 }, P2 = { base: h - 34, lab: h - 19, mk: h - 34 - bh - 18 };
    const X1 = v => pl + 14 + (v - 1) / 4 * (w - pl - pr - 28);
    let lo = Math.min(...S.t), hi = Math.max(...S.t); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const X2 = v => pl + 14 + (v - lo) / (hi - lo) * (w - pl - pr - 28);

    function panel(P, X, t, title) {
      ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'left';
      ctx.fillText(title, 8, P.mk - 12);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let r = 5; r <= maxC; r += 5) { const y = Math.round(P.base - r / maxC * bh) + .5; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      K.forEach((k, i) => {
        const x = X(t[i]);
        ctx.fillStyle = accent; ctx.globalAlpha = .85; ctx.fillRect(x - bw - 1, P.base - CNT.A[i] / maxC * bh, bw, CNT.A[i] / maxC * bh);
        ctx.fillStyle = hot; ctx.fillRect(x + 1, P.base - CNT.B[i] / maxC * bh, bw, CNT.B[i] / maxC * bh);
        ctx.globalAlpha = 1;
      });
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pl, P.base + .5); ctx.lineTo(w - pr, P.base + .5); ctx.stroke();
      // etiquetas de valores (se omiten si se encimarían)
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const order = K.map((k, i) => i).sort((a, b) => t[a] - t[b]); let last = -1e9;
      for (const i of order) { const x = X(t[i]); if (x - last < 30) continue; ctx.fillText(lab(t[i]), x, P.lab); last = x; }
      // marcadores de media (lleno) y mediana (hueco)
      const marks = [[mean(CNT.A, t), accent, true], [mean(CNT.B, t), hot, true], [median(CNT.A, t), accent, false], [median(CNT.B, t), hot, false]];
      marks.forEach(([v, c, full], j) => {
        const x = X(v), y = P.mk + (full ? 0 : 10);
        ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x, y + 2); ctx.closePath();
        if (full) { ctx.fillStyle = c; ctx.fill(); } else { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.stroke(); }
      });
    }
    panel(P1, X1, K, 'ORIGINAL');
    // flechas valor original → transformado
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.globalAlpha = .8;
    const y0 = P1.lab + 8, y1 = P2.mk - 26;
    K.forEach((k, i) => { ctx.beginPath(); ctx.moveTo(X1(k), y0); ctx.lineTo(X2(S.t[i]), y1); ctx.stroke(); });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = muted;
    K.forEach((k, i) => { const x = X2(S.t[i]); ctx.beginPath(); ctx.moveTo(x - 4, y1 - 5); ctx.lineTo(x + 4, y1 - 5); ctx.lineTo(x, y1 + 1); ctx.closePath(); ctx.fill(); });
    panel(P2, X2, S.t, 'TRANSFORMADA');
  }

  function newT() { const r = randomT(S.esc); S.t = r.t; S.label = r.label; draw(); }
  segBind('tipos-esc', b => { S.esc = b.dataset.e; S.flips = null; newT(); });
  $('tipos-again').addEventListener('click', newT);
  $('tipos-hunt').addEventListener('click', () => {
    const m0 = Math.sign(mean(CNT.A, K) - mean(CNT.B, K));
    for (let i = 0; i < 2000; i++) {
      const r = randomT(S.esc);
      if (Math.sign(mean(CNT.A, r.t) - mean(CNT.B, r.t)) !== m0) { S.t = r.t; S.label = r.label + ' · intento ' + (i + 1); draw(); return; }
    }
    S.t = K.slice(); S.label = 'ninguna de 2 000 invierte la media'; draw();
  });
  $('tipos-reset').addEventListener('click', () => { S.t = K.slice(); S.label = 'y = x (sin transformar)'; draw(); });

  M.draw['tipos'] = draw;
  M.init.push(draw);
})();
