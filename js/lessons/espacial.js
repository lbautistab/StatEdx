/* StatEdx · sesión espacial: Introducción a los datos espaciales */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');

  // ---------- laboratorio 1: Mercator ----------
  const P = { lat: 45 };
  const RT = 6371, RAD = Math.PI / 180, R0 = 300;
  const merc = phi => Math.log(Math.tan(Math.PI / 4 + phi * RAD / 2));
  function circle(phi0, radKm) {
    const d = radKm / RT, p0 = phi0 * RAD, pts = [];
    for (let i = 0; i <= 72; i++) {
      const t = i / 72 * 2 * Math.PI;
      const p = Math.asin(Math.sin(p0) * Math.cos(d) + Math.cos(p0) * Math.sin(d) * Math.cos(t));
      const l = Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p0), Math.cos(d) - Math.sin(p0) * Math.sin(p));
      pts.push([p / RAD, l]);
    }
    return pts;
  }
  function drawMerc() {
    const phi = P.lat, c = Math.cos(phi * RAD), k = 1 / c;
    $('espacial-p-lat-v').textContent = phi;
    $('espacial-p-km').textContent = fmt(111.32 * c, 1) + ' km';
    $('espacial-p-k').textContent = fmt(k, 2) + '×';
    $('espacial-p-k2').textContent = fmt(k * k, 2) + '×';
    $('espacial-p-err').textContent = '+' + pct(k - 1, 0);
    $('espacial-p-head').textContent = `φ = ${phi}° · k = ${fmt(k, 2)}`;
    const f = fit($('espacial-c-merc')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 14, r: 14, t: 10, b: 26 };
    const u0 = merc(-6), u1 = merc(82.5);
    const S = (w - pad.l - pad.r) / (u1 - u0);
    const X = ph => pad.l + (merc(ph) - u0) * S;
    const yc = pad.t + (h - pad.t - pad.b) / 2;
    const Y = lam => yc - lam * S;
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
    // meridianos (horizontales) cada 5°
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let lam = -60; lam <= 60; lam += 5) { const y = Math.round(Y(lam * RAD)) + .5; ctx.globalAlpha = lam ? .55 : 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    // paralelos (verticales) cada 10°
    for (let ph = 0; ph <= 80; ph += 10) { const x = Math.round(X(ph)) + .5; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const path = pts => { ctx.beginPath(); pts.forEach(([p, l], i) => i ? ctx.lineTo(X(p), Y(l)) : ctx.moveTo(X(p), Y(l))); ctx.closePath(); };
    for (const ph of [0, 20, 40, 60, 75]) { path(circle(ph, R0)); ctx.strokeStyle = muted; ctx.lineWidth = 1.4; ctx.stroke(); }
    path(circle(phi, R0)); ctx.fillStyle = hot; ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = hot; ctx.lineWidth = 2.2; ctx.stroke();
    // eje de la latitud elegida
    ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; const xs = Math.round(X(phi)) + .5;
    ctx.beginPath(); ctx.moveTo(xs, pad.t); ctx.lineTo(xs, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    const stepL = w < 480 ? 20 : 10;
    for (let ph = 0; ph <= 80; ph += stepL) ctx.fillText(ph + '°', Math.min(Math.max(X(ph), pad.l + 10), w - pad.r - 12), h - 8);
    ctx.textAlign = 'left'; ctx.fillText('latitud →', pad.l + 4, pad.t + 12);
  }
  $('espacial-p-lat').addEventListener('input', e => {
    P.lat = +e.target.value;
    document.querySelectorAll('#espacial-p-pre button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.lat === P.lat)));
    drawMerc();
  });
  segBind('espacial-p-pre', b => { P.lat = +b.dataset.lat; $('espacial-p-lat').value = P.lat; drawMerc(); });

  // ---------- laboratorio 2: campo aleatorio y correlograma ----------
  const N = 40, DMAX = 15;
  const F = { ell: 3, view: 'campo', z: null, zs: null, perm: null, noise: null };
  const rhoT = d => F.ell === 0 ? (d === 0 ? 1 : 0) : Math.exp(-d * d / (4 * F.ell * F.ell));

  function newNoise() {
    const PAD = 26, G = N + 2 * PAD;
    F.noise = { G, PAD, v: Float64Array.from({ length: G * G }, () => randn()) };
    F.perm = Array.from({ length: N * N }, (_, i) => i);
    for (let i = F.perm.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [F.perm[i], F.perm[j]] = [F.perm[j], F.perm[i]]; }
    buildField();
  }
  function buildField() {
    const { G, PAD, v } = F.noise, ell = F.ell;
    let out = new Float64Array(N * N);
    if (ell === 0) { for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out[i * N + j] = v[(i + PAD) * G + j + PAD]; }
    else {
      const R = Math.min(PAD, Math.ceil(3 * ell)), ker = [];
      for (let k = -R; k <= R; k++) ker.push(Math.exp(-k * k / (2 * ell * ell)));
      const tmp = new Float64Array(G * N);           // suavizado por columnas (solo las N columnas útiles)
      for (let r = 0; r < G; r++) for (let j = 0; j < N; j++) { let s = 0; for (let k = -R; k <= R; k++) s += ker[k + R] * v[r * G + j + PAD + k]; tmp[r * N + j] = s; }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let s = 0; for (let k = -R; k <= R; k++) s += ker[k + R] * tmp[(i + PAD + k) * N + j]; out[i * N + j] = s; }
    }
    let m = 0; for (const x of out) m += x; m /= out.length;
    let s2 = 0; for (const x of out) s2 += (x - m) ** 2; const sd = Math.sqrt(s2 / out.length) || 1;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - m) / sd;
    F.z = out;
    F.zs = Float64Array.from(F.perm, i => out[i]);
    drawField();
  }
  function correlogram(z) {
    const sum = new Float64Array(DMAX + 1), cnt = new Float64Array(DMAX + 1);
    for (let dx = 0; dx <= DMAX; dx++) for (let dy = -DMAX; dy <= DMAX; dy++) {
      if (dx === 0 && dy <= 0) continue;
      const d = Math.round(Math.hypot(dx, dy)); if (d > DMAX) continue;
      for (let i = Math.max(0, -dy); i < N - Math.max(0, dy); i++) for (let j = 0; j < N - dx; j++) {
        sum[d] += z[i * N + j] * z[(i + dy) * N + j + dx]; cnt[d]++;
      }
    }
    return Array.from(sum, (s, d) => cnt[d] ? s / cnt[d] : null);
  }
  function neff(indep) {
    if (indep || F.ell === 0) return N * N;
    let tot = 0;
    for (let dx = -(N - 1); dx < N; dx++) for (let dy = -(N - 1); dy < N; dy++) tot += (N - Math.abs(dx)) * (N - Math.abs(dy)) * rhoT(Math.hypot(dx, dy));
    return N ** 4 / tot;
  }
  function drawField() {
    if (!F.z) return;
    const shuffled = F.view === 'mezcla', z = shuffled ? F.zs : F.z;
    const cg = correlogram(z), ne = neff(shuffled);
    $('espacial-ell-v').textContent = fmt(F.ell, F.ell % 1 ? 1 : 0);
    $('espacial-r1').textContent = fmt(cg[1], 2);
    $('espacial-rango').textContent = shuffled || F.ell === 0 ? '< 1 celda' : fmt(2 * F.ell * Math.sqrt(Math.log(10)), 1) + ' celdas';
    $('espacial-neff').textContent = fmt(ne, 0);
    $('espacial-vr').textContent = fmt(N * N / ne, 1) + '×';
    $('espacial-head').textContent = shuffled ? 'celdas barajadas' : `ρ(d) = exp(−d²/4ℓ²) · ℓ = ${fmt(F.ell, 1)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    let f = fit($('espacial-c-campo'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const side = Math.min(w, h) - 16, cs = side / N, x0 = (w - side) / 2, y0 = (h - side) / 2;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const v = z[i * N + j];
        ctx.fillStyle = v >= 0 ? hot : accent; ctx.globalAlpha = Math.min(1, Math.abs(v) / 2.2);
        ctx.fillRect(x0 + j * cs, y0 + i * cs, cs + .4, cs + .4);
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, y0 + .5, side - 1, side - 1);
    }
    f = fit($('espacial-c-cor'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 14, b: 28 }, ylo = -0.2, yhi = 1;
      const X = d => pad.l + d / DMAX * (w - pad.l - pad.r);
      const Y = r => h - pad.b - (r - ylo) / (yhi - ylo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let r = -0.2; r <= 1.001; r += 0.2) { const y = Math.round(Y(r)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      for (let d = 5; d <= DMAX; d += 5) { const x = Math.round(X(d)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(0.1)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0.1)) + .5); ctx.stroke(); ctx.setLineDash([]);
      // curva teórica
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 150; i++) { const d = DMAX * i / 150; const r = shuffled ? (d === 0 ? 1 : 0) : rhoT(d); const y = Y(r); i ? ctx.lineTo(X(d), y) : ctx.moveTo(X(d), y); }
      if (shuffled || F.ell === 0) { ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(DMAX), Y(0)); }
      ctx.stroke();
      // empírica
      ctx.fillStyle = accent; ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.beginPath();
      let first = true;
      for (let d = 1; d <= DMAX; d++) { if (cg[d] == null) continue; const y = Y(Math.max(ylo, Math.min(yhi, cg[d]))); first ? ctx.moveTo(X(d), y) : ctx.lineTo(X(d), y); first = false; }
      ctx.globalAlpha = .6; ctx.stroke(); ctx.globalAlpha = 1;
      for (let d = 1; d <= DMAX; d++) { if (cg[d] == null) continue; ctx.beginPath(); ctx.arc(X(d), Y(Math.max(ylo, Math.min(yhi, cg[d]))), 3.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, DMAX, 5, h - 9, muted);
      ctx.textAlign = 'right';
      for (let r = -0.2; r <= 1.001; r += 0.2) ctx.fillText(fmt(r, 1), pad.l - 6, Y(r) + 4);
      ctx.textAlign = 'right'; ctx.fillText('ρ = 0,1', w - pad.r - 2, Y(0.1) - 4);
    }
  }
  $('espacial-ell').addEventListener('input', e => { F.ell = +e.target.value; buildField(); });
  segBind('espacial-vista', b => { F.view = b.dataset.v; drawField(); });
  $('espacial-again').addEventListener('click', newNoise);

  M.draw['espacial'] = () => { drawMerc(); drawField(); };
  M.init.push(() => { drawMerc(); newNoise(); });
})();
