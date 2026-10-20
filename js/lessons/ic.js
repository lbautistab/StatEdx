/* StatEdx · clase 5, intervalos de confianza */
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
    document.getElementById('ic2-m').textContent = fmt(S2.m, 2) + ' h';
    document.getElementById('ic2-s').textContent = fmt(S2.s, 2) + ' h';
    document.getElementById('ic2-e').textContent = '± ' + fmt(S2.e, 2) + ' h';
    document.getElementById('ic2-int').textContent = `[${fmt(S2.m - S2.e, 2)} ; ${fmt(S2.m + S2.e, 2)}]`;
    document.getElementById('ic2-head').textContent = hit ? 'el intervalo contiene a μ' : 'esta vez no contiene a μ';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    // strip plot
    let f = fit(document.getElementById('c-ic2'));
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
    f = fit(document.getElementById('c-ic2-e'));
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
  const ic2n = document.getElementById('ic2-n');
  ic2n.addEventListener('input', () => { IC2.n = +ic2n.value; document.getElementById('ic2-n-v').textContent = IC2.n; ic2Draw(); });
  segBind('ic2-conf', b => { IC2.c = b.dataset.c; ic2Draw(); });
  document.getElementById('ic2-again').addEventListener('click', ic2New);

  const SS = { z: 1.96 };
  function ssCalc() {
    const sd = parseFloat(document.getElementById('ss-sd').value), e = parseFloat(document.getElementById('ss-e').value);
    const out = document.getElementById('ss-n'), note = document.getElementById('ss-note');
    if (!(sd > 0) || !(e > 0)) { out.textContent = '–'; note.textContent = 'Escribe una σ y un margen mayores que cero.'; return; }
    const n = Math.ceil((SS.z * sd / e) ** 2);
    out.textContent = n.toLocaleString('es') + ' personas';
    note.textContent = `n = (${fmt(SS.z, 2)} × ${fmt(sd, 2)} / ${fmt(e, 2)})², redondeado hacia arriba`;
  }
  ['ss-sd', 'ss-e'].forEach(id => document.getElementById(id).addEventListener('input', ssCalc));
  segBind('ss-conf', b => { SS.z = +b.dataset.z; ssCalc(); });

  M.draw.ic = ic2Draw;
  M.init.push(() => { ic2New(); ssCalc(); });
})();
