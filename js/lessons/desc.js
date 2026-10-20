/* StatEdx · clase 1, medidas de tendencia central y dispersión */
(() => {
  // ---------- lesson: desc ----------
  const $ = id => document.getElementById(id);
  const DS = {
    base: [14, 16, 17, 18, 18, 19, 20, 20, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 28, 29, 30, 32, 34, 37],
    v: 40, k: 1,
  };
  const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };
  function dsExtra() {
    if (DS.k === 0) return [];
    if (DS.k === 1) return [DS.v];
    return [Math.round(DS.v * 0.86), DS.v, Math.round(DS.v * 1.12)];
  }
  function dsStats() {
    const extra = dsExtra(), xs = DS.base.concat(extra), s = xs.slice().sort((a, b) => a - b), n = xs.length;
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const q1 = q7(s, 0.25), med = q7(s, 0.5), q3 = q7(s, 0.75), iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    const wl = s.find(x => x >= lo), wh = [...s].reverse().find(x => x <= hi);
    const cut = Math.floor(n * 0.1), tr = s.slice(cut, n - cut), trim = tr.reduce((a, b) => a + b, 0) / tr.length;
    return { xs: s, extra, n, mean, sd, q1, med, q3, iqr, lo, hi, wl, wh, trim };
  }
  function niceStep(range, px) {
    const target = range / Math.max(3, Math.floor(px / 56));
    for (const s of [1, 2, 5, 10, 20, 25, 50, 100]) if (s >= target) return s;
    return 100;
  }
  function drawDesc() {
    const S = dsStats();
    $('desc-mean').textContent = M.fmt(S.mean, 1) + ' mil';
    $('desc-med').textContent = M.fmt(S.med, 1) + ' mil';
    $('desc-sd').textContent = M.fmt(S.sd, 1) + ' mil';
    $('desc-iqr').textContent = M.fmt(S.iqr, 1) + ' mil';
    $('desc-head').textContent = `n = ${S.n} · media recortada 10 % = ${M.fmt(S.trim, 1)}`;
    const cv = $('desc-plot'), f = M.fit(cv); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line'), bg = M.tok('--surface');
    const mono = M.tok('--f-mono');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 18, t: 38, b: 26 };
    const hi = Math.max(60, Math.ceil((S.xs[S.n - 1] + 6) / 10) * 10), lo = hi > 100 ? 0 : 10;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const step = niceStep(hi - lo, w - pad.l - pad.r);
    const boxY = h - pad.b - 34, boxH = 24, dotBase = boxY - boxH / 2 - 16;
    // grid
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t - 6); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // dot plot (stacked)
    const r = Math.max(3, Math.min(5, (w - pad.l - pad.r) / 90));
    const placed = [];
    const outl = x => x < S.lo || x > S.hi;
    const extraLeft = S.extra.slice();
    S.xs.forEach(v => {
      const x = X(v); let lv = 0;
      while (placed.some(p => p.lv === lv && Math.abs(p.x - x) < 2 * r + 1)) lv++;
      placed.push({ x, lv });
      const y = dotBase - lv * (2 * r + 1) - r;
      const ei = extraLeft.indexOf(v), isExtra = ei >= 0; if (isExtra) extraLeft.splice(ei, 1);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (isExtra) { ctx.fillStyle = hot; ctx.fill(); }
      else if (outl(v)) { ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = muted; ctx.globalAlpha = .6; ctx.fill(); ctx.globalAlpha = 1; }
    });
    // box plot
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillStyle = accent; ctx.globalAlpha = .18; ctx.fillRect(X(S.q1), boxY - boxH / 2, X(S.q3) - X(S.q1), boxH); ctx.globalAlpha = 1;
    ctx.strokeRect(Math.round(X(S.q1)) + .5, boxY - boxH / 2 + .5, X(S.q3) - X(S.q1), boxH);
    ctx.beginPath();
    ctx.moveTo(X(S.wl), boxY); ctx.lineTo(X(S.q1), boxY); ctx.moveTo(X(S.q3), boxY); ctx.lineTo(X(S.wh), boxY);
    ctx.moveTo(X(S.wl), boxY - 7); ctx.lineTo(X(S.wl), boxY + 7); ctx.moveTo(X(S.wh), boxY - 7); ctx.lineTo(X(S.wh), boxY + 7);
    ctx.stroke();
    S.xs.filter(outl).forEach(v => { ctx.beginPath(); ctx.arc(X(v), boxY, 3.5, 0, Math.PI * 2); ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.stroke(); });
    // mean & median lines
    const xm = X(S.mean), xd = X(S.med), top = pad.t - 4, bot = boxY + boxH / 2 + 4;
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(Math.round(xd) + .5, top); ctx.lineTo(Math.round(xd) + .5, bot); ctx.stroke();
    ctx.strokeStyle = hot; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(Math.round(xm) + .5, top); ctx.lineTo(Math.round(xm) + .5, bot); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 12px ' + mono; ctx.textBaseline = 'alphabetic';
    const meanRight = S.mean >= S.med;
    const lab = (txt, x, right) => { const tw = ctx.measureText(txt).width; let x0 = right ? x + 4 : x - 4 - tw; x0 = Math.max(2, Math.min(w - 2 - tw, x0)); return { txt, x0, tw }; };
    const Lm = lab('media ' + M.fmt(S.mean, 1), xm, meanRight), Ld = lab('mediana ' + M.fmt(S.med, 1), xd, !meanRight);
    const clash = Lm.x0 < Ld.x0 + Ld.tw + 6 && Ld.x0 < Lm.x0 + Lm.tw + 6;
    ctx.textAlign = 'left';
    ctx.fillStyle = hot; ctx.fillText(Lm.txt, Lm.x0, 14);
    ctx.fillStyle = accent; ctx.fillText(Ld.txt, Ld.x0, clash ? 29 : 14);
    // axis
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    M.axisTicks(ctx, X, Math.ceil(lo / step) * step, hi, step, h - 8, muted);
  }
  const dsv = $('desc-v');
  function dsSync() { $('desc-v-v').textContent = DS.v; dsv.disabled = DS.k === 0; drawDesc(); }
  dsv.addEventListener('input', () => { DS.v = +dsv.value; dsSync(); });
  M.segBind('desc-k', b => { DS.k = +b.dataset.k; dsSync(); });
  $('desc-again').addEventListener('click', () => {
    DS.base = Array.from({ length: 24 }, () => Math.min(48, Math.max(12, Math.round(Math.exp(Math.log(23) + 0.22 * M.randn()))))).sort((a, b) => a - b);
    drawDesc();
  });
  M.draw['desc'] = drawDesc;
  M.init.push(dsSync);
})();
