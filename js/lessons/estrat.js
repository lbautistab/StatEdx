/* StatEdx · sesión estrat: Muestreo estratificado */
(() => {
  const { fit, tok, fmt, pct, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  function seeded(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const NH = [600, 300, 100], NAMES = ['Pequeñas', 'Medianas', 'Grandes'], N = 1000, W = NH.map(x => x / N);
  // desvíos estandarizados fijos en cada estrato (media 0 y S = 1 exactas)
  const Z = NH.map((n, h) => {
    const r = seeded(31 + h), z = Array.from({ length: n }, () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()));
    const m = z.reduce((a, b) => a + b, 0) / n, s = Math.sqrt(z.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
    return z.map(v => (v - m) / s);
  });
  const perms = NH.map(n => Int32Array.from({ length: n }, (_, i) => i));

  const S = { d: 30, s3: 40, n: 100, al: 'prop', est: [] };
  const mus = () => [20, 20 + S.d, 20 + S.d * 13 / 3];
  const sds = () => [5, 10, S.s3];
  const popVal = (h, i) => mus()[h] + sds()[h] * Z[h][i];

  // reparte n según pesos, con 2 ≤ n_h ≤ N_h y enteros que suman n (restos mayores)
  function allocate(kind, n) {
    const sh = sds();
    let base = kind === 'igual' ? [1, 1, 1] : kind === 'prop' ? NH.slice() : NH.map((x, h) => x * sh[h]);
    const nh = [0, 0, 0], fixed = [false, false, false];
    let left = n;
    for (let it = 0; it < 3; it++) {
      const free = [0, 1, 2].filter(h => !fixed[h]), tot = free.reduce((a, h) => a + base[h], 0);
      let changed = false;
      for (const h of free) if (left * base[h] / tot >= NH[h]) { nh[h] = NH[h]; fixed[h] = true; left -= NH[h]; changed = true; }
      if (!changed) break;
    }
    const free = [0, 1, 2].filter(h => !fixed[h]), tot = free.reduce((a, h) => a + base[h], 0);
    const raw = free.map(h => left * base[h] / tot);
    free.forEach((h, k) => nh[h] = Math.floor(raw[k]));
    let rest = left - free.reduce((a, h) => a + nh[h], 0);
    free.map((h, k) => [h, raw[k] - Math.floor(raw[k])]).sort((a, b) => b[1] - a[1]).forEach(([h]) => { if (rest > 0) { nh[h]++; rest--; } });
    for (const h of [0, 1, 2]) if (nh[h] < 2) { const d = 2 - nh[h]; nh[h] = 2; const g = [0, 1, 2].filter(k => k !== h).sort((a, b) => nh[b] - nh[a])[0]; nh[g] -= d; }
    return { nh, census: nh.map((x, h) => x >= NH[h]) };
  }
  const Vst = nh => nh.reduce((a, x, h) => a + W[h] ** 2 * (1 - x / NH[h]) * sds()[h] ** 2 / x, 0);
  function popStats() {
    const m = mus(), s = sds(), Yb = W.reduce((a, w, h) => a + w * m[h], 0);
    const S2 = (NH.reduce((a, x, h) => a + (x - 1) * s[h] ** 2 + x * (m[h] - Yb) ** 2, 0)) / (N - 1);
    return { Yb, S2 };
  }

  function simulate() {
    const { nh } = allocate(S.al, S.n);
    S.est = [];
    for (let r = 0; r < 500; r++) {
      let e = 0;
      for (let h = 0; h < 3; h++) {
        const p = perms[h], Nh = NH[h]; let sum = 0;
        for (let i = 0; i < nh[h]; i++) { const j = i + Math.floor(Math.random() * (Nh - i)); const t = p[i]; p[i] = p[j]; p[j] = t; sum += popVal(h, p[i]); }
        e += W[h] * sum / nh[h];
      }
      S.est.push(e);
    }
    render();
  }

  function render() {
    const { nh, census } = allocate(S.al, S.n), { Yb, S2 } = popStats();
    const vst = Vst(nh), vmas = (1 - S.n / N) * S2 / S.n;
    const k = S.est.length, m = S.est.reduce((a, b) => a + b, 0) / k, sim = Math.sqrt(S.est.reduce((a, b) => a + (b - m) ** 2, 0) / (k - 1));
    $('estrat-r-nh').textContent = nh.join('/');
    $('estrat-r-st').textContent = fmt(Math.sqrt(vst), 2);
    $('estrat-r-mas').textContent = fmt(Math.sqrt(vmas), 2);
    $('estrat-r-deff').textContent = fmt(vst / vmas, 3);
    $('estrat-head').textContent = `Ȳ = ${fmt(Yb, 1)} · EE simulado: ${fmt(sim, 2)}`;
    drawAlloc(nh, census); drawDist(Yb, Math.sqrt(vst), Math.sqrt(vmas));
  }

  function drawAlloc(nh, census) {
    const c = fit($('estrat-c-al')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line'), hot = tok('--hot');
    const pad = { l: 34, r: 10, t: 22, b: 40 }, top = 0.8;
    const Y = v => h - pad.b - v / top * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    for (let v = 0; v <= top + 1e-9; v += 0.2) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v * 100), pad.l - 6, y + 4); ctx.globalAlpha = .6; }
    ctx.globalAlpha = 1;
    const gw = (w - pad.l - pad.r) / 3, bw = Math.min(42, gw * 0.32);
    for (let k = 0; k < 3; k++) {
      const cx = pad.l + gw * (k + 0.5), share = nh[k] / S.n;
      ctx.fillStyle = muted; ctx.globalAlpha = .55; ctx.fillRect(cx - bw - 2, Y(W[k]), bw, h - pad.b - Y(W[k]));
      ctx.globalAlpha = .9; ctx.fillStyle = accent; ctx.fillRect(cx + 2, Y(Math.min(share, top)), bw, h - pad.b - Y(Math.min(share, top)));
      ctx.globalAlpha = 1;
      ctx.font = mono(); ctx.textAlign = 'center';
      ctx.fillStyle = muted; ctx.fillText(Math.round(W[k] * 100), cx - bw / 2 - 2, Y(W[k]) - 5);
      ctx.fillStyle = ink; ctx.font = '600 11px ' + tok('--f-mono'); ctx.fillText('n=' + nh[k], cx + bw / 2 + 2, Y(Math.min(share, top)) - 5);
      ctx.font = mono(); ctx.fillStyle = muted; ctx.fillText(NAMES[k], cx, h - pad.b + 16);
      if (census[k]) { ctx.fillStyle = hot; ctx.fillText('censo', cx, h - pad.b + 30); }
      else { ctx.fillText('S=' + sds()[k], cx, h - pad.b + 30); }
    }
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
  }

  function drawDist(Yb, sst, smas) {
    const c = fit($('estrat-c-dist')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line');
    const pad = { l: 12, r: 12, t: 14, b: 26 };
    const half = 3.6 * Math.max(smas, sst), lo = Yb - half, hi = Yb + half;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const nb = Math.max(30, Math.min(90, Math.floor((w - pad.l - pad.r) / 4))), bw = (hi - lo) / nb, counts = new Array(nb).fill(0);
    for (const v of S.est) { const b = Math.floor((v - lo) / bw); if (b >= 0 && b < nb) counts[b]++; }
    const dmax = Math.max(Math.max(...counts) / (S.est.length * bw), npdf(0, 0, sst));
    const Y = d => h - pad.b - Math.min(d, dmax * 1.05) / (dmax * 1.08) * (h - pad.t - pad.b);
    const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = .75; ctx.fillStyle = accent;
    for (let b = 0; b < nb; b++) if (counts[b]) { const d = counts[b] / (S.est.length * bw); ctx.fillRect(X(lo + b * bw), Y(d), Math.max(1, X(lo + (b + 1) * bw) - X(lo + b * bw) - .5), h - pad.b - Y(d)); }
    ctx.globalAlpha = 1;
    const curve = (s, col, lw, dash) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); for (let i = 0; i <= 300; i++) { const v = lo + (hi - lo) * i / 300, y = Y(npdf(v, Yb, s)); i ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); } ctx.stroke(); ctx.setLineDash([]); };
    curve(smas, muted, 2, [5, 4]);
    curve(sst, ink, 1.6, []);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = X(v); if (x > pad.l + 12 && x < w - pad.r - 12) ctx.fillText(fmt(v, step < 1 ? 1 : 0), x, h - 8); }
    ctx.textAlign = 'left'; ctx.fillText('┄ MAS', pad.l + 4, pad.t + 10);
  }

  const bind = (id, key, fmtv) => { const el = $(id); el.addEventListener('input', () => { S[key] = +el.value; $(id + '-v').textContent = fmtv ? fmtv(S[key]) : S[key]; simulate(); }); };
  bind('estrat-d', 'd'); bind('estrat-s3', 's3'); bind('estrat-n', 'n');
  segBind('estrat-al', b => { S.al = b.dataset.a; simulate(); });
  $('estrat-again').addEventListener('click', simulate);

  M.draw['estrat'] = render;
  M.init.push(simulate);
})();
