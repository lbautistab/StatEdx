/* StatEdx · sesión forma: Medidas de forma: asimetría y curtosis */
(() => {
  const { fit, tok, fmt, randn, npdf, segBind } = M;
  const $ = id => document.getElementById(id);
  const S = { fam: 'asim', p: 1, n: 500, out: 0, xs: [] };
  const FAM = {
    asim: { label: 'ASIMETRÍA · γ₁', min: -2, max: 2, step: 0.1, def: 1 },
    colas: { label: 'GRADOS DE LIBERTAD · ν', min: 5, max: 60, step: 1, def: 6 },
    bimo: { label: 'SEPARACIÓN DE PICOS · d', min: 0, max: 3, step: 0.1, def: 2 },
  };

  // ---------- utilidades numéricas ----------
  function lgamma(z) { // Lanczos
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function rgamma(k) { // Marsaglia-Tsang
    if (k < 1) return rgamma(k + 1) * Math.random() ** (1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) { let x, v; do { x = randn(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = Math.random();
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v; }
  }
  function qnorm(p) { // Acklam
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) return -qnorm(1 - p);
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  // ---------- familias estandarizadas (media 0, desviación 1) ----------
  function gen() {
    const p = S.p;
    if (S.fam === 'asim') {
      if (Math.abs(p) < 0.05) return randn;
      const k = 4 / (p * p), s = Math.sign(p), rk = Math.sqrt(k);
      return () => s * (rgamma(k) - k) / rk;
    }
    if (S.fam === 'colas') { const c = Math.sqrt((p - 2) / p); return () => c * randn() / Math.sqrt(2 * rgamma(p / 2) / p); }
    const sd = Math.sqrt(1 + p * p); return () => ((Math.random() < 0.5 ? -p : p) + randn()) / sd;
  }
  function pdf(x) {
    const p = S.p;
    if (S.fam === 'asim') {
      if (Math.abs(p) < 0.05) return npdf(x, 0, 1);
      const k = 4 / (p * p), rk = Math.sqrt(k), y = k + Math.sign(p) * x * rk;
      return y > 0 ? rk * Math.exp((k - 1) * Math.log(y) - y - lgamma(k)) : 0;
    }
    if (S.fam === 'colas') {
      const c = Math.sqrt((p - 2) / p), t = x / c;
      return Math.exp(lgamma((p + 1) / 2) - lgamma(p / 2)) / Math.sqrt(p * Math.PI) * (1 + t * t / p) ** (-(p + 1) / 2) / c;
    }
    const sd = Math.sqrt(1 + p * p); return sd * (0.5 * npdf(x * sd, -p, 1) + 0.5 * npdf(x * sd, p, 1));
  }
  function theory() {
    const p = S.p;
    if (S.fam === 'asim') return [p, 1.5 * p * p];
    if (S.fam === 'colas') return [0, 6 / (p - 4)];
    return [0, -2 * p ** 4 / (1 + p * p) ** 2];
  }
  function sample() {
    const g = gen(); S.xs = Array.from({ length: S.n }, g);
  }
  function moments(xs) {
    const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; let m2 = 0, m3 = 0, m4 = 0;
    for (const x of xs) { const d = x - m, d2 = d * d; m2 += d2; m3 += d2 * d; m4 += d2 * d2; }
    m2 /= n; m3 /= n; m4 /= n;
    return { m, sd: Math.sqrt(m2), g1: m3 / m2 ** 1.5, g2: m4 / (m2 * m2) - 3 };
  }
  const sg = (x, d = 2) => (x < -0.005 ? '−' : '') + fmt(Math.abs(x), d);

  function draw() {
    const xs = S.out ? S.xs.slice(0, -1).concat([6]) : S.xs;
    const n = xs.length, mo = moments(xs), [t1, t2] = theory();
    const jb = n / 6 * (mo.g1 ** 2 + mo.g2 ** 2 / 4), pj = Math.exp(-jb / 2);
    $('forma-r-g1').textContent = sg(mo.g1);
    $('forma-r-t1').textContent = sg(t1);
    $('forma-r-g2').textContent = sg(mo.g2);
    $('forma-r-t2').textContent = sg(t2);
    $('forma-head').textContent = `JB = ${fmt(jb, 1)} · p ${pj < 0.001 ? '< 0,001' : '= ' + fmt(pj, 3)}`;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    const mono = '11px ' + tok('--f-mono');

    // ---------- histograma ----------
    let f = fit($('forma-hist'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 38, r: 12, t: 12, b: 26 }, L = S.out ? 6.5 : 5;
      const X = v => pad.l + (v + L) / (2 * L) * (w - pad.l - pad.r);
      const bw = Math.max(0.12, 3.49 * n ** (-1 / 3));
      const nb = Math.ceil(2 * L / bw), cnt = new Array(nb).fill(0);
      for (const x of xs) { const i = Math.floor((x + L) / bw); if (i >= 0 && i < nb) cnt[i]++; }
      const dens = cnt.map(c => c / n / bw);
      let ymax = 0.45; for (const d of dens) ymax = Math.max(ymax, d); for (let x = -L; x <= L; x += 0.05) ymax = Math.max(ymax, pdf(x));
      ymax = Math.min(ymax * 1.08, 1.2);
      const Y = v => h - pad.b - Math.min(v, ymax) / ymax * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      const ys = ymax > 0.8 ? 0.2 : 0.1;
      for (let v = ys; v < ymax; v += ys) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent; ctx.globalAlpha = .45;
      dens.forEach((d, i) => { if (!d) return; const x0 = X(-L + i * bw), x1 = X(-L + (i + 1) * bw); ctx.fillRect(x0, Y(d), Math.max(1, x1 - x0 - 1), h - pad.b - Y(d)); });
      ctx.globalAlpha = 1;
      // normal de referencia y densidad verdadera
      ctx.strokeStyle = muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = -L + 2 * L * i / 200; i ? ctx.lineTo(X(x), Y(npdf(x, 0, 1))) : ctx.moveTo(X(x), Y(npdf(x, 0, 1))); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const x = -L + 2 * L * i / 400; i ? ctx.lineTo(X(x), Y(pdf(x))) : ctx.moveTo(X(x), Y(pdf(x))); }
      ctx.stroke();
      if (S.out) { ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(6), h - pad.b - 6, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'center';
      const xs2 = (w - pad.l - pad.r) / (2 * L) < 22 ? 2 : 1;
      for (let v = -Math.floor(L / xs2) * xs2; v <= L; v += xs2) ctx.fillText(sg(v, 0), X(v), h - 8);
      ctx.textAlign = 'right';
      for (let v = 0; v < ymax; v += ys) ctx.fillText(fmt(v, 1), pad.l - 6, Y(v) + 4);
    }

    // ---------- Q-Q normal ----------
    f = fit($('forma-qq'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 38, r: 12, t: 12, b: 26 };
      const s = xs.map(x => (x - mo.m) / mo.sd).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(n / 600)), pts = [];
      for (let i = 0; i < n; i += step) pts.push([qnorm((i + 0.5) / n), s[i]]);
      if ((n - 1) % step) pts.push([qnorm((n - 0.5) / n), s[n - 1]]);
      let L = 3.5; for (const [a, b] of pts) L = Math.max(L, Math.abs(a), Math.abs(b)); L = Math.min(Math.ceil(L), 8);
      const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
      const X = v => pad.l + (v + L) / (2 * L) * pw, Y = v => h - pad.b - (v + L) / (2 * L) * ph;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      const gs = L > 5 ? 2 : 1;
      for (let v = -L; v <= L; v += gs) { const x = Math.round(X(v)) + .5, y = Math.round(Y(v)) + .5;
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(-L), Y(-L)); ctx.lineTo(X(L), Y(L)); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
      ctx.fillStyle = accent; ctx.globalAlpha = .7;
      for (const [a, b] of pts) { ctx.beginPath(); ctx.arc(X(a), Y(b), 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (S.out) { const z = (6 - mo.m) / mo.sd; ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(qnorm((n - 0.5) / n)), Y(z), 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = muted; ctx.font = mono; ctx.textAlign = 'center';
      for (let v = -L; v <= L; v += gs * (pw < 240 && L > 4 ? 2 : 1)) ctx.fillText(sg(v, 0), X(v), h - 8);
      ctx.textAlign = 'right';
      for (let v = -L; v <= L; v += gs * (L > 4 ? 2 : 1)) ctx.fillText(sg(v, 0), pad.l - 6, Y(v) + 4);
    }
  }

  const pEl = $('forma-p'), nEl = $('forma-n');
  function setFam(fam) {
    S.fam = fam; const F = FAM[fam];
    pEl.min = F.min; pEl.max = F.max; pEl.step = F.step; pEl.value = F.def; S.p = F.def;
    $('forma-p-label').innerHTML = F.label + ' = <b id="forma-p-v" class="num">' + sg(F.def, F.step < 1 ? 1 : 0) + '</b>';
  }
  pEl.addEventListener('input', () => { S.p = +pEl.value; $('forma-p-v').textContent = sg(S.p, FAM[S.fam].step < 1 ? 1 : 0); sample(); draw(); });
  nEl.addEventListener('input', () => { S.n = +nEl.value; $('forma-n-v').textContent = S.n; sample(); draw(); });
  segBind('forma-fam', b => { setFam(b.dataset.f); sample(); draw(); });
  segBind('forma-out', b => { S.out = +b.dataset.o; draw(); });
  $('forma-again').addEventListener('click', () => { sample(); draw(); });

  M.draw['forma'] = draw;
  M.init.push(() => { sample(); draw(); });
})();
