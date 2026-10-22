/* StatEdx · sesión mcmc: Métodos MCMC: Metropolis-Hastings y Gibbs */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // autocorrelación y ESS de una serie (suma truncada cuando ρk < 0,05)
  function acf(x, maxLag) {
    const n = x.length; let m = 0; for (const v of x) m += v; m /= n;
    let v0 = 0; for (const v of x) v0 += (v - m) ** 2;
    const out = [1];
    for (let k = 1; k <= maxLag && k < n; k++) { let s = 0; for (let i = 0; i + k < n; i++) s += (x[i] - m) * (x[i + k] - m); out.push(v0 ? s / v0 : 0); }
    return out;
  }
  function ess(x) {
    if (x.length < 10) return x.length;
    const r = acf(x, Math.min(x.length - 1, 600)); let s = 0;
    for (let k = 1; k < r.length; k++) { if (r[k] < 0.05) break; s += r[k]; }
    return x.length / (1 + 2 * s);
  }
  const thin = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // ---------- simulador 1: MCMC en 2D ----------
  const C = { alg: 'mh', step: 1, rho: 0.7, t1: [], t2: [], path: [], rej: [], acc: 0, prop: 0, running: false, essV: null, frame: 0 };
  const MAXIT = 6000;
  const logp = (x, y) => -(x * x - 2 * C.rho * x * y + y * y) / (2 * (1 - C.rho * C.rho));
  function reset() { C.t1 = [-3]; C.t2 = [3]; C.path = [[-3, 3]]; C.rej = []; C.acc = 0; C.prop = 0; C.essV = null; }
  function step() {
    const n = C.t1.length, x = C.t1[n - 1], y = C.t2[n - 1];
    if (C.alg === 'mh') {
      const px = x + C.step * randn(), py = y + C.step * randn();
      C.prop++;
      if (Math.log(Math.random()) < logp(px, py) - logp(x, y)) { C.acc++; C.t1.push(px); C.t2.push(py); C.path.push([px, py]); }
      else { C.t1.push(x); C.t2.push(y); C.rej.push([px, py]); if (C.rej.length > 40) C.rej.shift(); }
    } else {
      const s = Math.sqrt(1 - C.rho * C.rho);
      const nx = C.rho * y + s * randn(); C.path.push([nx, y]);
      const ny = C.rho * nx + s * randn(); C.path.push([nx, ny]);
      C.t1.push(nx); C.t2.push(ny); C.prop++; C.acc++;
    }
    if (C.path.length > 400) C.path.splice(0, C.path.length - 400);
  }
  function burn() { const n = C.t1.length; return Math.min(200, Math.floor(n / 2)); }
  function updEss() { const b = burn(), x = C.t1.slice(b); C.essV = x.length > 20 ? ess(x) / x.length * 100 : null; }
  function loop() {
    if (!C.running) return;
    if (M.current !== 'mcmc' || C.t1.length >= MAXIT) { setRun(false); updEss(); drawChain(); return; }
    for (let i = 0; i < 4; i++) step();
    if (++C.frame % 12 === 0) updEss();
    drawChain();
    requestAnimationFrame(loop);
  }
  function setRun(on) { C.running = on; $('mcmc-run').textContent = on ? 'Pausar' : 'Iniciar'; if (on) requestAnimationFrame(loop); }
  $('mcmc-run').addEventListener('click', () => { if (!C.running && C.t1.length >= MAXIT) reset(); setRun(!C.running); });
  $('mcmc-reset').addEventListener('click', () => { reset(); drawChain(); setRun(true); });
  segBind('mcmc-alg', b => { C.alg = b.dataset.a; $('mcmc-step').disabled = C.alg === 'gibbs'; reset(); drawChain(); setRun(true); });
  $('mcmc-step').addEventListener('input', () => { C.step = +$('mcmc-step').value; $('mcmc-step-v').textContent = fmt(C.step, 2); reset(); drawChain(); if (!C.running) setRun(true); });
  $('mcmc-rho').addEventListener('input', () => { C.rho = +$('mcmc-rho').value; $('mcmc-rho-v').textContent = fmt(C.rho, 2); reset(); drawChain(); if (!C.running) setRun(true); });

  function drawChain() {
    const n = C.t1.length, b = burn();
    let m = 0; for (let i = b; i < n; i++) m += C.t1[i]; m /= Math.max(1, n - b);
    $('mcmc-it').textContent = thin(n - 1);
    $('mcmc-acc').textContent = C.prop ? pct(C.acc / C.prop, 1) : '–';
    $('mcmc-mean').textContent = n - b > 5 ? fmt(m, 2) : '–';
    $('mcmc-ess').textContent = C.essV == null ? '–' : fmt(C.essV, 1);
    $('mcmc-head').textContent = C.alg === 'mh' ? `Metropolis · δ = ${fmt(C.step, 2)} · ρ = ${fmt(C.rho, 2)}` : `Gibbs · ρ = ${fmt(C.rho, 2)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // recorrido
    let f = fit($('mcmc-c-path'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = 22, side = Math.min(w, h) - 2 * pad, ox = (w - side) / 2, oy = (h - side) / 2, R = 4;
      const X = v => ox + (v + R) / (2 * R) * side, Y = v => oy + side - (v + R) / (2 * R) * side;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = -4; v <= 4; v += 2) { ctx.beginPath(); ctx.moveTo(X(v), Y(-R)); ctx.lineTo(X(v), Y(R)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(-R), Y(v)); ctx.lineTo(X(R), Y(v)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, side, side); ctx.clip();
      const s = Math.sqrt(1 - C.rho * C.rho);
      for (const c of [1, 2, 3]) {
        ctx.strokeStyle = ink; ctx.globalAlpha = .55 - c * .1; ctx.lineWidth = 1.3; ctx.beginPath();
        for (let i = 0; i <= 100; i++) { const t = 2 * Math.PI * i / 100, u = Math.cos(t), v = Math.sin(t); const px = c * u, py = c * (C.rho * u + s * v); i ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py)); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // nube de todas las muestras
      ctx.fillStyle = accent; ctx.globalAlpha = .18;
      for (let i = 0; i < n; i++) ctx.fillRect(X(C.t1[i]) - 1, Y(C.t2[i]) - 1, 2, 2);
      // camino reciente
      ctx.globalAlpha = 1; ctx.strokeStyle = accent; ctx.lineWidth = 1.2; ctx.beginPath();
      C.path.forEach(([x, y], i) => { i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }); ctx.stroke();
      // rechazos recientes
      ctx.strokeStyle = hot; ctx.lineWidth = 1.4; ctx.globalAlpha = .8;
      for (const [x, y] of C.rej.slice(-15)) { const a = X(x), bb = Y(y); ctx.beginPath(); ctx.moveTo(a - 3, bb - 3); ctx.lineTo(a + 3, bb + 3); ctx.moveTo(a + 3, bb - 3); ctx.lineTo(a - 3, bb + 3); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // posición actual
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(C.t1[n - 1]), Y(C.t2[n - 1]), 4.5, 0, 7); ctx.fill();
      ctx.restore();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (const v of [-4, 0, 4]) ctx.fillText(v, X(v), oy + side + 14);
      ctx.textAlign = 'right';
      for (const v of [-4, 0, 4]) ctx.fillText(v, ox - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('θ₁', ox + side - 14, oy + side - 6); ctx.fillText('θ₂', ox + 4, oy + 12);
    }
    // traza
    f = fit($('mcmc-c-trace'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 30, r: 10, t: 10, b: 24 }, K = 400, start = Math.max(0, n - K);
      const X = i => pad.l + (i - start) / (K - 1) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (Math.max(-4, Math.min(4, v)) + 4) / 8 * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = -4; v <= 4; v += 2) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (start < b) { ctx.fillStyle = muted; ctx.globalAlpha = .12; ctx.fillRect(X(start), pad.t, X(Math.min(b, n - 1)) - X(start), h - pad.t - pad.b); ctx.globalAlpha = 1; }
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 1.3; ctx.beginPath();
      for (let i = start; i < n; i++) { i > start ? ctx.lineTo(X(i), Y(C.t1[i])) : ctx.moveTo(X(i), Y(C.t1[i])); }
      ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (let v = -4; v <= 4; v += 2) ctx.fillText(v, pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('iter. ' + thin(start), pad.l, h - 8);
      ctx.textAlign = 'right'; ctx.fillText(thin(Math.max(n - 1, 0)), w - pad.r, h - 8);
    }
  }

  // ---------- simulador 2: cuatro cadenas y R̂ ----------
  const D = { tg: 'norm', d: 0.2, n: 200, ch: [], acc: 0 };
  const STARTS = [-8, -3, 3, 8];
  const lt = x => D.tg === 'norm' ? -x * x / 2 : Math.log(Math.exp(-((x + 3) ** 2) / (2 * 0.49)) + Math.exp(-((x - 3) ** 2) / (2 * 0.49)) + 1e-300);
  function runChains() {
    D.ch = []; let acc = 0;
    for (const s0 of STARTS) {
      const c = [s0]; let x = s0, lx = lt(x);
      for (let i = 1; i < D.n; i++) { const p = x + D.d * randn(), lp = lt(p); if (Math.log(Math.random()) < lp - lx) { x = p; lx = lp; acc++; } c.push(x); }
      D.ch.push(c);
    }
    D.acc = acc / (4 * (D.n - 1));
    drawChains();
  }
  segBind('mcmc-tg', b => { D.tg = b.dataset.t; runChains(); });
  segBind('mcmc-ni', b => { D.n = +b.dataset.n; runChains(); });
  $('mcmc-d2').addEventListener('input', () => { D.d = +$('mcmc-d2').value; $('mcmc-d2-v').textContent = fmt(D.d, 2); runChains(); });
  $('mcmc-rh-new').addEventListener('click', runChains);

  function drawChains() {
    if (!D.ch.length) return;
    const half = Math.floor(D.n / 2), post = D.ch.map(c => c.slice(half)), nn = post[0].length;
    const means = post.map(c => c.reduce((s, v) => s + v, 0) / nn), gm = means.reduce((s, v) => s + v, 0) / 4;
    const W = post.map((c, j) => c.reduce((s, v) => s + (v - means[j]) ** 2, 0) / (nn - 1)).reduce((s, v) => s + v, 0) / 4;
    const B = nn * means.reduce((s, v) => s + (v - gm) ** 2, 0) / 3;
    const rh = Math.sqrt(((nn - 1) / nn * W + B / nn) / Math.max(W, 1e-12));
    const essT = post.reduce((s, c) => s + ess(c), 0);
    const acfs = post.map(c => acf(c, 40)), mac = acfs[0].map((_, k) => acfs.reduce((s, a) => s + (a[k] || 0), 0) / 4);
    $('mcmc-rh').textContent = rh > 99 ? '> 99' : fmt(rh, rh < 1.1 ? 3 : 2);
    $('mcmc-rh').style.color = rh < 1.01 ? 'var(--ok)' : rh > 1.1 ? 'var(--bad)' : '';
    $('mcmc-rh-ess').textContent = thin(essT);
    $('mcmc-rh-acc').textContent = pct(D.acc, 1);
    $('mcmc-rh-r1').textContent = fmt(mac[1], 3);
    $('mcmc-rh-head').textContent = `4 × ${thin(D.n)} iteraciones`;
    const cols = ['--accent', '--hot', '--r-mod', '--r-ds'].map(tok), muted = tok('--muted'), line = tok('--line'), ink = tok('--ink');

    let f = fit($('mcmc-c-chains'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 30, r: 10, t: 10, b: 24 }, R = 9;
      const X = i => pad.l + i / (D.n - 1) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (Math.max(-R, Math.min(R, v)) + R) / (2 * R) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = -8; v <= 8; v += 4) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = .12; ctx.fillStyle = muted; ctx.fillRect(pad.l, pad.t, X(half) - pad.l, h - pad.t - pad.b);
      ctx.globalAlpha = 1;
      const stride = Math.max(1, Math.floor(D.n / 800));
      D.ch.forEach((c, j) => {
        ctx.strokeStyle = cols[j]; ctx.lineWidth = 1.1; ctx.globalAlpha = .85; ctx.beginPath();
        for (let i = 0; i < c.length; i += stride) { i ? ctx.lineTo(X(i), Y(c[i])) : ctx.moveTo(X(i), Y(c[i])); }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (let v = -8; v <= 8; v += 4) ctx.fillText(v, pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillText('0', pad.l, h - 8);
      ctx.textAlign = 'right'; ctx.fillText(thin(D.n), w - pad.r, h - 8);
    }
    f = fit($('mcmc-c-acf'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 10, t: 10, b: 24 }, L = mac.length - 1;
      const X = k => pad.l + (k + 0.5) / (L + 1) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (Math.max(-0.2, Math.min(1, v)) + 0.2) / 1.2 * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (const v of [0, 0.5, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const bw = Math.max(1.5, (w - pad.l - pad.r) / (L + 1) * 0.6);
      mac.forEach((v, k) => { ctx.fillStyle = cols[0]; ctx.globalAlpha = .75; const y0 = Y(0), y1 = Y(v); ctx.fillRect(X(k) - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(0.05)); ctx.lineTo(w - pad.r, Y(0.05)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (const v of [0, 0.5, 1]) ctx.fillText(fmt(v, 1), pad.l - 6, Y(v) + 4);
      ctx.textAlign = 'center';
      for (const k of [0, 10, 20, 30, 40]) if (k <= L) ctx.fillText(k, X(k), h - 8);
    }
  }

  M.draw.mcmc = () => { drawChain(); drawChains(); };
  M.init.push(() => { reset(); for (let i = 0; i < 300; i++) step(); updEss(); drawChain(); runChains(); });
})();
