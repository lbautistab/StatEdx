/* StatEdx · sesión jerarq: Modelos jerárquicos */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // μ̂(τ), V_μ(τ) y log p(τ | y) con priors planos para μ y τ
  function muHat(y, s, t) { let sw = 0, swy = 0; for (let j = 0; j < y.length; j++) { const w = 1 / (s[j] * s[j] + t * t); sw += w; swy += w * y[j]; } return [swy / sw, 1 / sw]; }
  function logPost(y, s, t) {
    const [m, V] = muHat(y, s, t); let lp = 0.5 * Math.log(V);
    for (let j = 0; j < y.length; j++) { const v = s[j] * s[j] + t * t; lp += -0.5 * Math.log(v) - 0.5 * (y[j] - m) ** 2 / v; }
    return lp;
  }
  function tauGrid(y, s, hi, N) {
    const ts = [], lp = [];
    for (let i = 0; i <= N; i++) { const t = hi * i / N; ts.push(t); lp.push(logPost(y, s, t)); }
    const mx = Math.max(...lp); let tot = 0; const p = lp.map(v => { const e = Math.exp(v - mx); tot += e; return e; });
    return { ts, p: p.map(v => v / tot), dt: hi / N };
  }

  // ---------- simulador 1: ocho escuelas ----------
  const Y8 = [28, 8, -3, 7, -1, 1, 18, 12], S8 = [15, 10, 16, 11, 9, 11, 10, 18], NAMES = 'ABCDEFGH';
  const TG = tauGrid(Y8, S8, 40, 800);
  const E = { tau: 5 };
  function sync8(fromPreset) {
    $('jerarq-tau').value = E.tau; $('jerarq-tau-v').textContent = fmt(E.tau, 1);
    if (!fromPreset) document.querySelectorAll('#jerarq-pre button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.t === E.tau)));
    draw8();
  }
  $('jerarq-tau').addEventListener('input', () => { E.tau = +$('jerarq-tau').value; sync8(); });
  segBind('jerarq-pre', b => { E.tau = +b.dataset.t; sync8(true); });

  function draw8() {
    const t = E.tau, [mu] = muHat(Y8, S8, t);
    const B = S8.map(s => s * s / (s * s + t * t)), th = Y8.map((y, j) => (1 - B[j]) * y + B[j] * mu);
    let cdf = 0; TG.ts.forEach((v, i) => { if (v <= t + 1e-9) cdf += TG.p[i]; });
    $('jerarq-mu').textContent = fmt(mu, 2);
    $('jerarq-a').textContent = fmt(th[0], 1);
    $('jerarq-b').textContent = fmt(B.reduce((a, b) => a + b, 0) / 8, 2);
    $('jerarq-p').textContent = pct(cdf, 0);
    $('jerarq-head').textContent = `θⱼ ~ N(μ, ${fmt(t, 1)}²)`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let f = fit($('jerarq-c-shrink'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 22, r: 10, t: 10, b: 26 }, lo = -25, hi = 50;
      const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
      const rowH = (h - pad.t - pad.b) / 8, Yr = j => pad.t + rowH * (j + 0.5);
      const step = w < 340 ? 25 : 10;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = -20; v <= 50; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const xm = Math.round(X(mu)) + .5;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xm, pad.t); ctx.lineTo(xm, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      for (let j = 0; j < 8; j++) {
        const yy = Yr(j);
        ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.globalAlpha = .6; ctx.beginPath(); ctx.moveTo(X(Y8[j] - S8[j]), yy); ctx.lineTo(X(Y8[j] + S8[j]), yy); ctx.stroke(); ctx.globalAlpha = 1;
        // flecha y_j → θ̂_j
        const x0 = X(Y8[j]), x1 = X(th[j]);
        if (Math.abs(x1 - x0) > 6) {
          const dir = Math.sign(x1 - x0);
          ctx.strokeStyle = accent; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0 + dir * 5, yy); ctx.lineTo(x1 - dir * 5, yy); ctx.stroke();
          ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(x1 - dir * 5, yy); ctx.lineTo(x1 - dir * 10, yy - 3.5); ctx.lineTo(x1 - dir * 10, yy + 3.5); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = muted; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x0, yy, 4.2, 0, 7); ctx.stroke();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x1, yy, 4.6, 0, 7); ctx.fill();
        ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText(NAMES[j], 4, yy + 4);
      }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = -20; v <= 50; v += step) ctx.fillText(v, X(v), h - 8);
    }
    f = fit($('jerarq-c-tau'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 14, r: 14, t: 14, b: 26 };
      const X = v => pad.l + v / 40 * (w - pad.l - pad.r);
      const top = Math.max(...TG.p) * 1.1;
      const Y = p => h - pad.b - p / top * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = 0; v <= 40; v += 10) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent; ctx.globalAlpha = .26; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      TG.ts.forEach((v, i) => { if (v <= t) ctx.lineTo(X(v), Y(TG.p[i])); });
      ctx.lineTo(X(t), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      TG.ts.forEach((v, i) => { i ? ctx.lineTo(X(v), Y(TG.p[i])) : ctx.moveTo(X(v), Y(TG.p[i])); }); ctx.stroke();
      const xt = Math.round(X(t)) + .5;
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xt, pad.t); ctx.lineTo(xt, h - pad.b); ctx.stroke();
      ctx.fillStyle = hot; ctx.font = '600 11px ' + tok('--f-mono'); ctx.textAlign = t > 28 ? 'right' : 'left';
      ctx.fillText('τ = ' + fmt(t, 1), xt + (t > 28 ? -5 : 5), pad.t + 8);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = 0; v <= 40; v += 10) ctx.fillText(v, Math.min(Math.max(X(v), pad.l + 4), w - pad.r - 8), h - 8);
    }
  }

  // ---------- simulador 2: sucursales simuladas ----------
  const NJ = [2, 3, 4, 6, 8, 10, 15, 20, 30, 45, 60, 80];
  const G = { tau: 6, sig: 20, z: [], e: [] };
  function newGroups() { G.z = NJ.map(() => randn()); G.e = NJ.map(() => randn()); drawSim(); }
  $('jerarq-st').addEventListener('input', () => { G.tau = +$('jerarq-st').value; $('jerarq-st-v').textContent = G.tau; drawSim(); });
  $('jerarq-ss').addEventListener('input', () => { G.sig = +$('jerarq-ss').value; $('jerarq-ss-v').textContent = G.sig; drawSim(); });
  $('jerarq-s-new').addEventListener('click', newGroups);

  function drawSim() {
    if (!G.z.length) return;
    const truth = G.z.map(z => 50 + G.tau * z), se = NJ.map(n => G.sig / Math.sqrt(n));
    const raw = truth.map((t, j) => t + se[j] * G.e[j]);
    const tg = tauGrid(raw, se, 60, 300);
    const est = raw.map(() => 0); let muE = 0, tauE = 0;
    tg.ts.forEach((t, i) => {
      const p = tg.p[i]; if (p < 1e-12) return;
      const [m] = muHat(raw, se, t); muE += p * m; tauE += p * t;
      raw.forEach((y, j) => { const B = se[j] * se[j] / (se[j] * se[j] + t * t); est[j] += p * ((1 - B) * y + B * m); });
    });
    const mse = a => a.reduce((s, v, j) => s + (v - truth[j]) ** 2, 0) / a.length;
    const Bs = n => { const s2 = G.sig * G.sig / n; return s2 / (s2 + tauE * tauE); };
    $('jerarq-s-raw').textContent = fmt(mse(raw), 1);
    $('jerarq-s-pp').textContent = fmt(mse(est), 1);
    $('jerarq-s-tau').textContent = fmt(tauE, 1);
    $('jerarq-s-b').textContent = fmt(Bs(2), 2) + ' / ' + fmt(Bs(80), 2);
    $('jerarq-s-head').textContent = `12 sucursales · μ̂ = ${fmt(muE, 1)}`;

    const f = fit($('jerarq-c-sim')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 10, t: 12, b: 38 };
    const all = [...raw, ...truth, ...est];
    let lo = Math.min(...all), hi = Math.max(...all); const span = Math.max(10, hi - lo); lo -= span * 0.08; hi += span * 0.08;
    const X = j => pad.l + (j + 0.5) / NJ.length * (w - pad.l - pad.r);
    const Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
    const st = (hi - lo) > 80 ? 20 : (hi - lo) > 40 ? 10 : 5;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const ym = Math.round(Y(muE)) + .5;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, ym); ctx.lineTo(w - pad.r, ym); ctx.stroke(); ctx.setLineDash([]);
    const cw = (w - pad.l - pad.r) / NJ.length;
    for (let j = 0; j < NJ.length; j++) {
      const x = X(j), y0 = Y(raw[j]), y1 = Y(est[j]);
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - Math.min(9, cw * 0.35), Y(truth[j])); ctx.lineTo(x + Math.min(9, cw * 0.35), Y(truth[j])); ctx.stroke();
      if (Math.abs(y1 - y0) > 7) {
        const d = Math.sign(y1 - y0);
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y0 + d * 5); ctx.lineTo(x, y1 - d * 5); ctx.stroke();
      }
      ctx.strokeStyle = muted; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y0, 4, 0, 7); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y1, 4.4, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    NJ.forEach((n, j) => ctx.fillText(n, X(j), h - pad.b + 15));
    ctx.fillText('clientes por sucursal (n)', (pad.l + w - pad.r) / 2, h - 6);
    ctx.textAlign = 'right';
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) ctx.fillText(v, pad.l - 6, Y(v) + 4);
  }

  M.draw.jerarq = () => { draw8(); drawSim(); };
  M.init.push(() => { sync8(); newGroups(); });
})();
