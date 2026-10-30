/* StatEdx · sesión normal: La distribución normal */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);

  // ---------- laboratorio 1: área bajo la normal ----------
  const NM = { mu: 170, sd: 8, a: 162, b: 178, k: 1 };
  const nmEls = ['mu', 'sd', 'a', 'b'].reduce((o, k) => (o[k] = $('normal-' + k), o), {});
  function nmSync() {
    if (NM.k) { NM.a = Math.round(NM.mu - NM.k * NM.sd); NM.b = Math.round(NM.mu + NM.k * NM.sd); }
    for (const k of ['mu', 'sd', 'a', 'b']) { nmEls[k].value = NM[k]; $('normal-' + k + '-v').textContent = NM[k]; }
    drawNormal();
  }
  nmEls.mu.addEventListener('input', () => { NM.mu = +nmEls.mu.value; nmSync(); });
  nmEls.sd.addEventListener('input', () => { NM.sd = +nmEls.sd.value; nmSync(); });
  const nmFree = () => { NM.k = 0; document.querySelectorAll('#normal-pre button').forEach(x => x.setAttribute('aria-pressed', 'false')); };
  nmEls.a.addEventListener('input', () => { nmFree(); NM.a = +nmEls.a.value; if (NM.a > NM.b) NM.b = NM.a; nmSync(); });
  nmEls.b.addEventListener('input', () => { nmFree(); NM.b = +nmEls.b.value; if (NM.b < NM.a) NM.a = NM.b; nmSync(); });
  segBind('normal-pre', b => { NM.k = +b.dataset.k; nmSync(); });
  function drawNormal() {
    const za = (NM.a - NM.mu) / NM.sd, zb = (NM.b - NM.mu) / NM.sd, p = Phi(zb) - Phi(za);
    $('normal-p').textContent = pct(p, 2);
    $('normal-za').textContent = fmt(za, 2);
    $('normal-zb').textContent = fmt(zb, 2);
    $('normal-out').textContent = pct(1 - p, 2);
    $('normal-head').textContent = `X ~ N(${NM.mu}, ${NM.sd}²)`;
    const f = fit($('normal-c-curve')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 12, r: 12, t: 30, b: 26 }, lo = 130, hi = 210;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const peak = npdf(0, 0, 3);
    const Y = d => h - pad.b - d / peak * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let v = 130; v <= 210; v += 10) { const x = Math.round(X(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent; ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(X(NM.a), Y(0));
    for (let i = 0; i <= 120; i++) { const x = NM.a + (NM.b - NM.a) * i / 120; ctx.lineTo(X(x), Y(npdf(x, NM.mu, NM.sd))); }
    ctx.lineTo(X(NM.b), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let k = -3; k <= 3; k++) { const v = NM.mu + k * NM.sd; if (v < lo || v > hi) continue; const x = Math.round(X(v)) + .5;
      ctx.strokeStyle = k ? line : ink; ctx.setLineDash(k ? [2, 3] : [3, 3]); ctx.beginPath(); ctx.moveTo(x, Y(npdf(v, NM.mu, NM.sd))); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText(k ? (k > 0 ? '+' : '−') + Math.abs(k) + 'σ' : 'μ', x, pad.t - 12); }
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const x = lo + (hi - lo) * i / 300; const y = Y(npdf(x, NM.mu, NM.sd)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
    ctx.stroke();
    for (const v of [NM.a, NM.b]) { ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(v), Y(npdf(v, NM.mu, NM.sd))); ctx.lineTo(X(v), h - pad.b); ctx.stroke(); }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, 130, 210, w < 480 ? 20 : 10, h - 8, muted);
    const mid = (NM.a + NM.b) / 2; ctx.fillStyle = ink; ctx.font = '600 14px ' + tok('--f-mono');
    if (NM.b - NM.a > 4) ctx.fillText(pct(p, 1), X(mid), Math.min(Y(npdf(mid, NM.mu, NM.sd)) + (h - pad.b - Y(npdf(mid, NM.mu, NM.sd))) * 0.55, h - pad.b - 10));
  }

  // ---------- laboratorio 2: ¿son normales mis datos? histograma y Q-Q ----------
  // cuantil normal estándar (aproximación racional de Acklam, error < 1e-9)
  function qnorm(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const QQ = { d: 'nor', n: 200, x: [] };
  const gens = {
    nor: () => randn(),
    log: () => Math.exp(0.6 * randn()),
    t3: () => { const z = randn(); const c = randn() ** 2 + randn() ** 2 + randn() ** 2; return z / Math.sqrt(c / 3); },
    uni: () => Math.random(),
  };
  const heads = { nor: 'datos ~ N(0, 1)', log: 'datos ~ lognormal (asimétrica)', t3: 'datos ~ t con 3 gl (colas pesadas)', uni: 'datos ~ U(0, 1) (colas cortas)' };
  function qqSample() { const g = gens[QQ.d]; QQ.x = Array.from({ length: QQ.n }, g); drawQQ(); }
  segBind('normal-qq-dist', b => { QQ.d = b.dataset.d; qqSample(); });
  $('normal-qq-n').addEventListener('input', e => { QQ.n = +e.target.value; $('normal-qq-n-v').textContent = QQ.n; qqSample(); });
  $('normal-qq-new').addEventListener('click', qqSample);
  function drawQQ() {
    const x = QQ.x, n = x.length; if (!n) return;
    const m = x.reduce((s, v) => s + v, 0) / n;
    const s = Math.sqrt(x.reduce((t, v) => t + (v - m) ** 2, 0) / (n - 1));
    const z = x.map(v => (v - m) / s).sort((p, q) => p - q);
    const in1 = z.filter(v => Math.abs(v) < 1).length / n, in2 = z.filter(v => Math.abs(v) < 2).length / n;
    const sk = z.reduce((t, v) => t + v ** 3, 0) / n, ku = z.reduce((t, v) => t + v ** 4, 0) / n - 3;
    $('normal-qq-in1').textContent = pct(in1, 1);
    $('normal-qq-in2').textContent = pct(in2, 1);
    $('normal-qq-sk').textContent = fmt(sk, 2);
    $('normal-qq-ku').textContent = fmt(ku, 2);
    $('normal-qq-head').textContent = heads[QQ.d];
    const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), hot = tok('--hot');
    const mono = '11px ' + tok('--f-mono');
    // histograma de los datos estandarizados con la normal estándar encima
    let f = fit($('normal-c-hist'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 12, b: 24 }, lo = -4, hi = 4, nb = 32, bw = (hi - lo) / nb;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const cnt = new Array(nb).fill(0); z.forEach(v => { const i = Math.floor((v - lo) / bw); if (i >= 0 && i < nb) cnt[i]++; });
      const dens = cnt.map(c => c / (n * bw)); const top = Math.max(0.5, ...dens) * 1.08;
      const Y = d => h - pad.b - d / top * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let v = lo; v <= hi; v++) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      ctx.fillStyle = accent; ctx.globalAlpha = .55;
      dens.forEach((d, i) => { const x0 = X(lo + i * bw), x1 = X(lo + (i + 1) * bw); ctx.fillRect(x0 + 1, Y(d), Math.max(1, x1 - x0 - 2), h - pad.b - Y(d)); });
      ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const v = lo + (hi - lo) * i / 200; const yy = Y(npdf(v, 0, 1)); i ? ctx.lineTo(X(v), yy) : ctx.moveTo(X(v), yy); }
      ctx.stroke();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, -4, 4, w < 480 ? 2 : 1, h - 7, muted);
    }
    // gráfico Q-Q normal
    f = fit($('normal-c-qq'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 12, b: 30 }, lo = -4, hi = 4;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (let v = lo; v <= hi; v += 2) {
        ctx.beginPath(); ctx.moveTo(Math.round(X(v)) + .5, pad.t); ctx.lineTo(Math.round(X(v)) + .5, h - pad.b); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(v)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(v)) + .5); ctx.stroke();
      }
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(lo), Y(lo)); ctx.lineTo(X(hi), Y(hi)); ctx.stroke(); ctx.setLineDash([]);
      const r = n > 400 ? 2 : 3;
      z.forEach((v, i) => {
        const tq = qnorm((i + 0.5) / n); const vv = Math.max(lo, Math.min(hi, v));
        ctx.fillStyle = Math.abs(v - tq) > 0.5 ? hot : accent; ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.arc(X(tq), Y(vv), r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      axisTicks(ctx, X, -4, 4, 2, h - 14, muted);
      ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'right';
      for (let v = lo; v <= hi; v += 2) ctx.fillText(v, pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'center'; ctx.fillText('cuantil teórico N(0, 1)', (pad.l + w - pad.r) / 2, h - 1);
      ctx.save(); ctx.translate(10, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('dato estandarizado', 0, 0); ctx.restore();
    }
  }

  M.draw.normal = () => { drawNormal(); drawQQ(); };
  M.init.push(() => { nmSync(); qqSample(); });
})();
