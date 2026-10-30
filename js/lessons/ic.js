/* StatEdx · sesión ic: Intervalos de confianza */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const ZQ = { '0.90': 1.6449, '0.95': 1.96, '0.99': 2.5758 };
  // ---------- lesson: confidence intervals ----------
  const IC2 = { mu: 4.2, sigma: 1.5, n: 20, c: '0.95', xs: [] };
  function genHours() { let v; do { v = IC2.mu + randn() * IC2.sigma; } while (v < 0 || v > 10); return v; }
  function ic2New() { IC2.pool = Array.from({ length: 200 }, genHours); ic2Draw(); }
  function ic2Stats() {
    const xs = IC2.pool.slice(0, IC2.n), n = xs.length;
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
    const t = tq(ZQ[IC2.c], n - 1), e = t * s / Math.sqrt(n);
    return { xs, n, m, s, t, e };
  }
  function ic2Draw() {
    const S2 = ic2Stats();
    const hit = Math.abs(S2.m - IC2.mu) <= S2.e;
    document.getElementById('ic-m').textContent = fmt(S2.m, 2) + ' h';
    document.getElementById('ic-s').textContent = fmt(S2.s, 2) + ' h';
    document.getElementById('ic-e').textContent = '± ' + fmt(S2.e, 2) + ' h';
    document.getElementById('ic-int').textContent = `[${fmt(S2.m - S2.e, 2)} ; ${fmt(S2.m + S2.e, 2)}]`;
    document.getElementById('ic-head').textContent = hit ? 'el intervalo contiene a μ' : 'esta vez no contiene a μ';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    // strip plot
    let f = fit(document.getElementById('ic-c-strip'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 16, b: 26 }, lo = 0, hi = 9;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const stripTop = pad.t, stripH = h - pad.b - pad.t - 56;
      ctx.fillStyle = muted;
      S2.xs.forEach((v, i) => { const jitter = ((i * 0.618034) % 1); ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(X(v), stripTop + jitter * stripH, 3, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      const yI = h - pad.b - 26, col = hit ? accent : hot;
      ctx.fillStyle = col; ctx.globalAlpha = .18; ctx.fillRect(X(S2.m - S2.e), pad.t - 6, X(S2.m + S2.e) - X(S2.m - S2.e), yI - pad.t + 6); ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(S2.m - S2.e), yI); ctx.lineTo(X(S2.m + S2.e), yI); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(S2.m), yI, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(Math.round(X(IC2.mu)) + .5, pad.t - 8); ctx.lineTo(Math.round(X(IC2.mu)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, 9, 1, h - 8, muted);
    }
    // margin vs n
    f = fit(document.getElementById('ic-c-margin'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 14, t: 16, b: 26 }, nLo = 5, nHi = 200, eHi = 1.8;
      const X = n => pad.l + (n - nLo) / (nHi - nLo) * (w - pad.l - pad.r);
      const Y = e => h - pad.b - Math.min(e, eHi) / eHi * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'right';
      for (let e = 0.5; e <= eHi; e += 0.5) { const y = Math.round(Y(e)) + .5; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(fmt(e, 1), pad.l - 6, y + 4); }
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      for (let n = nLo; n <= nHi; n++) { const e = tq(ZQ[IC2.c], n - 1) * IC2.sigma / Math.sqrt(n); n === nLo ? ctx.moveTo(X(n), Y(e)) : ctx.lineTo(X(n), Y(e)); }
      ctx.stroke();
      ctx.fillStyle = hit ? accent : hot; ctx.strokeStyle = tok('--bg'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(S2.n), Y(S2.e), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const n of [5, 50, 100, 150, 200]) ctx.fillText(n, X(n), h - 8);
    }
  }
  const ic2n = document.getElementById('ic-n');
  ic2n.addEventListener('input', () => { IC2.n = +ic2n.value; document.getElementById('ic-n-v').textContent = IC2.n; ic2Draw(); });
  segBind('ic-conf', b => { IC2.c = b.dataset.c; ic2Draw(); });
  document.getElementById('ic-again').addEventListener('click', ic2New);

  const SS = { z: 1.96 };
  function ssCalc() {
    const sd = parseFloat(document.getElementById('ic-ss-sd').value), e = parseFloat(document.getElementById('ic-ss-e').value);
    const out = document.getElementById('ic-ss-n'), note = document.getElementById('ic-ss-note');
    if (!(sd > 0) || !(e > 0)) { out.textContent = '–'; note.textContent = 'Escribe una σ y un margen mayores que cero.'; return; }
    const n = Math.ceil((SS.z * sd / e) ** 2);
    out.textContent = n.toLocaleString('es') + ' personas';
    note.textContent = `n = (${fmt(SS.z, 2)} × ${fmt(sd, 2)} / ${fmt(e, 2)})², redondeado hacia arriba`;
  }
  ['ic-ss-sd', 'ic-ss-e'].forEach(id => document.getElementById(id).addEventListener('input', ssCalc));
  segBind('ic-ss-conf', b => { SS.z = +b.dataset.z; ssCalc(); });


  // ---------- cobertura exacta de intervalos para una proporción: Wald frente a Wilson ----------
  const PR = { n: 30, p: 0.1 };
  const lgam = (() => { const c = [0]; for (let i = 1; i <= 1000; i++) c[i] = c[i - 1] + Math.log(i); return k => c[k]; })();
  const dbin = (k, n, p) => p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(lgam(n) - lgam(k) - lgam(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  function wald(k, n) { const ph = k / n, e = 1.96 * Math.sqrt(ph * (1 - ph) / n); return [ph - e, ph + e]; }
  function wilson(k, n) { const z = 1.96, ph = k / n, d = 1 + z * z / n, c = (ph + z * z / (2 * n)) / d, e = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / d; return [c - e, c + e]; }
  function cover(n, p, f) { let cov = 0, wid = 0; for (let k = 0; k <= n; k++) { const pk = dbin(k, n, p), [a, b] = f(k, n); if (a <= p && p <= b) cov += pk; wid += pk * (Math.min(1, b) - Math.max(0, a)); } return [cov, wid]; }
  function prDraw() {
    const [cw, ww] = cover(PR.n, PR.p, wald), [cs, ws] = cover(PR.n, PR.p, wilson);
    document.getElementById('ic-pr-cw').textContent = pct(cw, 1);
    document.getElementById('ic-pr-cs').textContent = pct(cs, 1);
    document.getElementById('ic-pr-ww').textContent = fmt(ww, 3);
    document.getElementById('ic-pr-ws').textContent = fmt(ws, 3);
    document.getElementById('ic-pr-head').textContent = `n = ${PR.n} · p = ${fmt(PR.p, 2)}`;
    const f = fit(document.getElementById('ic-c-prop')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 42, r: 12, t: 12, b: 30 }, yLo = 0.5, yHi = 1;
    const X = p => pad.l + p * (w - pad.l - pad.r);
    const Y = c => h - pad.b - (Math.max(yLo, c) - yLo) / (yHi - yLo) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'right';
    for (const c of [0.5, 0.6, 0.7, 0.8, 0.9, 1]) { const y = Math.round(Y(c)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(Math.round(c * 100) + ' %', pad.l - 6, y + 4); }
    ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(0.95)); ctx.lineTo(w - pad.r, Y(0.95)); ctx.stroke(); ctx.setLineDash([]);
    const steps = Math.max(120, Math.floor(w - pad.l - pad.r));
    for (const [fn, col, lw] of [[wald, hot, 1.4], [wilson, accent, 1.6]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 1; i < steps; i++) { const p = i / steps, c = cover(PR.n, p, fn)[0]; i === 1 ? ctx.moveTo(X(p), Y(c)) : ctx.lineTo(X(p), Y(c)); }
      ctx.stroke();
    }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(X(PR.p)) + .5, pad.t); ctx.lineTo(Math.round(X(PR.p)) + .5, h - pad.b); ctx.stroke();
    for (const [c, col] of [[cw, hot], [cs, accent]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(PR.p), Y(c), 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (const p of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(fmt(p, 2), Math.min(Math.max(X(p), pad.l + 12), w - pad.r - 12), h - 14);
    ctx.fillText('proporción real p', (pad.l + w - pad.r) / 2, h - 1);
  }
  const prN = document.getElementById('ic-pr-n'), prP = document.getElementById('ic-pr-p');
  prN.addEventListener('input', () => { PR.n = +prN.value; document.getElementById('ic-pr-n-v').textContent = PR.n; prDraw(); });
  prP.addEventListener('input', () => { PR.p = +prP.value / 100; document.getElementById('ic-pr-p-v').textContent = fmt(PR.p, 2); prDraw(); });

  M.draw.ic = () => { ic2Draw(); prDraw(); };
  M.init.push(() => { ic2New(); ssCalc(); prDraw(); });
})();
