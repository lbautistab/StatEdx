/* StatEdx · sesión conglo: Muestreo por conglomerados y por etapas */
(() => {
  const { fit, tok, fmt, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  function seeded(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const A = 40, MM = 25, N = A * MM, COLS = 8, ROWS = 5;
  // efectos fijos estandarizados: u (escuela) y e (alumno)
  const r = seeded(77), gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const U = (() => { const u = Array.from({ length: A }, gauss), m = u.reduce((a, b) => a + b, 0) / A, s = Math.sqrt(u.reduce((a, b) => a + (b - m) ** 2, 0) / (A - 1)); return u.map(v => (v - m) / s); })();
  const E = (() => {
    const e = Array.from({ length: A * MM }, gauss), m = e.reduce((a, b) => a + b, 0) / e.length, s = Math.sqrt(e.reduce((a, b) => a + (b - m) ** 2, 0) / (e.length - 1));
    return Array.from({ length: A }, (_, i) => e.slice(i * MM, (i + 1) * MM).map(v => (v - m) / s));
  })();

  const S = { rho: 0.2, a: 8, m: 25, dis: 'cl', est: [], last: null };
  const val = (i, j) => 70 + 10 * (Math.sqrt(S.rho) * U[i] + Math.sqrt(1 - S.rho) * E[i][j]);
  const flat = new Float64Array(N);
  let Yb = 70, S1 = 0, S2w = 0, Sall = 0;
  function popStats() {
    for (let i = 0; i < A; i++) for (let j = 0; j < MM; j++) flat[i * MM + j] = val(i, j);
    let s = 0; for (const v of flat) s += v; Yb = s / N;
    const cm = Array.from({ length: A }, (_, i) => { let t = 0; for (let j = 0; j < MM; j++) t += flat[i * MM + j]; return t / MM; });
    S1 = cm.reduce((q, v) => q + (v - Yb) ** 2, 0) / (A - 1);
    let w = 0; for (let i = 0; i < A; i++) for (let j = 0; j < MM; j++) w += (flat[i * MM + j] - cm[i]) ** 2; S2w = w / (A * (MM - 1));
    let t = 0; for (const v of flat) t += (v - Yb) ** 2; Sall = t / (N - 1);
  }
  const nTot = () => S.a * S.m;
  const Vmas = () => (1 - nTot() / N) * Sall / nTot();
  const Vcl = () => (1 - S.a / A) * S1 / S.a + (1 - S.m / MM) * S2w / (S.a * S.m);

  const pa = Int32Array.from({ length: A }, (_, i) => i), pm = Array.from({ length: A }, () => Int32Array.from({ length: MM }, (_, i) => i)), pall = Int32Array.from({ length: N }, (_, i) => i);
  function one() {
    const sel = [];
    if (S.dis === 'cl') {
      for (let k = 0; k < S.a; k++) { const j = k + Math.floor(Math.random() * (A - k)); const t = pa[k]; pa[k] = pa[j]; pa[j] = t; }
      let sum = 0;
      for (let k = 0; k < S.a; k++) {
        const i = pa[k], p = pm[i];
        for (let q = 0; q < S.m; q++) { const j = q + Math.floor(Math.random() * (MM - q)); const t = p[q]; p[q] = p[j]; p[j] = t; sel.push(i * MM + p[q]); sum += flat[i * MM + p[q]]; }
      }
      return { e: sum / nTot(), sel };
    }
    const n = nTot(); let sum = 0;
    for (let q = 0; q < n; q++) { const j = q + Math.floor(Math.random() * (N - q)); const t = pall[q]; pall[q] = pall[j]; pall[j] = t; sel.push(pall[q]); sum += flat[pall[q]]; }
    return { e: sum / n, sel };
  }
  function simulate() {
    S.est = [];
    for (let k = 0; k < 400; k++) { const o = one(); S.est.push(o.e); if (k === 399) S.last = new Set(o.sel); }
    render();
  }

  function render() {
    const vd = S.dis === 'cl' ? Vcl() : Vmas(), deff = vd / Vmas();
    const k = S.est.length, m = S.est.reduce((a, b) => a + b, 0) / k, sim = Math.sqrt(S.est.reduce((a, b) => a + (b - m) ** 2, 0) / (k - 1));
    $('conglo-r-n').textContent = nTot();
    $('conglo-r-deff').textContent = fmt(deff, 2);
    $('conglo-r-nef').textContent = Math.round(nTot() / deff);
    $('conglo-r-se').textContent = fmt(sim, 2);
    $('conglo-head').textContent = `EE de un MAS con n = ${nTot()}: ${fmt(Math.sqrt(Vmas()), 2)}`;
    drawMap(); drawDist(Math.sqrt(vd));
  }

  function drawMap() {
    const c = fit($('conglo-c-map')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), line = tok('--line'), muted = tok('--muted');
    const gap = 5, padx = 8, pady = 8;
    const cw = (w - 2 * padx - (COLS - 1) * gap) / COLS, ch = (h - 2 * pady - (ROWS - 1) * gap) / ROWS;
    const means = Array.from({ length: A }, (_, i) => { let t = 0; for (let j = 0; j < MM; j++) t += flat[i * MM + j]; return t / MM; });
    for (let i = 0; i < A; i++) {
      const x0 = padx + (i % COLS) * (cw + gap), y0 = pady + Math.floor(i / COLS) * (ch + gap);
      // tono según la media de la escuela (de 55 a 85 puntos)
      const t = Math.min(1, Math.max(0, (means[i] - 58) / 24));
      ctx.fillStyle = accent; ctx.globalAlpha = 0.08 + 0.5 * t; ctx.fillRect(x0, y0, cw, ch); ctx.globalAlpha = 1;
      let any = false;
      const dx = cw / 5, dy = ch / 5, rr = Math.max(1.3, Math.min(dx, dy) * 0.22);
      for (let j = 0; j < MM; j++) {
        const on = S.last && S.last.has(i * MM + j); if (on) any = true;
        const px = x0 + dx * (j % 5 + 0.5), py = y0 + dy * (Math.floor(j / 5) + 0.5);
        ctx.fillStyle = on ? hot : ink; ctx.globalAlpha = on ? 1 : 0.28;
        ctx.beginPath(); ctx.arc(px, py, on ? rr * 1.35 : rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = any ? hot : line; ctx.lineWidth = any ? 1.6 : 1; ctx.strokeRect(x0 + .5, y0 + .5, cw - 1, ch - 1);
    }
    void muted;
  }

  function drawDist(sd) {
    const c = fit($('conglo-c-dist')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line');
    const pad = { l: 12, r: 12, t: 16, b: 26 };
    const smas = Math.sqrt(Vmas()), half = 4 * Math.max(sd, smas, 0.05), lo = Yb - half, hi = Yb + half;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const nb = Math.max(24, Math.min(60, Math.floor((w - pad.l - pad.r) / 6))), bw = (hi - lo) / nb, counts = new Array(nb).fill(0);
    for (const v of S.est) { const b = Math.floor((v - lo) / bw); if (b >= 0 && b < nb) counts[b]++; }
    const dmax = Math.max(Math.max(...counts) / (S.est.length * bw), npdf(0, 0, smas), npdf(0, 0, sd)) * 1.08;
    const Y = d => h - pad.b - d / dmax * (h - pad.t - pad.b);
    const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = .75; ctx.fillStyle = accent;
    for (let b = 0; b < nb; b++) if (counts[b]) { const d = counts[b] / (S.est.length * bw); ctx.fillRect(X(lo + b * bw), Y(d), Math.max(1, X(lo + (b + 1) * bw) - X(lo + b * bw) - 1), h - pad.b - Y(d)); }
    ctx.globalAlpha = 1;
    const curve = (s, col, lw, dash) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); for (let i = 0; i <= 300; i++) { const v = lo + (hi - lo) * i / 300, y = Y(npdf(v, Yb, s)); i ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); } ctx.stroke(); ctx.setLineDash([]); };
    curve(smas, muted, 2, [5, 4]);
    curve(sd, ink, 1.6, []);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = X(v); if (x > pad.l + 12 && x < w - pad.r - 12) ctx.fillText(fmt(v, step < 1 ? 1 : 0), x, h - 8); }
    ctx.textAlign = 'left'; ctx.fillText('┄ MAS', pad.l + 4, pad.t + 8);
  }

  const rhoEl = $('conglo-rho'), aEl = $('conglo-a'), mEl = $('conglo-m');
  rhoEl.addEventListener('input', () => { S.rho = +rhoEl.value; $('conglo-rho-v').textContent = fmt(S.rho, 2); popStats(); simulate(); });
  aEl.addEventListener('input', () => { S.a = +aEl.value; $('conglo-a-v').textContent = S.a; simulate(); });
  mEl.addEventListener('input', () => { S.m = +mEl.value; $('conglo-m-v').textContent = S.m; simulate(); });
  segBind('conglo-dis', b => { S.dis = b.dataset.d; simulate(); });
  $('conglo-again').addEventListener('click', simulate);

  M.draw['conglo'] = render;
  M.init.push(() => { popStats(); simulate(); });
})();
