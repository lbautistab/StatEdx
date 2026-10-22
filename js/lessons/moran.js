/* StatEdx · sesión moran: Autocorrelación espacial: I de Moran */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const G = 12, n = G * G, NPERM = 499, NLOC = 199;
  const S = { rho: 0.6, w: 'rook', view: 'val', eps: null, x: null, res: null };
  const sgn = (v, d) => (v < 0 ? '−' : '') + fmt(Math.abs(v), d);

  function neighbors(type) {
    const nb = [];
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const list = [];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        if (type === 'rook' && di && dj) continue;
        const a = i + di, b = j + dj;
        if (a >= 0 && a < G && b >= 0 && b < G) list.push(a * G + b);
      }
      nb.push(list);
    }
    return nb;
  }
  const NB = { rook: neighbors('rook'), queen: neighbors('queen') };

  function simulate() {
    const nb = NB[S.w];
    let x = Float64Array.from(S.eps);
    for (let it = 0; it < 250; it++) {
      const nx = new Float64Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (const j of nb[i]) s += x[j]; nx[i] = S.eps[i] + S.rho * s / nb[i].length; }
      x = nx;
    }
    S.x = x;
  }
  const lagOf = (z, nb) => Float64Array.from(nb, l => l.reduce((s, j) => s + z[j], 0) / l.length);
  function moranI(z, nb) { let num = 0, den = 0; for (let i = 0; i < n; i++) { let s = 0; for (const j of nb[i]) s += z[j]; num += z[i] * s / nb[i].length; den += z[i] * z[i]; } return num / den; }

  function analyze() {
    const nb = NB[S.w];
    let m = 0; for (const v of S.x) m += v; m /= n;
    const z = Float64Array.from(S.x, v => v - m);
    const I = moranI(z, nb), EI = -1 / (n - 1);
    // varianza bajo aleatorización (Cliff y Ord), pesos estandarizados por filas
    const wij = (i, j) => nb[i].includes(j) ? 1 / nb[i].length : 0;
    const S0 = n; let S1 = 0, S2 = 0;
    const colSum = new Float64Array(n);
    for (let i = 0; i < n; i++) for (const j of nb[i]) { const a = wij(i, j), b = wij(j, i); S1 += (a + b) ** 2; colSum[j] += a; }
    S1 /= 2;
    for (let i = 0; i < n; i++) S2 += (1 + colSum[i]) ** 2;
    let m2 = 0, m4 = 0; for (const v of z) { m2 += v * v; m4 += v ** 4; }
    const b2 = n * m4 / (m2 * m2);
    const A = n * ((n * n - 3 * n + 3) * S1 - n * S2 + 3 * S0 * S0);
    const B = b2 * ((n * n - n) * S1 - 2 * n * S2 + 6 * S0 * S0);
    const VI = (A - B) / ((n - 1) * (n - 2) * (n - 3) * S0 * S0) - EI * EI;
    const zI = (I - EI) / Math.sqrt(VI);
    // permutaciones globales (unilateral en la dirección observada)
    const perm = Float64Array.from(z); let ext = 0;
    for (let r = 0; r < NPERM; r++) {
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
      const Ir = moranI(perm, nb);
      if (I >= EI ? Ir >= I : Ir <= I) ext++;
    }
    const p = (ext + 1) / (NPERM + 1);
    // LISA con permutación condicional
    const mm2 = m2 / n, lag = lagOf(z, nb), cls = new Array(n).fill('ns');
    const others = new Int32Array(n - 1);
    for (let i = 0; i < n; i++) {
      const k = nb[i].length, Ii = z[i] * lag[i] / mm2;
      let c = 0; for (let j = 0; j < n; j++) if (j !== i) others[c++] = j;
      let e = 0;
      for (let r = 0; r < NLOC; r++) {
        let s = 0;
        for (let t = 0; t < k; t++) { const q = t + Math.floor(Math.random() * (n - 1 - t)); const tmp = others[t]; others[t] = others[q]; others[q] = tmp; s += z[others[t]]; }
        const Ir = z[i] * (s / k) / mm2;
        if (Ii >= 0 ? Ir >= Ii : Ir <= Ii) e++;
      }
      if ((e + 1) / (NLOC + 1) < 0.05) cls[i] = z[i] >= 0 ? (lag[i] >= 0 ? 'AA' : 'AB') : (lag[i] < 0 ? 'BB' : 'BA');
    }
    const sd = Math.sqrt(m2 / n);
    S.res = { I, EI, zI, p, z: Float64Array.from(z, v => v / sd), lag: Float64Array.from(lag, v => v / sd), cls };
  }

  function update() { simulate(); analyze(); draw(); }

  function draw() {
    if (!S.res) return;
    const { I, EI, zI, p, z, lag, cls } = S.res;
    $('moran-rho-v').textContent = sgn(S.rho, 2);
    $('moran-I').textContent = sgn(I, 3);
    $('moran-EI').textContent = sgn(EI, 4);
    $('moran-z').textContent = sgn(zI, 2);
    $('moran-p').textContent = p <= 1 / (NPERM + 1) ? '≤ ' + fmt(1 / (NPERM + 1), 3) : fmt(p, 3);
    const cnt = { AA: 0, BB: 0, AB: 0, BA: 0 }; cls.forEach(c => { if (c !== 'ns') cnt[c]++; });
    $('moran-head').textContent = `AA ${cnt.AA} · BB ${cnt.BB} · AB ${cnt.AB} · BA ${cnt.BA}`;
    $('moran-map-lbl').textContent = S.view === 'lisa' ? 'LISA (p < 0,05)' : 'Mapa de valores';
    $('moran-map-n').textContent = S.view === 'lisa' ? (cnt.AA + cnt.BB + cnt.AB + cnt.BA) + ' de 144 signif.' : (S.w === 'rook' ? 'torre' : 'reina');
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), s2 = tok('--surface-2');
    const colOf = c => c === 'AA' || c === 'AB' ? hot : accent;
    let f = fit($('moran-c-map'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const side = Math.min(w, h) - 16, cs = side / G, x0 = (w - side) / 2, y0 = (h - side) / 2;
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const k = i * G + j, X = x0 + j * cs + 1, Y = y0 + i * cs + 1, s = cs - 2;
        if (S.view === 'val') { ctx.fillStyle = z[k] >= 0 ? hot : accent; ctx.globalAlpha = Math.min(1, .08 + Math.abs(z[k]) / 2.3); }
        else if (cls[k] === 'ns') { ctx.fillStyle = s2; ctx.globalAlpha = 1; }
        else { ctx.fillStyle = colOf(cls[k]); ctx.globalAlpha = cls[k] === 'AA' || cls[k] === 'BB' ? .9 : .4; }
        ctx.fillRect(X, Y, s, s);
        if (S.view === 'lisa' && (cls[k] === 'AB' || cls[k] === 'BA')) { ctx.globalAlpha = 1; ctx.strokeStyle = colOf(cls[k]); ctx.lineWidth = 1.5; ctx.strokeRect(X + .75, Y + .75, s - 1.5, s - 1.5); }
      }
      ctx.globalAlpha = 1;
    }
    f = fit($('moran-c-sc'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 34, r: 12, t: 14, b: 28 };
      let L = 2.5; for (let i = 0; i < n; i++) L = Math.max(L, Math.abs(z[i]) * 1.05, Math.abs(lag[i]) * 1.05);
      L = Math.ceil(L);
      const X = v => pad.l + (v + L) / (2 * L) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - (v + L) / (2 * L) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = -L; v <= L; v++) { const x = Math.round(X(v)) + .5, y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = muted;
      ctx.beginPath(); ctx.moveTo(Math.round(X(0)) + .5, pad.t); ctx.lineTo(Math.round(X(0)) + .5, h - pad.b); ctx.moveTo(pad.l, Math.round(Y(0)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(0)) + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right'; ctx.fillText('AA', w - pad.r - 4, pad.t + 12); ctx.fillText('AB', w - pad.r - 4, h - pad.b - 6);
      ctx.textAlign = 'left'; ctx.fillText('BA', pad.l + 4, pad.t + 12); ctx.fillText('BB', pad.l + 4, h - pad.b - 6);
      for (let i = 0; i < n; i++) {
        const c = cls[i]; ctx.fillStyle = c === 'ns' ? muted : colOf(c); ctx.globalAlpha = c === 'ns' ? .45 : .9;
        ctx.beginPath(); ctx.arc(X(z[i]), Y(lag[i]), c === 'ns' ? 2.8 : 3.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-L), Y(-L * I)); ctx.lineTo(X(L), Y(L * I)); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let v = -L; v <= L; v++) ctx.fillText(sgn(v, 0), X(v), h - 10);
      ctx.textAlign = 'right';
      for (let v = -L; v <= L; v++) ctx.fillText(sgn(v, 0), pad.l - 6, Y(v) + 4);
    }
  }

  function newEps() { S.eps = Float64Array.from({ length: n }, () => randn()); update(); }
  $('moran-rho').addEventListener('input', e => { S.rho = +e.target.value; update(); });
  segBind('moran-wtype', b => { S.w = b.dataset.w; update(); });
  segBind('moran-vista', b => { S.view = b.dataset.v; draw(); });
  $('moran-again').addEventListener('click', newEps);

  M.draw['moran'] = draw;
  M.init.push(newEps);
})();
