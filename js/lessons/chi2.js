/* StatEdx · sesión chi2: Pruebas chi-cuadrado */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  // ---------- distribuciones (gamma y beta incompletas) ----------
  function lgam(x) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgam(1 - x);
    x -= 1; let a = c[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const tiny = 1e-30, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < tiny) d = tiny; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const ln = -x + a * Math.log(x) - lgam(a);
    if (x < a + 1) { let s = 1 / a, t = s; for (let n = 1; n < 500; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < Math.abs(s) * 1e-15) break; } return s * Math.exp(ln); }
    const tiny = 1e-30; let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < tiny) d = tiny; c = b + an / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(ln) * h;
  }
  const chisf = (x, k) => x <= 0 ? 1 : 1 - gammaP(k / 2, x / 2);
  const chipdf = (x, k) => x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgam(k / 2));
  function chiinv(p, k) { let lo = 0, hi = 500; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; chisf(m, k) > p ? lo = m : hi = m; } return (lo + hi) / 2; }
  const pfmt = p => p < 0.0001 ? '< 0,0001' : fmt(p, p < 0.01 ? 4 : 3);
  const sgn = (x, d) => (x < 0 ? '−' : x > 0 ? '+' : '') + fmt(Math.abs(x), d);

  // ================= dado =================
  const D = { p6: 1 / 6, n: 120, u: [] };
  const dRoll = () => { D.u = Array.from({ length: 1200 }, Math.random); drawDice(); };
  function drawDice() {
    if (!D.u.length) return;
    const pr = [1, 2, 3, 4, 5].map(() => (1 - D.p6) / 5).concat([D.p6]);
    const cum = []; pr.reduce((s, v, i) => (cum[i] = s + v), 0);
    const O = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < D.n; i++) { const u = D.u[i]; let c = 0; while (c < 5 && u > cum[c]) c++; O[c]++; }
    const E = D.n / 6, contrib = O.map(o => (o - E) ** 2 / E), x2 = contrib.reduce((s, v) => s + v, 0), p = chisf(x2, 5);
    $('chi2-d-x2').textContent = fmt(x2, 2);
    $('chi2-d-p').textContent = pfmt(p);
    $('chi2-d-e').textContent = fmt(E, 1);
    $('chi2-d-r6').textContent = sgn((O[5] - E) / Math.sqrt(E), 2);
    $('chi2-d-head').textContent = p < 0.05 ? 'se rechaza que el dado sea justo' : 'compatible con un dado justo';
    $('chi2-d-lbl').textContent = 'crítico 11,07';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    let f = fit($('chi2-c-dado'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 10, t: 22, b: 26 };
      let top = Math.max(...O, E) * 1.12; const step = top > 400 ? 100 : top > 200 ? 50 : top > 80 ? 20 : top > 40 ? 10 : 5;
      top = Math.ceil(top / step) * step;
      const Y = v => h - pad.b - v / top * (h - pad.t - pad.b);
      const bw = (w - pad.l - pad.r) / 6;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = 0; v <= top; v += step) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      O.forEach((o, i) => {
        const x = pad.l + bw * i + bw * 0.18, bwi = bw * 0.64;
        ctx.fillStyle = o > E ? hot : accent; ctx.globalAlpha = .75; ctx.fillRect(x, Y(o), bwi, Y(0) - Y(o)); ctx.globalAlpha = 1;
        ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
        ctx.fillText(i + 1, x + bwi / 2, h - 8);
        ctx.fillStyle = ink; ctx.fillText(fmt(contrib[i], contrib[i] >= 10 ? 0 : 1), x + bwi / 2, 14);
      });
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, Math.round(Y(E)) + .5); ctx.lineTo(w - pad.r, Math.round(Y(E)) + .5); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'right';
      for (let v = 0; v <= top; v += step) ctx.fillText(v, pad.l - 6, Math.max(Y(v) + 4, pad.t + 4));
    }
    drawChiDist($('chi2-c-dist'), x2, 5);
  }
  function drawChiDist(cv, x2, k) {
    const f = fit(cv); if (!f) return;
    const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line');
    const pad = { l: 12, r: 12, t: 30, b: 26 };
    const crit = chiinv(0.05, k), xmax = Math.ceil(crit * 2 / 5) * 5;
    const X = v => pad.l + v / xmax * (w - pad.l - pad.r);
    let peak = 0; for (let i = 1; i <= 200; i++) peak = Math.max(peak, chipdf(xmax * i / 200, k)); peak *= 1.1;
    const Y = d => h - pad.b - Math.min(d, peak) / peak * (h - pad.t - pad.b);
    const step = xmax > 20 ? 5 : xmax > 10 ? 2 : 1;
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = 0; v <= xmax; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const xv = Math.min(x2, xmax);
    ctx.fillStyle = hot; ctx.globalAlpha = .35; ctx.beginPath(); ctx.moveTo(X(xv), Y(0));
    for (let i = 0; i <= 120; i++) { const v = xv + (xmax - xv) * i / 120; ctx.lineTo(X(v), Y(chipdf(v, k))); }
    ctx.lineTo(X(xmax), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 1; i <= 300; i++) { const v = xmax * i / 300, y = Y(chipdf(v, k)); i > 1 ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); }
    ctx.stroke();
    ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(X(crit)) + .5, pad.t + 28); ctx.lineTo(Math.round(X(crit)) + .5, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillText('5 %', X(crit) + 5, pad.t + 44);
    const fx = X(xv);
    ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(fx, pad.t - 4); ctx.lineTo(fx, h - pad.b); ctx.stroke();
    ctx.fillStyle = hot; ctx.font = '600 12px ' + tok('--f-mono');
    ctx.textAlign = fx > w - 70 ? 'right' : fx < 60 ? 'left' : 'center';
    ctx.fillText('χ² = ' + fmt(x2, 2) + (x2 > xmax ? ' →' : ''), fx, pad.t - 10);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let v = 0; v <= xmax; v += step) ctx.fillText(v, Math.min(Math.max(X(v), pad.l + 6), w - pad.r - 8), h - 8);
  }
  const bias = $('chi2-d-bias'), dn = $('chi2-d-n');
  bias.addEventListener('input', () => { D.p6 = +bias.value; $('chi2-d-bias-v').textContent = pct(D.p6, 1); drawDice(); });
  dn.addEventListener('input', () => { D.n = +dn.value; $('chi2-d-n-v').textContent = D.n; drawDice(); });
  $('chi2-d-roll').addEventListener('click', dRoll);

  // ================= tabla de contingencia =================
  const T = { a: 0.5, n: 100, u: [] };
  const BASE = [0.40, 0.425, 0.175], DELTA = [-0.2, 0.05, 0.15];
  const ROWS = ['Centro', 'Periferia'], COLS = ['Auto', 'Público', 'Bici'];
  const tNew = () => { T.u = [0, 1].map(() => Array.from({ length: 1000 }, Math.random)); drawTable(); };
  function drawTable() {
    if (!T.u.length) return;
    const O = [0, 1].map(r => {
      const p = BASE.map((b, j) => b + (r ? -1 : 1) * T.a * DELTA[j]);
      const row = [0, 0, 0];
      for (let i = 0; i < T.n; i++) { const u = T.u[r][i]; row[u < p[0] ? 0 : u < p[0] + p[1] ? 1 : 2]++; }
      return row;
    });
    const n = 2 * T.n, rt = O.map(r => r[0] + r[1] + r[2]), ct = [0, 1, 2].map(j => O[0][j] + O[1][j]);
    let x2 = 0; const R = O.map((row, i) => row.map((o, j) => { const E = rt[i] * ct[j] / n; if (E > 0) x2 += (o - E) ** 2 / E; return E > 0 ? (o - E) / Math.sqrt(E) : 0; }));
    const p = chisf(x2, 2), V = Math.sqrt(x2 / n);
    $('chi2-t-x2').textContent = fmt(x2, 2);
    $('chi2-t-p').textContent = pfmt(p);
    $('chi2-t-v').textContent = fmt(V, 3);
    const minE = Math.min(...[0, 1].flatMap(i => [0, 1, 2].map(j => rt[i] * ct[j] / n)));
    $('chi2-t-head').textContent = `n = ${n} · mínimo esperado = ${fmt(minE, 1)}`;
    const f = fit($('chi2-c-mosaic')); if (!f) return;
    const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), bg = tok('--bg');
    const pad = { l: 12, r: 12, t: 12, b: 26 }, gap = 6;
    const W = w - pad.l - pad.r - gap, H = h - pad.t - pad.b;
    const cw = W / 2, labels = [];
    O.forEach((row, i) => {
      const x = pad.l + i * (cw + gap); let y = pad.t;
      row.forEach((o, j) => {
        const hh = rt[i] ? o / rt[i] * H : 0, r = R[i][j];
        ctx.fillStyle = r > 0 ? hot : accent; ctx.globalAlpha = 0.12 + Math.min(Math.abs(r) / 3, 1) * 0.6;
        ctx.fillRect(x, y, cw, hh); ctx.globalAlpha = 1;
        ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, hh);
        labels.push({ x, y, hh, o, r, j, i });
        y += hh;
      });
      // alturas esperadas bajo independencia
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.globalAlpha = .7;
      let cy = pad.t;
      for (let j = 0; j < 2; j++) { cy += ct[j] / n * H; ctx.beginPath(); ctx.moveTo(x, Math.round(cy) + .5); ctx.lineTo(x + cw, Math.round(cy) + .5); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center'; ctx.fillText(`${ROWS[i]} (n = ${rt[i]})`, x + cw / 2, h - 8);
    });
    ctx.textAlign = 'left';
    for (const { x, y, hh, o, r, j, i } of labels) {
      if (hh > 38) {
        ctx.fillStyle = ink; ctx.font = '600 12px ' + tok('--f-mono'); ctx.fillText(`${COLS[j]} · ${o}`, x + 8, y + 17);
        ctx.fillStyle = muted; ctx.font = mono(); ctx.fillText(`${pct(o / rt[i], 0)} · r = ${sgn(r, 2)}`, x + 8, y + 32);
      } else if (hh > 13) {
        ctx.fillStyle = ink; ctx.font = mono(); ctx.fillText(`${COLS[j]} · ${o} · r = ${sgn(r, 1)}`, x + 8, y + hh / 2 + 4);
      }
    }
  }
  const ta = $('chi2-t-a'), tn = $('chi2-t-n');
  ta.addEventListener('input', () => { T.a = +ta.value; $('chi2-t-a-v').textContent = fmt(T.a, 2); drawTable(); });
  tn.addEventListener('input', () => { T.n = +tn.value; $('chi2-t-n-v').textContent = T.n; drawTable(); });
  $('chi2-t-again').addEventListener('click', tNew);

  M.draw['chi2'] = () => { drawDice(); drawTable(); };
  M.init.push(() => { dRoll(); tNew(); });
})();
