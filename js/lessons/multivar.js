/* StatEdx · sesión multivar: Exploración multivariada */
(() => {
  const { fit, tok, fmt, pct, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const sgn = (v, d = 2) => (v < 0 ? '−' : '') + fmt(Math.abs(v), d);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  function corr(a, b) {
    const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
  }
  function ranks(a) {           // rangos con empates promediados
    const idx = a.map((v, i) => i).sort((i, j) => a[i] - a[j]), r = new Array(a.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1; }
    return r;
  }
  const niceStep = (range, n) => { const raw = range / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p; return 10 * p; };

  // ================= laboratorio 1: matriz de correlaciones =================
  const VARS = ['Superficie', 'Habitaciones', 'Baños', 'Distancia', 'Antigüedad', 'Precio'];
  const ABBR = ['Sup', 'Hab', 'Bañ', 'Dist', 'Antig', 'Precio'];
  const UNIT = ['m²', '', '', 'km', 'años', 'miles'];
  const HM = { n: 300, m: 'p', o: 'orig', cols: [], R: [], Rs: [], order: [0, 1, 2, 3, 4, 5], sel: [3, 5], layout: null };
  const clip = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function sample() {
    const c = VARS.map(() => []);
    for (let i = 0; i < HM.n; i++) {
      const S = randn(), dist = Math.exp(Math.log(8) + 0.25 * S + 0.45 * randn());
      const ant = clip(30 - 1.2 * (dist - 8) + 10 * randn(), 0, 70);
      c[0].push(Math.exp(Math.log(90) + 0.35 * S));
      c[1].push(clip(Math.round(3 + 0.9 * S + 0.6 * randn()), 1, 6));
      c[2].push(clip(Math.round(1.6 + 0.6 * S + 0.5 * randn()), 1, 4));
      c[3].push(dist);
      c[4].push(ant);
      c[5].push(Math.exp(Math.log(150) + 0.32 * S - 0.05 * (dist - 8) - 0.004 * (ant - 25) + 0.15 * randn()));
    }
    HM.cols = c;
    const rk = c.map(ranks), p = VARS.length;
    HM.R = []; HM.Rs = [];
    for (let i = 0; i < p; i++) { HM.R.push([]); HM.Rs.push([]); for (let j = 0; j < p; j++) { HM.R[i].push(i === j ? 1 : corr(c[i], c[j])); HM.Rs[i].push(i === j ? 1 : corr(rk[i], rk[j])); } }
    reorder(); drawHM();
  }
  // agrupamiento jerárquico (enlace promedio) con distancia 1 − |r|; el orden de las hojas da el reordenamiento
  function clusterOrder(R) {
    let cl = R.map((_, i) => [i]);
    const d = (A, B) => { let s = 0; for (const a of A) for (const b of B) s += 1 - Math.abs(R[a][b]); return s / (A.length * B.length); };
    while (cl.length > 1) {
      let bi = 0, bj = 1, bd = Infinity;
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const v = d(cl[i], cl[j]); if (v < bd) { bd = v; bi = i; bj = j; } }
      const merged = cl[bi].concat(cl[bj]); cl = cl.filter((_, k) => k !== bi && k !== bj); cl.push(merged);
    }
    return cl[0];
  }
  function reorder() { const R = HM.m === 'p' ? HM.R : HM.Rs; HM.order = HM.o === 'clus' ? clusterOrder(R) : [0, 1, 2, 3, 4, 5]; }
  segBind('multivar-met', b => { HM.m = b.dataset.m; reorder(); drawHM(); });
  segBind('multivar-ord', b => { HM.o = b.dataset.o; reorder(); drawHM(); });
  const nEl = $('multivar-n');
  nEl.addEventListener('input', () => { HM.n = +nEl.value; $('multivar-n-v').textContent = HM.n; sample(); });
  $('multivar-new').addEventListener('click', sample);
  $('multivar-c-hm').addEventListener('click', e => {
    const L = HM.layout; if (!L) return;
    const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const ci = Math.floor((x - L.x0) / L.cell), ri = Math.floor((y - L.y0) / L.cell);
    if (ci < 0 || ri < 0 || ci >= 6 || ri >= 6 || ci === ri) return;
    HM.sel = [HM.order[ci], HM.order[ri]]; drawHM();
  });

  function partial(i, j, z) {
    const R = HM.R; const a = R[i][j] - R[i][z] * R[j][z], b = Math.sqrt((1 - R[i][z] ** 2) * (1 - R[j][z] ** 2));
    return b > 1e-9 ? a / b : NaN;
  }
  function drawHM() {
    if (!HM.cols.length) return;
    const [xi, yi] = HM.sel, R = HM.m === 'p' ? HM.R : HM.Rs;
    $('multivar-r').textContent = sgn(HM.R[xi][yi]);
    $('multivar-rho').textContent = sgn(HM.Rs[xi][yi]);
    $('multivar-rp').textContent = xi === 0 || yi === 0 ? '–' : sgn(partial(xi, yi, 0));
    $('multivar-thr').textContent = fmt(2 / Math.sqrt(HM.n), 2);
    $('multivar-hm-head').textContent = (HM.m === 'p' ? 'Pearson' : 'Spearman') + ' · n = ' + HM.n;
    $('multivar-pair-lbl').textContent = VARS[xi] + ' vs ' + VARS[yi];
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // ---- mapa de calor ----
    let f = fit($('multivar-c-hm'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const lab = 48, top = 22, p = 6;
      const cell = Math.min((w - lab - 6) / p, (h - top - 6) / p);
      const x0 = lab + (w - lab - 6 - cell * p) / 2, y0 = top;
      HM.layout = { x0, y0, cell };
      const ord = HM.order;
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
        const v = R[ord[b]][ord[a]], x = x0 + a * cell, y = y0 + b * cell;
        ctx.fillStyle = v >= 0 ? accent : hot; ctx.globalAlpha = a === b ? .12 : Math.max(.06, Math.abs(v) * .9);
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ctx.globalAlpha = 1;
        const strong = Math.abs(v) > .55 && a !== b;
        ctx.fillStyle = strong ? tok('--bg') : ink; ctx.font = (cell < 40 ? '10px ' : '11px ') + tok('--f-mono'); ctx.textAlign = 'center';
        ctx.fillText(a === b ? '1' : sgn(v, cell < 40 ? 1 : 2), x + cell / 2, y + cell / 2 + 4);
      }
      // celdas seleccionadas
      const ca = ord.indexOf(xi), cb = ord.indexOf(yi);
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.strokeRect(x0 + ca * cell + 1, y0 + cb * cell + 1, cell - 2, cell - 2);
      ctx.globalAlpha = .5; ctx.strokeRect(x0 + cb * cell + 1, y0 + ca * cell + 1, cell - 2, cell - 2); ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = mono();
      for (let k = 0; k < p; k++) {
        ctx.textAlign = 'right'; ctx.fillText(ABBR[ord[k]], x0 - 6, y0 + (k + .5) * cell + 4);
        ctx.textAlign = 'center'; ctx.fillText(ABBR[ord[k]], x0 + (k + .5) * cell, top - 8);
      }
    }

    // ---- dispersión del par ----
    f = fit($('multivar-c-sc'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const xs = HM.cols[xi], ys = HM.cols[yi], n = xs.length;
      const pad = { l: 44, r: 12, t: 12, b: 36 };
      const ext = a => { let lo = Infinity, hi = -Infinity; for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); } const s = (hi - lo) || 1; return [lo - s * .05, hi + s * .05]; };
      const [xl, xh] = ext(xs), [yl, yh] = ext(ys);
      const X = v => pad.l + (v - xl) / (xh - xl) * (w - pad.l - pad.r), Y = v => h - pad.b - (v - yl) / (yh - yl) * (h - pad.t - pad.b);
      const sx = niceStep(xh - xl, w < 340 ? 4 : 6), sy = niceStep(yh - yl, 5);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      for (let v = Math.ceil(xl / sx) * sx; v <= xh; v += sx) { const xx = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      for (let v = Math.ceil(yl / sy) * sy; v <= yh; v += sy) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // puntos (las variables discretas se dibujan con un leve desplazamiento para que no se tapen)
      const jx = xi === 1 || xi === 2 ? .3 : 0, jy = yi === 1 || yi === 2 ? .3 : 0;
      ctx.fillStyle = accent; ctx.globalAlpha = n > 300 ? .4 : .6;
      for (let i = 0; i < n; i++) { const dx = jx * (((i * 7919) % 101) / 100 - .5), dy = jy * (((i * 104729) % 97) / 96 - .5); ctx.beginPath(); ctx.arc(X(xs[i] + dx), Y(ys[i] + dy), 2.6, 0, 2 * Math.PI); ctx.fill(); }
      ctx.globalAlpha = 1;
      // recta MCO
      const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
      const b1 = sxy / sxx, b0 = my - b1 * mx;
      ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(xl), Y(b0 + b1 * xl)); ctx.lineTo(X(xh), Y(b0 + b1 * xh)); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      const dsx = sx < 1 ? 1 : 0, dsy = sy < 1 ? 1 : 0;
      for (let v = Math.ceil(xl / sx) * sx; v <= xh; v += sx) ctx.fillText(fmt(v, dsx).replace(/\./g, ' '), X(v), h - pad.b + 15);
      ctx.fillText(VARS[xi] + (UNIT[xi] ? ' (' + UNIT[xi] + ')' : ''), (pad.l + w - pad.r) / 2, h - 4);
      ctx.textAlign = 'right';
      for (let v = Math.ceil(yl / sy) * sy; v <= yh; v += sy) ctx.fillText(fmt(v, dsy).replace(/\./g, ' '), pad.l - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.fillText(VARS[yi] + (UNIT[yi] ? ' (' + UNIT[yi] + ')' : ''), pad.l + 6, pad.t + 12);
    }
  }

  // ================= laboratorio 2: coordenadas paralelas =================
  const PV = ['Visitas/mes', 'Ticket', 'Edad', 'Antigüedad', 'Ingreso'];
  const ORDERS = [[0, 1, 2, 3, 4], [2, 0, 3, 4, 1]];
  const SEG = [   // medias y desviaciones por segmento: visitas, ticket, edad, antigüedad, ingreso
    { m: [12, 22, 27, 2, 1.8], s: [3, 6, 4, 1, 0.5] },
    { m: [6, 80, 40, 5, 3.2], s: [2, 18, 6, 2, 0.8] },
    { m: [4, 45, 62, 14, 2.4], s: [1.5, 10, 6, 4, 0.7] },
  ];
  const PC = { g: -1, ord: 0, alpha: 0.35, rows: [] };
  (function makeClients() {
    for (let g = 0; g < 3; g++) for (let i = 0; i < 50; i++) PC.rows.push({ g, v: SEG[g].m.map((m, j) => Math.max(j === 0 ? 1 : 0.2, m + SEG[g].s[j] * randn())) });
    PC.lo = PV.map((_, j) => Math.min(...PC.rows.map(r => r.v[j])));
    PC.hi = PV.map((_, j) => Math.max(...PC.rows.map(r => r.v[j])));
  })();
  segBind('multivar-hl', b => { PC.g = +b.dataset.g; drawPC(); });
  segBind('multivar-ax', b => { PC.ord = +b.dataset.a; drawPC(); });
  const aEl = $('multivar-alpha');
  aEl.addEventListener('input', () => { PC.alpha = +aEl.value / 100; $('multivar-alpha-v').textContent = aEl.value + ' %'; drawPC(); });

  function eta2(j) {   // proporción de varianza explicada por el factor (grupo resaltado vs resto, o los 3 segmentos)
    const lab = r => PC.g < 0 ? r.g : (r.g === PC.g ? 1 : 0);
    const all = PC.rows.map(r => r.v[j]), m = mean(all);
    const tot = all.reduce((s, v) => s + (v - m) ** 2, 0);
    const groups = new Map(); PC.rows.forEach(r => { const k = lab(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.v[j]); });
    let between = 0; groups.forEach(a => { between += a.length * (mean(a) - m) ** 2; });
    return between / tot;
  }
  function drawPC() {
    const ord = ORDERS[PC.ord];
    const etas = PV.map((_, j) => eta2(j)); let best = 0; etas.forEach((v, j) => { if (v > etas[best]) best = j; });
    $('multivar-pc-n').textContent = PC.g < 0 ? '0 de 150' : '50 de 150';
    $('multivar-pc-ax').textContent = PV[best];
    $('multivar-pc-eta').textContent = pct(etas[best], 0);
    $('multivar-pc-r').textContent = sgn(corr(PC.rows.map(r => r.v[ord[0]]), PC.rows.map(r => r.v[ord[1]])));
    $('multivar-pc-head').textContent = PC.g < 0 ? '150 clientes · 3 segmentos' : 'segmento ' + 'ABC'[PC.g] + ' resaltado';
    const f = fit($('multivar-c-pc')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 30, r: 30, t: 34, b: 30 }, k = ord.length;
    const AX = i => pad.l + i * (w - pad.l - pad.r) / (k - 1);
    const Y = (j, v) => h - pad.b - (v - PC.lo[j]) / (PC.hi[j] - PC.lo[j]) * (h - pad.t - pad.b);
    const drawRow = r => { ctx.beginPath(); ord.forEach((j, i) => { const x = AX(i), y = Y(j, r.v[j]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
    ctx.lineWidth = 1.2;
    for (const r of PC.rows) { if (PC.g >= 0 && r.g === PC.g) continue; ctx.strokeStyle = PC.g < 0 ? accent : muted; ctx.globalAlpha = PC.g < 0 ? PC.alpha : PC.alpha * .5; drawRow(r); }
    if (PC.g >= 0) { ctx.strokeStyle = hot; ctx.lineWidth = 1.6; ctx.globalAlpha = Math.min(1, PC.alpha + .25); for (const r of PC.rows) if (r.g === PC.g) drawRow(r); }
    ctx.globalAlpha = 1;
    // ejes
    ctx.font = mono();
    ord.forEach((j, i) => {
      const x = Math.round(AX(i)) + .5;
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
      ctx.fillStyle = j === best ? hot : ink; ctx.textAlign = i === 0 ? 'left' : i === k - 1 ? 'right' : 'center';
      const lx = i === 0 ? x - pad.l + 4 : i === k - 1 ? x + pad.r - 4 : x;
      const name = w < 420 ? PV[j].replace('Visitas/mes', 'Visitas').replace('Antigüedad', 'Antig.') : PV[j];
      ctx.fillText(name, lx, pad.t - 18);
      ctx.fillStyle = muted;
      const d = PC.hi[j] < 10 ? 1 : 0;
      ctx.fillText(fmt(PC.hi[j], d), lx, pad.t - 5);
      ctx.fillText(fmt(PC.lo[j], d), lx, h - pad.b + 15);
    });
  }

  M.draw.multivar = () => { drawHM(); drawPC(); };
  M.init.push(() => { sample(); drawPC(); });
})();
