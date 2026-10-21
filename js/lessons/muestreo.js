/* StatEdx · sesión muestreo: Fundamentos del muestreo */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // generador con semilla: la ciudad es siempre la misma
  function seeded(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const N = 1200, RMAX = 0.47;
  const pop = [];
  (() => {
    const r = seeded(11);
    for (let i = 0; i < N; i++) {
      const rad = RMAX * Math.pow(r(), 0.75), th = r() * Math.PI * 2;
      const p = 0.22 + 0.58 * (1 - rad / RMAX);           // más apoyo cerca de la estación
      pop.push({ x: 0.5 + rad * Math.cos(th), y: 0.5 + rad * Math.sin(th), rad, v: r() < p ? 1 : 0, cov: rad / RMAX + 0.3 * r() });
    }
  })();
  const P = pop.reduce((s, u) => s + u.v, 0) / N;
  const byCov = pop.map((_, i) => i).sort((a, b) => pop[a].cov - pop[b].cov);

  const S = { met: 'mas', n: 60, cob: 0, est: [], last: null, frame: [] };
  const inFrame = new Uint8Array(N);
  function buildFrame() {
    const k = Math.round(N * (1 - S.cob / 100));
    inFrame.fill(0); S.frame = byCov.slice(0, k); for (const i of S.frame) inFrame[i] = 1;
  }

  // muestra sin reemplazo: MAS por Fisher-Yates parcial, o ponderada (Efraimidis-Spirakis)
  function draw() {
    const fr = S.frame, n = Math.min(S.n, fr.length);
    if (S.met === 'mas') {
      const a = fr.slice();
      for (let i = 0; i < n; i++) { const j = i + Math.floor(Math.random() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, n);
    }
    const w = S.met === 'conv' ? (u => Math.exp(-u.rad / 0.09)) : (u => u.v ? 3.5 : 1);
    const keys = fr.map(i => ({ i, k: Math.log(Math.random()) / w(pop[i]) }));
    keys.sort((a, b) => b.k - a.k);
    return keys.slice(0, n).map(o => o.i);
  }
  function take(times) {
    for (let t = 0; t < times; t++) {
      const s = draw(); let sum = 0; for (const i of s) sum += pop[i].v;
      S.last = s; S.est.push(sum / s.length);
    }
    if (S.est.length > 2000) S.est.splice(0, S.est.length - 2000);
    render();
  }
  function reset(refill) { S.est = []; S.last = null; if (refill) take(200); else render(); }

  function render() {
    const k = S.est.length;
    const mean = k ? S.est.reduce((a, b) => a + b, 0) / k : NaN;
    const sd = k > 1 ? Math.sqrt(S.est.reduce((a, b) => a + (b - mean) ** 2, 0) / (k - 1)) : NaN;
    $('muestreo-r-p').textContent = pct(P, 1);
    $('muestreo-r-last').textContent = k ? pct(S.est[k - 1], 1) : '–';
    const b = (mean - P) * 100;
    $('muestreo-r-bias').textContent = k ? (Math.abs(b) < 0.05 ? '' : b < 0 ? '−' : '+') + fmt(Math.abs(b), 1) + ' pts' : '–';
    $('muestreo-r-se').textContent = k > 1 ? fmt(sd * 100, 1) + ' pts' : '–';
    $('muestreo-cnt').textContent = k + (k === 1 ? ' muestra' : ' muestras');
    $('muestreo-head').textContent = `marco: ${S.frame.length} de ${N} hogares`;
    drawMap(); drawHist(mean);
  }

  function drawMap() {
    const f = fit($('muestreo-c-map')); if (!f) return; const { ctx, w, h } = f;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), hot = tok('--hot'), ink = tok('--ink'), line = tok('--line');
    const side = Math.min(w - 16, h - 16), ox = (w - side) / 2, oy = (h - side) / 2;
    const X = v => ox + v * side, Y = v => oy + v * side;
    // borde de la ciudad
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(0.5), Y(0.5), (RMAX + 0.02) * side, 0, Math.PI * 2); ctx.stroke();
    const rr = side < 260 ? 1.7 : 2.1;
    for (let i = 0; i < N; i++) {
      const u = pop[i];
      if (!inFrame[i]) { ctx.globalAlpha = .35; ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(u.x), Y(u.y), rr, 0, Math.PI * 2); ctx.stroke(); continue; }
      ctx.globalAlpha = u.v ? .85 : .4; ctx.fillStyle = u.v ? accent : muted;
      ctx.beginPath(); ctx.arc(X(u.x), Y(u.y), rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (S.last) {
      ctx.strokeStyle = hot; ctx.lineWidth = 1.6;
      for (const i of S.last) { const u = pop[i]; ctx.beginPath(); ctx.arc(X(u.x), Y(u.y), rr + 2.4, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.fillStyle = ink; ctx.fillRect(X(0.5) - 4, Y(0.5) - 4, 8, 8);
  }

  function drawHist(mean) {
    const f = fit($('muestreo-c-hist')); if (!f) return; const { ctx, w, h } = f;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line'), hot = tok('--hot');
    const pad = { l: 12, r: 14, t: 26, b: 26 }, lo = 0, hi = 1;
    // las estimaciones son múltiplos de 1/n: cada barra agrupa m valores posibles para evitar huecos
    const n = S.n, m = Math.max(1, Math.ceil(0.02 * n)), nb = Math.floor(n / m) + 1;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const counts = new Array(nb).fill(0);
    for (const e of S.est) counts[Math.min(nb - 1, Math.floor(Math.round(e * n) / m))]++;
    const cmax = Math.max(5, ...counts);
    const Y = c => h - pad.b - c / cmax * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = 0; v <= 1.0001; v += 0.1) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent; ctx.globalAlpha = .75;
    for (let b = 0; b < nb; b++) if (counts[b]) { const x0 = X(Math.max(0, (b * m - 0.5) / n)) + .5, x1 = X(Math.min(1, (b * m + m - 0.5) / n)) - .5; ctx.fillRect(x0, Y(counts[b]), Math.max(1, x1 - x0), h - pad.b - Y(counts[b])); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = 0; v <= 1.0001; v += 0.2) ctx.fillText(fmt(v, 1), Math.min(Math.max(X(v), pad.l + 10), w - pad.r - 10), h - 8);
    // valor real y media de las estimaciones
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(P), pad.t - 4); ctx.lineTo(X(P), h - pad.b); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '600 11px ' + tok('--f-mono');
    const right = X(P) > w * 0.6; ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText('P = ' + fmt(P, 2), X(P) + (right ? -5 : 5), pad.t - 10);
    if (isFinite(mean)) {
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(mean), pad.t + 10); ctx.lineTo(X(mean), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      if (Math.abs(X(mean) - X(P)) > 40) { ctx.fillStyle = hot; ctx.textAlign = X(mean) > X(P) ? 'left' : 'right'; ctx.fillText('promedio', X(mean) + (X(mean) > X(P) ? 5 : -5), pad.t + 20); }
    }
  }

  const nEl = $('muestreo-n'), cobEl = $('muestreo-cob');
  nEl.addEventListener('input', () => { S.n = +nEl.value; $('muestreo-n-v').textContent = S.n; reset(true); });
  cobEl.addEventListener('input', () => { S.cob = +cobEl.value; $('muestreo-cob-v').textContent = S.cob + ' %'; buildFrame(); reset(true); });
  segBind('muestreo-met', b => { S.met = b.dataset.m; reset(true); });
  $('muestreo-one').addEventListener('click', () => take(1));
  $('muestreo-many').addEventListener('click', () => take(200));
  $('muestreo-reset').addEventListener('click', () => reset(false));

  M.draw['muestreo'] = render;
  M.init.push(() => { buildFrame(); take(200); });
})();
