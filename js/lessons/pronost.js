/* StatEdx · sesión pronost: Evaluación de pronósticos */
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
  const minus = s => String(s).replace(/-/g, '−');
  function niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), r = raw / p;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const bigPct = v => v >= 1000 ? '> 999 %' : fmt(v, 1) + ' %';

  // ================= Lab 1: métricas =================
  const BASE_A = [6, -7, 5, -4, 8, -6, 7, -5, 4, -8, 6, -6];
  const BASE_B = [1, -1, 0, 1, 0, -1, 0, 1, -1, 0, 1, 0];
  const BIGM = 6;
  const L = { big: 40, bias: 0, lvl: 'hi' };
  let lState = null;
  function lSync() {
    $('pronost-m-big').value = L.big; $('pronost-m-big-v').textContent = L.big;
    $('pronost-m-bias').value = L.bias; $('pronost-m-bias-v').textContent = minus(String(L.bias));
    const y = BASE_A.map((_, i) => L.lvl === 'hi' ? 200 + 30 * Math.sin(2 * Math.PI * i / 12) : 9 + 8 * Math.sin(2 * Math.PI * (i + 3) / 12));
    const eA = BASE_A.map(v => v + L.bias), eB = BASE_B.map((v, i) => i === BIGM ? L.big : v);
    const m = e => ({ mae: mean(e.map(Math.abs)), rmse: Math.sqrt(mean(e.map(v => v * v))), mape: 100 * mean(e.map((v, i) => Math.abs(v / y[i]))), me: mean(e) });
    const a = m(eA), b = m(eB);
    lState = { eA, eB };
    const pair = (x, z, d) => `${minus(fmt(x, d))} · ${minus(fmt(z, d))}`;
    $('pronost-m-mae').textContent = pair(a.mae, b.mae, 1);
    $('pronost-m-rmse').textContent = pair(a.rmse, b.rmse, 1);
    $('pronost-m-mape').textContent = `${bigPct(a.mape)} · ${bigPct(b.mape)}`;
    $('pronost-m-me').textContent = pair(a.me, b.me, 1);
    const wMae = a.mae < b.mae ? 'A' : a.mae > b.mae ? 'B' : '=', wR = a.rmse < b.rmse ? 'A' : a.rmse > b.rmse ? 'B' : '=';
    $('pronost-m-head').textContent = `gana en MAE: ${wMae} · en RMSE: ${wR}`;
    lDraw();
  }
  $('pronost-m-big').addEventListener('input', e => { L.big = +e.target.value; lSync(); });
  $('pronost-m-bias').addEventListener('input', e => { L.bias = +e.target.value; lSync(); });
  M.segBind('pronost-m-lvl', b => { L.lvl = b.dataset.l; lSync(); });
  function lDraw() {
    if (!lState) return;
    const f = fit($('pronost-c-m')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const { eA, eB } = lState;
    const pad = { l: 40, r: 10, t: 12, b: 24 };
    const mx = Math.max(15, ...eA.map(Math.abs), ...eB.map(Math.abs)) * 1.1;
    const X = i => pad.l + (i + .5) / 12 * (w - pad.l - pad.r);
    const Y = v => pad.t + (mx - v) / (2 * mx) * (h - pad.t - pad.b);
    const step = niceStep(2 * mx, 4);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
    for (let v = Math.ceil(-mx / step) * step; v <= mx; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(minus(String(+v.toFixed(1))), pad.l - 6, yy + 4); }
    const bw = Math.max(3, (w - pad.l - pad.r) / 12 * .32);
    for (let i = 0; i < 12; i++) {
      for (const [e, col, dx] of [[eA, accent, -bw / 2 - 1], [eB, hot, bw / 2 + 1]]) {
        const y0 = Y(0), y1 = Y(e[i]);
        ctx.fillStyle = col; ctx.globalAlpha = .85;
        ctx.fillRect(X(i) + dx - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    const lab = w < 480 ? 'EFMAMJJASOND'.split('') : ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    lab.forEach((s, i) => ctx.fillText(s, X(i), h - 7));
  }

  // ================= Lab 2: origen móvil =================
  const N = 96, FIRST = 48, STEP = 3, WSL = 36, MM = 12;
  const R = { m: 'snaive', w: 'exp', h: 6, k: -1, y: [] };
  (() => { const r = rng(42); for (let t = 0; t < N; t++) R.y.push((120 + 1.2 * t + 1.5 * Math.sin(t / 9)) * (1 + 0.18 * Math.sin(2 * Math.PI * (t - 3) / 12)) + 4 * r.n()); })();
  function hwMul(tr, H) {
    const al = 0.3, be = 0.05, ga = 0.2, n = tr.length;
    let m1 = 0, m2 = 0; for (let j = 0; j < MM; j++) { m1 += tr[j]; m2 += tr[j + MM]; } m1 /= MM; m2 /= MM;
    let b = (m2 - m1) / MM, l = m1 + 5.5 * b;
    const s = []; for (let j = 0; j < MM; j++) s.push(tr[j] / (m1 + (j - 5.5) * b));
    for (let t = MM; t < n; t++) {
      const lb = l + b, st = s[t - MM];
      const ln = al * tr[t] / st + (1 - al) * lb;
      b = be * (ln - l) + (1 - be) * b;
      s.push(ga * tr[t] / lb + (1 - ga) * st); l = ln;
    }
    const out = []; for (let h = 1; h <= H; h++) out.push((l + h * b) * s[n - 1 + h - MM * (Math.floor((h - 1) / MM) + 1)]);
    return out;
  }
  function forecast(tr, H, m) {
    const n = tr.length, out = [];
    for (let h = 1; h <= H; h++) {
      if (m === 'mean') out.push(mean(tr));
      else if (m === 'naive') out.push(tr[n - 1]);
      else if (m === 'snaive') out.push(tr[n - MM + ((h - 1) % MM)]);
      else if (m === 'drift') out.push(tr[n - 1] + h * (tr[n - 1] - tr[0]) / (n - 1));
    }
    return m === 'hw' ? hwMul(tr, H) : out;
  }
  let rState = null;
  function rSync() {
    $('pronost-r-h').value = R.h; $('pronost-r-h-v').textContent = R.h;
    const origins = []; for (let T = FIRST; T + R.h <= N; T += STEP) origins.push(T);
    const runs = origins.map(T => {
      const start = R.w === 'exp' ? 0 : T - WSL, tr = R.y.slice(start, T);
      const fc = forecast(tr, R.h, R.m);
      let sc = 0; for (let t = MM; t < tr.length; t++) sc += Math.abs(tr[t] - tr[t - MM]); sc /= tr.length - MM;
      return { T, start, fc, sc };
    });
    const ae = [], se = [], pe = [], qe = [];
    for (const r of runs) r.fc.forEach((v, i) => { const y = R.y[r.T + i], e = y - v; ae.push(Math.abs(e)); se.push(e * e); pe.push(Math.abs(e / y)); qe.push(Math.abs(e) / r.sc); });
    if (R.k < 0 || R.k >= runs.length) R.k = runs.length - 1;
    rState = { runs };
    $('pronost-r-mae').textContent = fmt(mean(ae), 1);
    $('pronost-r-rmse').textContent = fmt(Math.sqrt(mean(se)), 1);
    $('pronost-r-mape').textContent = fmt(100 * mean(pe), 1) + ' %';
    $('pronost-r-mase').textContent = fmt(mean(qe), 2);
    $('pronost-r-head').textContent = `${runs.length} orígenes × ${R.h} horizontes = ${runs.length * R.h} errores`;
    rDraw();
  }
  M.segBind('pronost-r-m', b => { R.m = b.dataset.m; rSync(); });
  M.segBind('pronost-r-w', b => { R.w = b.dataset.w; rSync(); });
  $('pronost-r-h').addEventListener('input', e => { R.h = +e.target.value; R.k = -1; rSync(); });
  let playing = false, last = 0;
  const playBtn = $('pronost-r-play');
  function tick(ts) {
    if (!playing) return;
    if (M.current !== 'pronost') { playing = false; playBtn.textContent = 'Animar'; return; }
    if (ts - last > 420) {
      last = ts;
      if (R.k >= rState.runs.length - 1) { playing = false; playBtn.textContent = 'Animar'; rDraw(); return; }
      R.k++; rDraw();
    }
    requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', () => {
    if (playing) { playing = false; playBtn.textContent = 'Animar'; return; }
    playing = true; playBtn.textContent = 'Pausar'; R.k = 0; last = 0; rDraw(); requestAnimationFrame(tick);
  });
  function rDraw() {
    if (!rState) return;
    const { runs } = rState, cur = runs[Math.min(R.k, runs.length - 1)], y = R.y;
    $('pronost-r-lbl').textContent = `origen ${R.k + 1} de ${runs.length} · T = ${cur.T}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    const f = fit($('pronost-c-r'));
    if (f) {
      const { ctx, w, h } = f;
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 12, t: 12, b: 24 };
      let lo = Math.min(...y, ...cur.fc), hi = Math.max(...y, ...cur.fc); const sp = hi - lo; lo -= sp * .05; hi += sp * .05;
      const X = t => pad.l + t / (N - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      ctx.fillStyle = accent; ctx.globalAlpha = .08; ctx.fillRect(X(cur.start - .5 < 0 ? 0 : cur.start - .5), pad.t, X(cur.T - .5) - X(Math.max(0, cur.start - .5)), h - pad.t - pad.b); ctx.globalAlpha = 1;
      const step = niceStep(hi - lo, 4);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const yy = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v), pad.l - 6, yy + 4); }
      ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); const xc = Math.round(X(cur.T - .5)) + .5; ctx.beginPath(); ctx.moveTo(xc, pad.t); ctx.lineTo(xc, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.beginPath();
      y.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
      for (let t = 0; t < N; t++) {
        const inTest = t >= cur.T && t < cur.T + R.h;
        ctx.beginPath(); ctx.arc(X(t), Y(y[t]), inTest ? 3 : 1.6, 0, Math.PI * 2);
        if (inTest) { ctx.fillStyle = tok('--bg'); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.stroke(); }
        else { ctx.fillStyle = muted; ctx.fill(); }
      }
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(X(cur.T - 1), Y(y[cur.T - 1]));
      cur.fc.forEach((v, i) => ctx.lineTo(X(cur.T + i), Y(v))); ctx.stroke();
      ctx.fillStyle = hot; cur.fc.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(cur.T + i), Y(v), 2.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let t = 0; t <= N; t += 24) ctx.fillText('mes ' + t, X(Math.min(t, N - 1)) + (t === 0 ? 14 : t >= N ? -14 : 0), h - 7);
    }
    const g = fit($('pronost-c-o'));
    if (g) {
      const { ctx, w, h } = g;
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 44, r: 12, t: 8, b: 22 }, n = runs.length;
      const X = t => pad.l + t / N * (w - pad.l - pad.r);
      const rh = (h - pad.t - pad.b) / n, bh = Math.max(2, rh * .62);
      runs.forEach((r, i) => {
        const yy = pad.t + i * rh + (rh - bh) / 2, on = i === R.k;
        ctx.globalAlpha = on ? .95 : .35;
        ctx.fillStyle = accent; ctx.fillRect(X(r.start), yy, X(r.T) - X(r.start) - 1, bh);
        ctx.fillStyle = hot; ctx.fillRect(X(r.T), yy, X(r.T + R.h) - X(r.T) - 1, bh);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      ctx.fillText('1', pad.l - 6, pad.t + rh / 2 + 4);
      ctx.fillText(String(n), pad.l - 6, pad.t + (n - .5) * rh + 4);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.textAlign = 'center';
      for (let t = 0; t <= N; t += 24) ctx.fillText(t, X(t) + (t === 0 ? 4 : t === N ? -8 : 0), h - 7);
    }
  }

  M.draw['pronost'] = () => { lDraw(); rDraw(); };
  M.init.push(() => { lSync(); rSync(); });
})();
