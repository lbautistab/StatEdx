/* StatEdx · clase 3, distribución normal */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;

  // ---------- lesson: normal ----------
  const NM = { mu: 170, sd: 8, a: 162, b: 178, k: 1 };
  const nmEls = ['mu', 'sd', 'a', 'b'].reduce((o, k) => (o[k] = document.getElementById('nm-' + k), o), {});
  function nmSync() {
    if (NM.k) { NM.a = Math.round(NM.mu - NM.k * NM.sd); NM.b = Math.round(NM.mu + NM.k * NM.sd); }
    for (const k of ['mu', 'sd', 'a', 'b']) { nmEls[k].value = NM[k]; document.getElementById('nm-' + k + '-v').textContent = NM[k]; }
    drawNormal();
  }
  nmEls.mu.addEventListener('input', () => { NM.mu = +nmEls.mu.value; nmSync(); });
  nmEls.sd.addEventListener('input', () => { NM.sd = +nmEls.sd.value; nmSync(); });
  const nmFree = () => { NM.k = 0; document.querySelectorAll('#nm-pre button').forEach(x => x.setAttribute('aria-pressed', 'false')); };
  nmEls.a.addEventListener('input', () => { nmFree(); NM.a = +nmEls.a.value; if (NM.a > NM.b) NM.b = NM.a; nmSync(); });
  nmEls.b.addEventListener('input', () => { nmFree(); NM.b = +nmEls.b.value; if (NM.b < NM.a) NM.a = NM.b; nmSync(); });
  segBind('nm-pre', b => { NM.k = +b.dataset.k; nmSync(); });
  function drawNormal() {
    const za = (NM.a - NM.mu) / NM.sd, zb = (NM.b - NM.mu) / NM.sd, p = Phi(zb) - Phi(za);
    document.getElementById('nm-p').textContent = pct(p, 2);
    document.getElementById('nm-za').textContent = fmt(za, 2);
    document.getElementById('nm-zb').textContent = fmt(zb, 2);
    document.getElementById('nm-out').textContent = pct(1 - p, 2);
    document.getElementById('nm-head').textContent = `X ~ N(${NM.mu}, ${NM.sd}²)`;
    const cv = document.getElementById('c-normal'); const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 12, r: 12, t: 30, b: 26 }, lo = 120, hi = 220;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const peak = npdf(0, 0, 3);
    const Y = d => h - pad.b - d / peak * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let v = 130; v <= 210; v += 10) { const x = Math.round(X(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // shaded area
    ctx.fillStyle = accent; ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(X(NM.a), Y(0));
    for (let i = 0; i <= 120; i++) { const x = NM.a + (NM.b - NM.a) * i / 120; ctx.lineTo(X(x), Y(npdf(x, NM.mu, NM.sd))); }
    ctx.lineTo(X(NM.b), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // σ markers
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let k = -3; k <= 3; k++) { const v = NM.mu + k * NM.sd; if (v < lo || v > hi) continue; const x = Math.round(X(v)) + .5;
      ctx.strokeStyle = k ? line : ink; ctx.setLineDash(k ? [2, 3] : [3, 3]); ctx.beginPath(); ctx.moveTo(x, Y(npdf(v, NM.mu, NM.sd))); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText(k ? (k > 0 ? '+' : '−') + Math.abs(k) + 'σ' : 'μ', x, pad.t - 12); }
    // curve
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const x = lo + (hi - lo) * i / 300; const y = Y(npdf(x, NM.mu, NM.sd)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
    ctx.stroke();
    // a, b handles
    for (const v of [NM.a, NM.b]) { ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(v), Y(npdf(v, NM.mu, NM.sd))); ctx.lineTo(X(v), h - pad.b); ctx.stroke(); }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, 130, 210, 10, h - 8, muted);
    // probability label inside area
    const mid = (NM.a + NM.b) / 2; ctx.fillStyle = ink; ctx.font = '600 14px ' + tok('--f-mono');
    if (NM.b - NM.a > 4) ctx.fillText(pct(p, 1), X(mid), Math.min(Y(npdf(mid, NM.mu, NM.sd)) + (h - pad.b - Y(npdf(mid, NM.mu, NM.sd))) * 0.55, h - pad.b - 10));
  }

  M.draw.normal = drawNormal;
  M.init.push(nmSync);
})();
