/* StatEdx · sesión frecuencias: Tablas de frecuencia e histogramas */
(() => {
  const { fit, tok, fmt, randn, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const CLASE = [12, 25, 8, 35, 18, 22, 45, 15, 28, 30, 19, 52, 24, 16, 38, 21, 27, 9, 33, 61, 14, 26, 40, 23, 17, 29, 48, 20, 31, 11, 36, 25, 22, 57, 18, 43, 27, 34, 13, 24];
  const S = { dat: 'clase', n: 40, rule: 'sturges', k: 7, o: 0, view: 'freq', xs: CLASE.slice() };

  // densidades verdaderas de los datos simulados (en minutos)
  const LN = { mu: Math.log(25), s: 0.45 };
  const TRUE = {
    asim: x => x > 0 ? Math.exp(-((Math.log(x) - LN.mu) ** 2) / (2 * LN.s ** 2)) / (x * LN.s * Math.sqrt(2 * Math.PI)) : 0,
    bimo: x => 0.6 * npdf(x, 20, 5) + 0.4 * npdf(x, 45, 6),
    norm: x => npdf(x, 30, 8),
  };
  const GEN = {
    asim: () => Math.exp(LN.mu + LN.s * randn()),
    bimo: () => Math.random() < 0.6 ? 20 + 5 * randn() : 45 + 6 * randn(),
    norm: () => 30 + 8 * randn(),
  };
  function sample() {
    if (S.dat === 'clase') { S.xs = CLASE.slice(); return; }
    const xs = [];
    while (xs.length < S.n) { const v = GEN[S.dat](); if (v > 0.5 && v < 99.5) xs.push(Math.round(v * 10) / 10); }
    S.xs = xs;
  }
  const q = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };

  function bins() {
    const s = S.xs.slice().sort((a, b) => a - b), n = s.length, lo = s[0], hi = s[n - 1], range = Math.max(hi - lo, 1e-6);
    let h;
    if (S.rule === 'sturges') h = range / Math.ceil(1 + Math.log2(n));
    else if (S.rule === 'scott') { const m = s.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)); h = 3.49 * sd * n ** (-1 / 3); }
    else if (S.rule === 'fd') h = 2 * (q(s, 0.75) - q(s, 0.25)) * n ** (-1 / 3);
    else if (S.rule === 'tabla') h = 10;
    else h = range / S.k;
    if (!(h > 0)) h = range;
    const start = (S.rule === 'tabla' ? Math.floor(lo / 10) * 10 : lo) - S.o / 100 * h;
    const nb = Math.max(1, Math.ceil((hi - start) / h - 1e-9) + (S.rule === 'tabla' && (hi - start) % h === 0 ? 1 : 0));
    const cnt = new Array(nb).fill(0);
    for (const v of s) cnt[Math.min(nb - 1, Math.floor((v - start) / h + 1e-9))]++;
    return { s, n, h, start, nb, cnt };
  }
  const iv = (a, b) => '[' + fmt(a, 1) + '; ' + fmt(b, 1) + ')';

  function draw() {
    const B = bins(), { s, n, h, start, nb, cnt } = B;
    if (S.rule !== 'manual') { S.k = nb; $('frecuencias-k').value = Math.min(60, nb); $('frecuencias-k-v').textContent = nb; }
    // modal y mediana agrupada
    let im = 0; cnt.forEach((c, i) => { if (c > cnt[im]) im = i; });
    let acc = 0, m = 0; while (acc + cnt[m] < n / 2) { acc += cnt[m]; m++; }
    const meg = start + m * h + (n / 2 - acc) / cnt[m] * h;
    $('frecuencias-r-h').textContent = fmt(h, 2) + ' min';
    $('frecuencias-r-mod').textContent = iv(start + im * h, start + (im + 1) * h);
    $('frecuencias-r-meg').textContent = fmt(meg, 2);
    $('frecuencias-r-me').textContent = fmt(q(s, 0.5), 2);
    const names = { tabla: 'h = 10 desde 0', sturges: 'Sturges', scott: 'Scott', fd: 'Freedman-Diaconis', manual: 'manual' };
    $('frecuencias-head').textContent = `n = ${n} · ${nb} clases · ${names[S.rule]}`;
    $('frecuencias-n').disabled = S.dat === 'clase';

    const f = fit($('frecuencias-plot')); if (!f) return; const { ctx, w, h: H } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    const mono = '11px ' + tok('--f-mono');
    ctx.clearRect(0, 0, w, H);
    const pad = { l: 46, r: 14, t: 14, b: 40 };
    const xlo = 0, xhi = Math.max(70, Math.ceil((start + nb * h) / 10) * 10);
    const X = v => pad.l + (v - xlo) / (xhi - xlo) * (w - pad.l - pad.r);
    const base = H - pad.b;
    // valores de cada barra según la vista
    let vals, ymax, fmtY;
    if (S.view === 'freq') { vals = cnt; ymax = Math.max(...cnt); fmtY = v => String(Math.round(v)); }
    else if (S.view === 'dens') {
      vals = cnt.map(c => c / n / h); ymax = Math.max(...vals);
      if (S.dat !== 'clase') for (let x = 1; x < 100; x += 0.5) ymax = Math.max(ymax, TRUE[S.dat](x));
      fmtY = v => fmt(v, 3);
    } else { let c = 0; vals = cnt.map(v => (c += v) / n); ymax = 1; fmtY = v => Math.round(v * 100) + ' %'; }
    // escala con pasos "redondos"
    const raw = ymax / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= raw);
    const ytop = S.view === 'acum' ? 1 : Math.ceil(ymax * 1.08 / step) * step;
    const ystep = S.view === 'acum' ? 0.25 : step;
    const Y = v => base - v / ytop * (base - pad.t);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = ystep; v <= ytop + 1e-9; v += ystep) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'right';
    for (let v = 0; v <= ytop + 1e-9; v += ystep) ctx.fillText(fmtY(v), pad.l - 6, Y(v) + 4);

    if (S.view !== 'acum') {
      for (let i = 0; i < nb; i++) {
        const x0 = X(start + i * h), x1 = X(start + (i + 1) * h), y = Y(vals[i]);
        ctx.fillStyle = i === im ? hot : accent; ctx.globalAlpha = .55; ctx.fillRect(x0, y, x1 - x0, base - y);
        ctx.globalAlpha = 1; ctx.strokeStyle = i === im ? hot : accent; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x0) + .5, Math.round(y) + .5, Math.max(0, Math.round(x1 - x0) - 1), base - Math.round(y));
      }
      if (S.view === 'dens' && S.dat !== 'clase') {
        ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 300; i++) { const x = xlo + (xhi - xlo) * i / 300, y = Y(TRUE[S.dat](x)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
        ctx.stroke();
      }
    } else {
      // escalera exacta (función de distribución empírica)
      ctx.strokeStyle = muted; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(xlo), Y(0));
      s.forEach((v, i) => { ctx.lineTo(X(v), Y(i / n)); ctx.lineTo(X(v), Y((i + 1) / n)); });
      ctx.lineTo(X(xhi), Y(1)); ctx.stroke();
      // ojiva
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(start), Y(0));
      vals.forEach((v, i) => ctx.lineTo(X(start + (i + 1) * h), Y(v))); ctx.stroke();
      ctx.fillStyle = accent; vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(start + (i + 1) * h), Y(v), 3.5, 0, Math.PI * 2); ctx.fill(); });
      // mediana agrupada sobre la ojiva
      ctx.strokeStyle = hot; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(pad.l, Y(0.5)); ctx.lineTo(X(meg), Y(0.5)); ctx.lineTo(X(meg), base); ctx.stroke(); ctx.setLineDash([]);
    }
    // eje y datos individuales
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, base + .5); ctx.lineTo(w - pad.r, base + .5); ctx.stroke();
    ctx.strokeStyle = muted; ctx.globalAlpha = n > 400 ? .25 : .7;
    for (const v of s) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, base + 4); ctx.lineTo(x, base + 12); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    const xs = (w - pad.l - pad.r) / (xhi - xlo) * 10 < 34 ? 20 : 10;
    for (let v = xlo; v <= xhi; v += xs) ctx.fillText(v, X(v), H - 8);
  }

  const kEl = $('frecuencias-k'), oEl = $('frecuencias-o'), nEl = $('frecuencias-n');
  const press = (id, attr, val) => document.querySelectorAll('#' + id + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === val)));
  kEl.addEventListener('input', () => { S.k = +kEl.value; S.rule = 'manual'; press('frecuencias-rule', 'r', 'manual'); $('frecuencias-k-v').textContent = S.k; draw(); });
  oEl.addEventListener('input', () => { S.o = +oEl.value; $('frecuencias-o-v').textContent = S.o; draw(); });
  nEl.addEventListener('input', () => { S.n = +nEl.value; $('frecuencias-n-v').textContent = S.n; sample(); draw(); });
  segBind('frecuencias-dat', b => {
    S.dat = b.dataset.d;
    if (S.dat === 'clase') { S.n = 40; } else if (S.n === 40) { S.n = 200; }
    nEl.value = S.n; $('frecuencias-n-v').textContent = S.n; sample(); draw();
  });
  segBind('frecuencias-rule', b => { S.rule = b.dataset.r; if (S.rule === 'manual') S.k = +kEl.value; draw(); });
  segBind('frecuencias-view', b => { S.view = b.dataset.v; draw(); });
  $('frecuencias-again').addEventListener('click', () => { sample(); draw(); });

  M.draw['frecuencias'] = draw;
  M.init.push(() => { sample(); draw(); });
})();
