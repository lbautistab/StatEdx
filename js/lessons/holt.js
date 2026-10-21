/* StatEdx · sesión holt: Suavizamiento exponencial y Holt-Winters */
(() => {
  const { fit, tok, fmt } = M;
  const $ = id => document.getElementById(id);
  function rng(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = () => { let x = 0; while (!x) x = u(); const y = u(); return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y); };
    return { u, n };
  }
  const font = () => '11px ' + tok('--f-mono');
  const minus = s => String(s).replace('-', '−');
  function niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  }

  const N = 72, NFIT = 60, H = 12, MM = 12;
  const S = { meth: 'hwa', data: 'seas', al: 0.3, be: 0.05, ga: 0.2, ph: 1, seed: 11, y: [] };
  const NAMES = { ses: 'SES · ETS(A,N,N)', holt: 'Holt · ETS(A,A,N)', hwa: 'HW aditivo · ETS(A,A,A)', hwm: 'HW mult. · ETS(M,A,M)' };

  function makeData() {
    const r = rng(S.seed), y = [];
    let drift = 0;
    for (let t = 0; t < N; t++) {
      drift += r.n() * (S.data === 'lvl' ? 4 : 1.5);
      if (S.data === 'lvl') y.push(220 + drift + 7 * r.n());
      else if (S.data === 'trend') y.push(150 + 2.6 * t + drift + 6 * r.n());
      else { const L = 150 + 2.6 * t + drift; y.push(L * (1 + 0.22 * Math.sin(2 * Math.PI * (t - 2) / 12)) + 5 * r.n()); }
    }
    S.y = y;
  }

  // Recursiones de suavizamiento. Inicializa con el primer año (t = 0..11) y filtra desde t = 12.
  function smooth(y, meth, al, be, ga, ph) {
    const trend = meth !== 'ses', seas = meth === 'hwa' || meth === 'hwm', mul = meth === 'hwm';
    let m1 = 0, m2 = 0;
    for (let j = 0; j < MM; j++) { m1 += y[j]; m2 += y[j + MM]; }
    m1 /= MM; m2 /= MM;
    let b = trend ? (m2 - m1) / MM : 0;
    let l = m1 + (trend ? 5.5 * b : 0);
    const s = new Array(N + H).fill(mul ? 1 : 0);
    if (seas) for (let j = 0; j < MM; j++) { const base = m1 + (j - 5.5) * b; s[j] = mul ? y[j] / base : y[j] - base; }
    const f1 = new Array(NFIT).fill(null);
    let sse = 0;
    for (let t = MM; t < NFIT; t++) {
      const lb = l + ph * b * (trend ? 1 : 0), st = s[t - MM];
      const yhat = seas ? (mul ? lb * st : lb + st) : lb;
      f1[t] = yhat; sse += (y[t] - yhat) ** 2;
      const lNew = seas ? al * (mul ? y[t] / st : y[t] - st) + (1 - al) * lb : al * y[t] + (1 - al) * lb;
      if (trend) b = be * (lNew - l) + (1 - be) * ph * b;
      if (seas) s[t] = mul ? ga * y[t] / lb + (1 - ga) * st : ga * (y[t] - lb) + (1 - ga) * st;
      l = lNew;
    }
    const fc = [];
    let damp = 0;
    for (let h = 1; h <= H; h++) {
      damp += trend ? ph ** h : 0;
      const lb = l + damp * b, st = s[NFIT - 1 + h - MM];
      fc.push(seas ? (mul ? lb * st : lb + st) : lb);
    }
    return { f1, fc, l, b, sse, nobs: NFIT - MM };
  }

  const els = { al: $('holt-al'), be: $('holt-be'), ga: $('holt-ga'), ph: $('holt-ph') };
  let state = null;
  function setEnabled() {
    const use = { al: true, be: S.meth !== 'ses', ga: S.meth === 'hwa' || S.meth === 'hwm', ph: S.meth !== 'ses' };
    for (const k of Object.keys(els)) { els[k].disabled = !use[k]; els[k].parentElement.style.opacity = use[k] ? '' : '.45'; }
  }
  function sync() {
    for (const k of Object.keys(els)) { els[k].value = S[k]; $('holt-' + k + '-v').textContent = fmt(S[k], 2); }
    setEnabled();
    const r = smooth(S.y, S.meth, S.al, S.be, S.ga, S.ph);
    let mae = 0; for (let h = 0; h < H; h++) mae += Math.abs(S.y[NFIT + h] - r.fc[h]); mae /= H;
    state = r;
    $('holt-rmse').textContent = fmt(Math.sqrt(r.sse / r.nobs), 1);
    $('holt-mae').textContent = fmt(mae, 1);
    $('holt-l').textContent = fmt(r.l, 1);
    $('holt-b').textContent = S.meth === 'ses' ? '–' : minus(fmt(r.b, 2));
    $('holt-head').textContent = NAMES[S.meth];
    $('holt-lbl').textContent = 'ajuste: meses 13-60 · prueba: 61-72';
    $('holt-age').textContent = 'edad media ≈ ' + fmt((1 - S.al) / S.al, 1) + ' meses';
    draw();
  }
  for (const k of Object.keys(els)) els[k].addEventListener('input', () => { S[k] = +els[k].value; sync(); });
  M.segBind('holt-meth', b => { S.meth = b.dataset.m; sync(); });
  M.segBind('holt-data', b => { S.data = b.dataset.d; makeData(); sync(); });
  $('holt-new').addEventListener('click', () => { S.seed = (S.seed * 7919 + 13) % 100003; makeData(); sync(); });
  $('holt-opt').addEventListener('click', () => {
    const trend = S.meth !== 'ses', seas = S.meth === 'hwa' || S.meth === 'hwm';
    let best = { sse: Infinity };
    const coarse = (lo, hi, st) => { const a = []; for (let v = lo; v <= hi + 1e-9; v += st) a.push(+v.toFixed(3)); return a; };
    const A = coarse(0.02, 1, 0.02), B = trend ? coarse(0, 0.5, 0.025) : [S.be], G = seas ? coarse(0, 0.7, 0.05) : [S.ga];
    for (const al of A) for (const be of B) for (const ga of G) {
      const r = smooth(S.y, S.meth, al, be, ga, S.ph);
      if (r.sse < best.sse) best = { sse: r.sse, al, be, ga };
    }
    S.al = best.al; S.be = best.be; S.ga = best.ga;
    sync();
  });

  function draw() {
    if (!state) return;
    const y = S.y, { f1, fc } = state;
    const f = fit($('holt-c'));
    if (f) {
      const { ctx, w, h } = f;
      const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 12, t: 14, b: 26 };
      const all = y.concat(fc);
      let lo = Math.min(...all), hi = Math.max(...all); const span = hi - lo || 1; lo -= span * .06; hi += span * .08;
      const step = niceStep(hi - lo, 4);
      const X = t => pad.l + t / (N - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      // test region
      ctx.fillStyle = hot; ctx.globalAlpha = .06; ctx.fillRect(X(NFIT - .5), pad.t, X(N - 1) - X(NFIT - .5) + 4, h - pad.t - pad.b); ctx.globalAlpha = 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v), pad.l - 6, yy + 4); }
      ctx.globalAlpha = .55;
      for (let yr = 1; yr < 6; yr++) { const x = Math.round(X(yr * 12 - .5)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); const xc = Math.round(X(NFIT - .5)) + .5; ctx.moveTo(xc, pad.t); ctx.lineTo(xc, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      // data
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.globalAlpha = .7; ctx.beginPath();
      y.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke(); ctx.globalAlpha = 1;
      y.forEach((v, t) => {
        ctx.beginPath(); ctx.arc(X(t), Y(v), t < NFIT ? 2 : 3, 0, Math.PI * 2);
        if (t < NFIT) { ctx.fillStyle = muted; ctx.fill(); } else { ctx.fillStyle = tok('--bg'); ctx.fill(); ctx.strokeStyle = muted; ctx.lineWidth = 1.3; ctx.stroke(); }
      });
      // one-step fitted
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); let st = false;
      f1.forEach((v, t) => { if (v === null) return; st ? ctx.lineTo(X(t), Y(v)) : (ctx.moveTo(X(t), Y(v)), st = true); }); ctx.stroke();
      // forecast
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath();
      ctx.moveTo(X(NFIT - 1), Y(f1[NFIT - 1]));
      fc.forEach((v, i) => ctx.lineTo(X(NFIT + i), Y(v))); ctx.stroke();
      ctx.fillStyle = hot; fc.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(NFIT + i), Y(v), 2.4, 0, Math.PI * 2); ctx.fill(); });
      // axis
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      const narrow = w < 480;
      for (let yr = 0; yr < 6; yr++) ctx.fillText(narrow ? 'a' + (yr + 1) : 'año ' + (yr + 1), X(yr * 12 + 5.5), h - 8);
      ctx.textAlign = 'left'; ctx.fillStyle = ink;
      ctx.fillText('prueba', Math.min(xc + 5, w - pad.r - 44), pad.t + 11);
    }
    const g = fit($('holt-cw'));
    if (g) {
      const { ctx, w, h } = g;
      const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line');
      ctx.clearRect(0, 0, w, h);
      const K = 36, pad = { l: 44, r: 12, t: 12, b: 26 }, al = S.al;
      const wmax = Math.max(al, 0.05);
      const X = j => pad.l + (j + .5) / K * (w - pad.l - pad.r);
      const Y = v => pad.t + (1 - v / wmax) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      const step = niceStep(wmax, 3);
      for (let v = 0; v <= wmax + 1e-9; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(fmt(v, 2), pad.l - 6, yy + 4); }
      const bw = Math.max(2, (w - pad.l - pad.r) / K * .62);
      let cum = 0, cut = -1;
      for (let j = 0; j < K; j++) {
        const wj = al * (1 - al) ** j; cum += wj; if (cut < 0 && cum >= 0.9) cut = j;
        ctx.fillStyle = cut === -1 || cut === j ? accent : muted; ctx.globalAlpha = cut === -1 || cut === j ? .85 : .45;
        const y1 = Y(wj); ctx.fillRect(X(j) - bw / 2, y1, bw, Math.max(1, Y(0) - y1));
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let j = 0; j < K; j += 6) ctx.fillText(j, X(j), h - 8);
      ctx.textAlign = 'right';
      ctx.fillStyle = hot;
      ctx.fillText(cut >= 0 ? `90 % del peso en los últimos ${cut + 1} datos` : `90 % del peso: más de ${K} datos`, w - pad.r, pad.t + 10);
    }
  }

  M.draw['holt'] = draw;
  M.init.push(() => { makeData(); sync(); });
})();
