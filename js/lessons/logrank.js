/* StatEdx · sesión logrank: Comparar grupos: prueba log-rank */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + tok('--f-mono');
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const L0 = 0.08, TMAX = 30;
  const LR = { sc: 'ph', w: 'lr', hr: 0.6, n: 100, seed: 21, data: [], res: null, power: null };

  // riesgo por tramos del grupo nuevo: [corte, riesgo antes, riesgo después]
  function pieces() {
    if (LR.sc === 'ph') return [Infinity, L0 * LR.hr, L0 * LR.hr];
    if (LR.sc === 'cross') return [6, L0 / LR.hr, L0 * LR.hr];
    return [8, L0, L0 * LR.hr];
  }
  function sample(r, n) {
    const [c, a, b] = pieces(), out = [];
    for (let g = 0; g < 2; g++) for (let i = 0; i < n; i++) {
      const E = -Math.log(1 - r());
      let T;
      if (g === 0) T = E / L0;
      else T = E < a * c ? E / a : c + (E - a * c) / b;
      const C = 12 + (TMAX - 12) * r();          // censura administrativa entre 12 y 30 meses
      out.push({ y: Math.min(T, C), d: T <= C ? 1 : 0, g });
    }
    return out.sort((u, v) => u.y - v.y || v.d - u.d);
  }
  // log-rank (o Fleming-Harrington 1,0) con la trayectoria acumulada de O − E
  function test(data, w, keepPath) {
    let n = [0, 0]; for (const s of data) n[s.g]++;
    let i = 0, U = 0, V = 0, O1 = 0, E1 = 0, Sp = 1; const path = keepPath ? [{ t: 0, u: 0, v: 0 }] : null;
    while (i < data.length) {
      const t = data[i].y; let d = [0, 0], c = [0, 0];
      while (i < data.length && data[i].y === t) { const s = data[i]; s.d ? d[s.g]++ : c[s.g]++; i++; }
      const dj = d[0] + d[1], nj = n[0] + n[1];
      if (dj) {
        const p = n[1] / nj, e = dj * p, v = nj > 1 ? dj * p * (1 - p) * (nj - dj) / (nj - 1) : 0;
        const wt = w === 'peto' ? Sp : 1;
        U += wt * (d[1] - e); V += wt * wt * v; O1 += d[1]; E1 += e;
        Sp *= 1 - dj / nj;
        if (path) path.push({ t, u: U, v: V });
      }
      n[0] -= d[0] + c[0]; n[1] -= d[1] + c[1];
    }
    const D = data.reduce((a, s) => a + s.d, 0);
    const chi = V > 0 ? U * U / V : 0;
    return { chi, p: 2 * (1 - Phi(Math.sqrt(chi))), O1, E1, O0: D - O1, E0: D - E1, path };
  }
  function km(data, g) {
    let n = data.filter(s => s.g === g).length, S = 1, i = 0; const pts = [[0, 1]];
    const sub = data.filter(s => s.g === g);
    while (i < sub.length) {
      const t = sub[i].y; let d = 0, c = 0;
      while (i < sub.length && sub[i].y === t) { sub[i].d ? d++ : c++; i++; }
      if (d) { S *= 1 - d / n; pts.push([t, S]); }
      n -= d + c;
    }
    pts.push([sub.length ? sub[sub.length - 1].y : 0, S]);
    return pts;
  }
  function lrSync(regen) {
    if (regen) { LR.data = sample(rng(LR.seed), LR.n); LR.power = null; }
    LR.res = test(LR.data, LR.w, true);
    $('logrank-hr-v').textContent = fmt(LR.hr, 2);
    $('logrank-n-v').textContent = LR.n;
    $('logrank-chi').textContent = fmt(LR.res.chi, 2);
    const p = LR.res.p;
    $('logrank-p').textContent = p < 0.001 ? '< 0,001' : fmt(p, 3);
    const hr = (LR.res.O1 / LR.res.E1) / (LR.res.O0 / LR.res.E0);
    $('logrank-hrhat').textContent = isFinite(hr) ? fmt(hr, 2) : '–';
    $('logrank-pw').textContent = LR.power == null ? 'pulsa el botón' : pct(LR.power, 0);
    const nm = { ph: 'proporcional', cross: 'se cruzan en 6 m', late: 'efecto desde 8 m' }[LR.sc];
    $('logrank-head').textContent = `${nm} · O/E nuevo = ${Math.round(LR.res.O1)}/${fmt(LR.res.E1, 1)}`;
    drawLR();
  }
  $('logrank-hr').addEventListener('input', e => { LR.hr = +e.target.value; lrSync(true); });
  $('logrank-n').addEventListener('input', e => { LR.n = +e.target.value; lrSync(true); });
  segBind('logrank-sc', b => { LR.sc = b.dataset.s; lrSync(true); });
  segBind('logrank-w', b => { LR.w = b.dataset.w; LR.power = null; lrSync(false); });
  $('logrank-new').addEventListener('click', () => { LR.seed = (LR.seed * 7919 + 31) % 100003; lrSync(true); });
  $('logrank-pow').addEventListener('click', () => {
    const r = rng(LR.seed * 13 + 7); let rej = 0;
    for (let k = 0; k < 200; k++) if (test(sample(r, LR.n), LR.w, false).chi > 3.8415) rej++;
    LR.power = rej / 200; lrSync(false);
  });

  function drawLR() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    const pad = { l: 44, r: 14, t: 12, b: 30 };
    let f = fit($('logrank-c-km'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const X = v => pad.l + v / TMAX * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.lineWidth = 1;
      for (let v = 0; v <= TMAX; v += 6) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      for (const v of [0, .25, .5, .75, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 6, Y(v) + 4);
      // curvas reales (tenues)
      const [c, a, b] = pieces();
      const Sn = t => Math.exp(-(t < c ? a * t : a * c + b * (t - c)));
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.globalAlpha = .55;
      for (const [col, S] of [[accent, t => Math.exp(-L0 * t)], [hot, Sn]]) {
        ctx.strokeStyle = col; ctx.beginPath();
        for (let i = 0; i <= 150; i++) { const t = TMAX * i / 150; i ? ctx.lineTo(X(t), Y(S(t))) : ctx.moveTo(X(t), Y(S(t))); }
        ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      for (const [g, col] of [[0, accent], [1, hot]]) {
        const pts = km(LR.data, g); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(1));
        let S = 1; for (let i = 1; i < pts.length; i++) { ctx.lineTo(X(pts[i][0]), Y(S)); S = pts[i][1]; ctx.lineTo(X(pts[i][0]), Y(S)); }
        ctx.stroke();
      }
      if (LR.sc !== 'ph') {
        const x = Math.round(X(c)) + .5; ctx.strokeStyle = muted; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText('cambio', x + 4, pad.t + 10);
      }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TMAX, 6, h - pad.b + 15, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
    f = fit($('logrank-c-oe'));
    if (f && LR.res) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const path = LR.res.path;
      let m = 1; for (const p of path) m = Math.max(m, Math.abs(p.u), 1.96 * Math.sqrt(p.v));
      m *= 1.12;
      const X = v => pad.l + v / TMAX * (w - pad.l - pad.r), Y = v => pad.t + (m - v) / (2 * m) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.lineWidth = 1;
      for (let v = 0; v <= TMAX; v += 6) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // franja ±1,96 √V acumulada
      ctx.fillStyle = muted; ctx.globalAlpha = .16; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (const p of path) ctx.lineTo(X(p.t), Y(1.96 * Math.sqrt(p.v)));
      for (let i = path.length - 1; i >= 0; i--) ctx.lineTo(X(path[i].t), Y(-1.96 * Math.sqrt(path[i].v)));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.beginPath();
      path.forEach((p, i) => { if (!i) ctx.moveTo(X(p.t), Y(p.u)); else { ctx.lineTo(X(p.t), Y(path[i - 1].u)); ctx.lineTo(X(p.t), Y(p.u)); } });
      ctx.stroke();
      const last = path[path.length - 1], out = Math.abs(last.u) > 1.96 * Math.sqrt(last.v);
      ctx.fillStyle = out ? hot : ink; ctx.beginPath(); ctx.arc(X(last.t), Y(last.u), 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      const step = m > 20 ? 10 : m > 8 ? 5 : m > 4 ? 2 : 1;
      for (let v = -Math.floor(m / step) * step; v <= m; v += step) ctx.fillText((v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), pad.l - 6, Y(v) + 4);
      axisTicks(ctx, X, 0, TMAX, 6, h - pad.b + 17, muted);
      ctx.textAlign = 'right'; ctx.fillText('meses', w - pad.r, h - 3);
    }
  }

  M.draw.logrank = drawLR;
  M.init.push(() => lrSync(true));
})();
