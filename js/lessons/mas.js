/* StatEdx · sesión mas: Muestreo aleatorio simple */
(() => {
  const { fit, tok, fmt, pct, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const miles = x => Math.round(x).toLocaleString('es').replace(/[., ]/g, ' ');

  // población fija: 5 000 gastos lognormales con semilla (se usan los primeros N)
  function seeded(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const NMAX = 5000, ALL = new Float64Array(NMAX);
  (() => { const r = seeded(2024); for (let i = 0; i < NMAX; i++) { const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); ALL[i] = Math.round(Math.exp(6.3 + 0.45 * z)); } })();

  const S = { N: 1200, n: 120, rep: 'sin', means: [], cover: 0 };
  let perm = new Int32Array(0), pop = null, Ybar = 0, S2 = 0;
  const REPS = 1000;

  function setPop() {
    pop = ALL.subarray(0, S.N);
    let s = 0; for (const v of pop) s += v; Ybar = s / S.N;
    let q = 0; for (const v of pop) q += (v - Ybar) ** 2; S2 = q / (S.N - 1);
    perm = Int32Array.from({ length: S.N }, (_, i) => i);
  }
  const seTheo = (n, rep) => rep === 'sin' ? Math.sqrt(Math.max(0, 1 - n / S.N) * S2 / n) : Math.sqrt((S.N - 1) / S.N * S2 / n);

  function simulate() {
    const n = S.n, N = S.N, z = 1.96; S.means = []; let cov = 0;
    for (let r = 0; r < REPS; r++) {
      let sum = 0, sq = 0;
      if (S.rep === 'sin') {
        // Fisher-Yates parcial sobre una permutación persistente: cada prefijo es un MAS
        for (let i = 0; i < n; i++) { const j = i + Math.floor(Math.random() * (N - i)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; const v = pop[perm[i]]; sum += v; sq += v * v; }
      } else {
        for (let i = 0; i < n; i++) { const v = pop[Math.floor(Math.random() * N)]; sum += v; sq += v * v; }
      }
      const m = sum / n, s2 = n > 1 ? (sq - n * m * m) / (n - 1) : 0;
      const v = (S.rep === 'sin' ? (1 - n / N) : 1) * s2 / n;
      if (Math.abs(m - Ybar) <= z * Math.sqrt(v) + 1e-9) cov++;
      S.means.push(m);
    }
    S.cover = cov / REPS;
    render();
  }

  function render() {
    const f = S.n / S.N, se = seTheo(S.n, S.rep);
    const k = S.means.length, m = S.means.reduce((a, b) => a + b, 0) / k;
    const sim = Math.sqrt(S.means.reduce((a, b) => a + (b - m) ** 2, 0) / (k - 1));
    $('mas-r-f').textContent = pct(f, 1);
    $('mas-r-fpc').textContent = S.rep === 'sin' ? fmt(Math.sqrt(1 - f), 3) : '1 (no aplica)';
    $('mas-r-se').textContent = fmt(se, 1);
    $('mas-r-sim').textContent = fmt(sim, 1);
    $('mas-head').textContent = `Ȳ = ${fmt(Ybar, 1)} · cobertura IC 95 %: ${pct(S.cover, 1)}`;
    drawHist(); drawSE();
  }

  function drawHist() {
    const c = fit($('mas-c-hist')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line');
    const pad = { l: 12, r: 12, t: 14, b: 26 };
    // la escala se fija con el EE con reemplazo, para que al cambiar de sorteo se vea el cambio de ancho
    const ref = seTheo(S.n, 'con'), lo = Ybar - 4.2 * ref, hi = Ybar + 4.2 * ref;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const nb = Math.max(20, Math.min(48, Math.floor((w - pad.l - pad.r) / 7))), bw = (hi - lo) / nb;
    const counts = new Array(nb).fill(0);
    for (const v of S.means) { const b = Math.floor((v - lo) / bw); if (b >= 0 && b < nb) counts[b]++; }
    const se = seTheo(S.n, S.rep);
    const dens = Math.max(...counts) / (S.means.length * bw), peak = Math.max(dens, se > 0 ? npdf(0, 0, se) : 0) * 1.08;
    const Y = d => h - pad.b - d / peak * (h - pad.t - pad.b);
    // rejilla y ticks redondos
    const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = S.rep === 'sin' ? accent : muted; ctx.globalAlpha = .7;
    for (let b = 0; b < nb; b++) if (counts[b]) { const d = counts[b] / (S.means.length * bw); ctx.fillRect(X(lo + b * bw) + .5, Y(d), Math.max(1, X(lo + (b + 1) * bw) - X(lo + b * bw) - 1), h - pad.b - Y(d)); }
    ctx.globalAlpha = 1;
    if (se > 0) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const v = lo + (hi - lo) * i / 200, y = Y(npdf(v, Ybar, se)); i ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); }
      ctx.stroke();
    }
    ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(Ybar), pad.t); ctx.lineTo(X(Ybar), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = X(v); if (x > pad.l + 12 && x < w - pad.r - 12) ctx.fillText(fmt(v, step < 1 ? 1 : 0), x, h - 8); }
  }

  function drawSE() {
    const c = fit($('mas-c-se')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line'), hot = tok('--hot'), bg = tok('--bg');
    const pad = { l: 40, r: 14, t: 14, b: 26 };
    const nHi = Math.min(S.N, 1000), nLo = 5;
    const X = n => pad.l + (n - nLo) / (nHi - nLo) * (w - pad.l - pad.r);
    const yHi = seTheo(nLo, 'con') * 0.55;          // recorta el inicio para ver bien la zona útil
    const nice = [1, 2, 5, 10, 20, 25, 50, 100].find(s => yHi / s <= 5) || 100;
    const yTop = Math.ceil(yHi / nice) * nice;
    const Y = v => h - pad.b - Math.min(v, yTop) / yTop * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = 0; v <= yTop + 1e-9; v += nice) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    for (const [rep, col, lw] of [['con', muted, 1.8], ['sin', accent, 2.6]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const n = nLo + (nHi - nLo) * i / 240, y = Y(seTheo(n, rep)); i ? ctx.lineTo(X(n), y) : ctx.moveTo(X(n), y); }
      ctx.stroke();
    }
    ctx.restore();
    // punto elegido
    const n = Math.min(S.n, nHi), x = X(n), y = Y(seTheo(n, S.rep));
    ctx.strokeStyle = hot; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = hot; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ejes
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    for (let v = 0; v <= yTop + 1e-9; v += nice) ctx.fillText(v, pad.l - 6, Math.max(Y(v) + 4, pad.t + 8));
    ctx.textAlign = 'center';
    const xs = nHi <= 200 ? 50 : nHi <= 500 ? 100 : 250;
    for (let v = xs; v <= nHi; v += xs) ctx.fillText(v, Math.min(X(v), w - pad.r - 12), h - 8);
    ctx.textAlign = 'left'; ctx.fillText('n', pad.l + 4, h - 8);
    if (nHi === S.N) { ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText('n = N', w - pad.r - 4, Y(0) - 6); }
  }

  const Nel = $('mas-N'), nel = $('mas-n');
  function syncN() {
    if (S.n > S.N) { S.n = S.N; nel.value = S.n; $('mas-n-v').textContent = miles(S.n); }
    $('mas-N-v').textContent = miles(S.N);
  }
  Nel.addEventListener('input', () => { S.N = +Nel.value; setPop(); syncN(); simulate(); });
  nel.addEventListener('input', () => { S.n = Math.min(+nel.value, S.N); if (+nel.value > S.N) nel.value = S.N; $('mas-n-v').textContent = miles(S.n); simulate(); });
  segBind('mas-rep', b => { S.rep = b.dataset.r; simulate(); });
  $('mas-again').addEventListener('click', simulate);

  M.draw['mas'] = render;
  M.init.push(() => { setPop(); simulate(); });
})();
