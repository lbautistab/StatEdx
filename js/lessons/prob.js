/* Muestra · clase 2, probabilidad y variables aleatorias */
(() => {
  // ---------- lesson: prob ----------
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + M.tok('--f-mono');
  const thou = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');

  // ---- (a) ley de los grandes números ----
  const LG = { mode: 'coin', p: 0.5, n: 0, k: 0, path: [], MAX: 10000 };
  function lgAdd(m) {
    for (let i = 0; i < m && LG.n < LG.MAX; i++) {
      if (Math.random() < LG.p) LG.k++;
      LG.n++; LG.path.push(LG.k / LG.n);
    }
    drawLGN();
  }
  function lgReset() { LG.n = 0; LG.k = 0; LG.path = []; lgAdd(20); }
  function drawLGN() {
    const f0 = LG.n ? LG.k / LG.n : 0;
    $('prob-lg-n').textContent = thou(LG.n);
    $('prob-lg-k').textContent = thou(LG.k);
    $('prob-lg-f').textContent = M.fmt(f0, 4);
    $('prob-lg-d').textContent = (f0 >= LG.p ? '+' : '−') + M.fmt(Math.abs(f0 - LG.p), 4);
    $('prob-lg-head').textContent = (LG.mode === 'coin' ? 'p = 1/2 = 0,5000' : 'p = 1/6 ≈ 0,1667') + (LG.n >= LG.MAX ? ' · máximo alcanzado' : '');
    const f = M.fit($('prob-lg-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 16, t: 14, b: 26 };
    const dec = Math.max(2, Math.ceil(Math.log10(Math.max(LG.n, 10)) - 1e-9));
    const nHi = Math.pow(10, dec);
    const X = n => pad.l + Math.log10(n) / dec * (w - pad.l - pad.r);
    const Y = v => h - pad.b - v * (h - pad.t - pad.b);
    // grid + y labels
    ctx.font = font(); ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    for (let v = 0; v <= 1.0001; v += 0.25) {
      const y = Math.round(Y(v)) + .5; ctx.strokeStyle = line; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.fillText(M.fmt(v, 2), pad.l - 6, y + 4);
    }
    // band p ± 2 se
    ctx.fillStyle = accent; ctx.globalAlpha = .14; ctx.beginPath();
    const steps = 160, pts = [];
    for (let i = 0; i <= steps; i++) { const n = Math.pow(10, dec * i / steps); pts.push(n); }
    pts.forEach((n, i) => { const se = 2 * Math.sqrt(LG.p * (1 - LG.p) / n); const y = Y(Math.min(1, LG.p + se)); i ? ctx.lineTo(X(n), y) : ctx.moveTo(X(n), y); });
    for (let i = pts.length - 1; i >= 0; i--) { const n = pts[i], se = 2 * Math.sqrt(LG.p * (1 - LG.p) / n); ctx.lineTo(X(n), Y(Math.max(0, LG.p - se))); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    // theoretical p
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(LG.p)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(LG.p)) + .5); ctx.stroke(); ctx.setLineDash([]);
    // path
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    let lastX = -1;
    for (let i = 1; i <= LG.n; i++) {
      const x = X(i);
      if (i > 1 && i < LG.n && x - lastX < 0.6) continue;
      const y = Y(LG.path[i - 1]); i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); lastX = x;
    }
    ctx.stroke();
    if (LG.n) { ctx.fillStyle = hot; ctx.strokeStyle = M.tok('--surface'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(LG.n), Y(f0), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // x axis
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let d = 0; d <= dec; d++) { const n = Math.pow(10, d), s = n >= 1000 ? thou(n / 1000) + ' mil' : String(n), tw = ctx.measureText(s).width; ctx.fillText(s, Math.min(X(n), w - 2 - tw / 2), h - 8); }
  }
  M.segBind('prob-lg-mode', b => { LG.mode = b.dataset.m; LG.p = LG.mode === 'coin' ? 0.5 : 1 / 6; lgReset(); });
  $('prob-lg-add').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; lgAdd(+b.dataset.n); b.setAttribute('aria-pressed', 'false'); });
  $('prob-lg-reset').addEventListener('click', lgReset);

  // ---- (b) explorador binomial / Poisson ----
  const PD = { d: 'bin', n: 10, p: 0.3, lam: 4, k: 3, ov: false };
  const binPmf = (n, p) => {
    const out = new Array(n + 1).fill(0);
    if (p >= 1) { out[n] = 1; return out; }
    out[0] = Math.pow(1 - p, n);
    for (let k = 0; k < n; k++) out[k + 1] = out[k] * (n - k) / (k + 1) * p / (1 - p);
    return out;
  };
  const poiPmf = (lam, K) => { const out = [Math.exp(-lam)]; for (let k = 0; k < K; k++) out.push(out[k] * lam / (k + 1)); return out; };
  const pdMax = () => PD.d === 'bin'
    ? Math.min(PD.n, Math.max(10, Math.ceil(PD.n * PD.p + 4 * Math.sqrt(PD.n * PD.p * (1 - PD.p)) + 3)))
    : Math.ceil(PD.lam + 4 * Math.sqrt(PD.lam) + 3);
  function pdSync() {
    const kmax = pdMax();
    if (PD.k > kmax) PD.k = kmax;
    const kin = $('prob-pd-k'); kin.max = kmax; kin.value = PD.k;
    $('prob-pd-k-v').textContent = PD.k;
    $('prob-pd-n-v').textContent = PD.n;
    $('prob-pd-p-v').textContent = M.fmt(PD.p, 2);
    $('prob-pd-l-v').textContent = M.fmt(PD.lam, 1);
    const bin = PD.d === 'bin';
    $('prob-pd-n-wrap').style.display = bin ? '' : 'none';
    $('prob-pd-p-wrap').style.display = bin ? '' : 'none';
    $('prob-pd-ov-wrap').style.display = bin ? '' : 'none';
    $('prob-pd-l-wrap').style.display = bin ? 'none' : '';
    drawPD();
  }
  function drawPD() {
    const bin = PD.d === 'bin', K = pdMax();
    const pm = bin ? binPmf(PD.n, PD.p) : poiPmf(PD.lam, K);
    const hiddenTail = bin && K < PD.n;
    const mean = bin ? PD.n * PD.p : PD.lam, vr = bin ? PD.n * PD.p * (1 - PD.p) : PD.lam;
    let cum = 0; for (let i = 0; i <= PD.k; i++) cum += pm[i];
    $('prob-pd-e').textContent = M.fmt(mean, 2);
    $('prob-pd-v').textContent = M.fmt(vr, 2);
    $('prob-pd-pk-l').textContent = `P(X = ${PD.k})`;
    $('prob-pd-ck-l').textContent = `P(X ≤ ${PD.k})`;
    $('prob-pd-pk').textContent = M.fmt(pm[PD.k], 4);
    $('prob-pd-ck').textContent = M.fmt(Math.min(1, cum), 4);
    $('prob-pd-head').textContent = bin ? `X ~ Binomial(${PD.n}; ${M.fmt(PD.p, 2)})` : `X ~ Poisson(${M.fmt(PD.lam, 1)})`;
    const f = M.fit($('prob-pd-plot')); if (!f) return; const { ctx, w, h } = f;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const ov = bin && PD.ov ? poiPmf(PD.n * PD.p, K) : null;
    const pad = { l: 44, r: 14, t: 30, b: 26 };
    let peak = Math.max(...pm); if (ov) peak = Math.max(peak, ...ov);
    const yStep = peak > 0.5 ? 0.25 : peak > 0.2 ? 0.1 : peak > 0.1 ? 0.05 : 0.02;
    const yHi = Math.ceil(peak * 1.08 / yStep) * yStep;
    const X = v => pad.l + (v + 0.5) / (K + 1) * (w - pad.l - pad.r);
    const Y = q => h - pad.b - q / yHi * (h - pad.t - pad.b);
    ctx.font = font(); ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (let v = 0; v <= yHi + 1e-9; v += yStep) {
      const y = Math.round(Y(v)) + .5; ctx.strokeStyle = line; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.fillText(M.fmt(v, 2), pad.l - 6, y + 4);
    }
    const bw = Math.max(1, (w - pad.l - pad.r) / (K + 1) * 0.74);
    for (let i = 0; i <= K; i++) {
      const on = i <= PD.k;
      ctx.fillStyle = accent; ctx.globalAlpha = on ? .85 : .3;
      ctx.fillRect(X(i) - bw / 2, Y(pm[i]), bw, h - pad.b - Y(pm[i]));
    }
    ctx.globalAlpha = 1;
    // bar k outline
    ctx.strokeStyle = hot; ctx.lineWidth = 2;
    ctx.strokeRect(X(PD.k) - bw / 2 - 1, Y(pm[PD.k]) - 1, bw + 2, h - pad.b - Y(pm[PD.k]) + 1);
    // overlay Poisson
    if (ov) {
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= K; i++) { const x = X(i), y = Y(ov[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1;
      const rr = Math.max(2, Math.min(3.5, bw / 3));
      for (let i = 0; i <= K; i++) { ctx.beginPath(); ctx.arc(X(i), Y(ov[i]), rr, 0, Math.PI * 2); ctx.fill(); }
    }
    // mean line
    const xm = pad.l + (mean + 0.5) / (K + 1) * (w - pad.l - pad.r);
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(Math.round(xm) + .5, pad.t - 6); ctx.lineTo(Math.round(xm) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ink; ctx.font = '600 12px ' + M.tok('--f-mono');
    const txt = 'E[X] = ' + M.fmt(mean, 2) + (ov ? '  · ● Poisson(np)' : '');
    const tw = ctx.measureText(txt).width;
    let tx = xm + 6; if (tx + tw > w - pad.r) tx = Math.max(pad.l, xm - 6 - tw);
    ctx.textAlign = 'left'; ctx.fillText(txt, tx, pad.t - 12);
    // x axis
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.font = font(); ctx.fillStyle = muted; ctx.textAlign = 'center';
    const px = (w - pad.l - pad.r) / (K + 1);
    const st = [1, 2, 5, 10, 20].find(s => s * px >= 26) || 20;
    for (let i = 0; i <= K; i += st) ctx.fillText(i, X(i), h - 8);
    if (hiddenTail) { ctx.textAlign = 'right'; ctx.fillText('eje recortado: X llega hasta ' + PD.n, w - pad.r, pad.t + 8); }
  }
  M.segBind('prob-pd-dist', b => { PD.d = b.dataset.d; pdSync(); });
  M.segBind('prob-pd-ov', b => { PD.ov = b.dataset.o === '1'; drawPD(); });
  $('prob-pd-n').addEventListener('input', e => { PD.n = +e.target.value; pdSync(); });
  $('prob-pd-p').addEventListener('input', e => { PD.p = +e.target.value / 100; pdSync(); });
  $('prob-pd-l').addEventListener('input', e => { PD.lam = +e.target.value / 2; pdSync(); });
  $('prob-pd-k').addEventListener('input', e => { PD.k = +e.target.value; pdSync(); });

  M.draw['prob'] = () => { drawLGN(); drawPD(); };
  M.init.push(() => { lgReset(); pdSync(); });
})();
