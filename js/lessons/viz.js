/* StatEdx · clase 12, visualización de datos */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;

  // ---------- simulador 1: cuarteto de Anscombe ----------
  const XS = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
  const ANS = [
    { name: 'I', desc: 'lineal con ruido', x: XS, y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68], hot: -1 },
    { name: 'II', desc: 'una curva, no una recta', x: XS, y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74], hot: -1 },
    { name: 'III', desc: 'recta perfecta + un atípico', x: XS, y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73], hot: 2 },
    { name: 'IV', desc: 'un punto decide todo', x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89], hot: 7 },
  ];
  const A = { k: 0, res: false };
  function stats(x, y) {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
    const b = sxy / sxx;
    return { mx, my, vx: sxx / (n - 1), vy: syy / (n - 1), r: sxy / Math.sqrt(sxx * syy), b, a: my - b * mx };
  }
  function drawAns() {
    const D = ANS[A.k], S = stats(D.x, D.y);
    document.getElementById('viz-a-my').textContent = fmt(S.my, 2);
    document.getElementById('viz-a-vy').textContent = fmt(S.vy, 2);
    document.getElementById('viz-a-r').textContent = fmt(S.r, 3);
    document.getElementById('viz-a-fit').textContent = `${fmt(S.a, 2)} + ${fmt(S.b, 2)}x`;
    document.getElementById('viz-a-head').textContent = `media x = ${fmt(S.mx, 0)} · var x = ${fmt(S.vx, 0)}`;
    document.getElementById('viz-a-lab').textContent = `Conjunto ${D.name} · ${D.desc}`;

    const f = fit(document.getElementById('viz-ans')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 14, t: 14, b: 28 }, x0 = 2, x1 = 20, y0 = 2, y1 = 14;
    const X = v => pad.l + (v - x0) / (x1 - x0) * (w - pad.l - pad.r);
    const Y = v => h - pad.b - (v - y0) / (y1 - y0) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = 4; v <= 14; v += 2) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
    for (let v = 4; v <= 20; v += 4) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // residuos
    if (A.res) {
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      D.x.forEach((xv, i) => { const yh = S.a + S.b * xv; ctx.beginPath(); ctx.moveTo(Math.round(X(xv)) + .5, Y(D.y[i])); ctx.lineTo(Math.round(X(xv)) + .5, Y(yh)); ctx.stroke(); });
      ctx.setLineDash([]);
    }
    // recta
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x0), Y(S.a + S.b * x0)); ctx.lineTo(X(x1), Y(S.a + S.b * x1)); ctx.stroke();
    // puntos
    const bg = tok('--bg');
    D.x.forEach((xv, i) => {
      ctx.fillStyle = i === D.hot ? hot : accent; ctx.strokeStyle = bg; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(xv), Y(D.y[i]), i === D.hot ? 6.5 : 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // ejes
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let v = 4; v <= 20; v += 4) ctx.fillText(v, X(v), h - 9);
    ctx.textAlign = 'right';
    for (let v = 4; v <= 14; v += 2) ctx.fillText(v, pad.l - 6, Y(v) + 4);
    ctx.textAlign = 'right'; ctx.fillText('x', w - pad.r, h - pad.b - 6);
    ctx.textAlign = 'left'; ctx.fillText('y', pad.l + 6, pad.t + 10);
  }
  segBind('viz-set', b => { A.k = +b.dataset.k; drawAns(); });
  segBind('viz-res', b => { A.res = b.dataset.r === '1'; drawAns(); });

  // ---------- simulador 2: barras, pastel o puntos ----------
  const SALES = [['Electrónica', 412], ['Hogar', 398], ['Ropa', 385], ['Deportes', 371], ['Juguetes', 356]];
  const B = { kind: 'bar', trunc: false };
  const axisBtns = () => document.querySelectorAll('#viz-axis button');
  function drawSales() {
    const max = SALES[0][1], min = SALES[SALES.length - 1][1], real = max / min - 1;
    const base = B.trunc ? 340 : 0;
    let seen, lie, note;
    if (B.kind === 'bar') { seen = (max - base) / (min - base) - 1; lie = seen / real; note = B.trunc ? 'la longitud ya no es proporcional' : 'longitud proporcional al valor'; }
    else if (B.kind === 'dot') { seen = null; note = B.trunc ? 'se lee la posición: truncar es válido' : 'se lee la posición sobre el eje'; }
    else { seen = real; lie = 1; note = 'ángulos casi iguales: difícil ordenar'; }
    axisBtns().forEach(x => { x.disabled = B.kind === 'pie'; x.style.opacity = B.kind === 'pie' ? .45 : ''; });
    document.getElementById('viz-b-real').textContent = '+' + pct(real, 1);
    document.getElementById('viz-b-seen').textContent = seen === null ? 'posición' : '+' + pct(seen, 1);
    document.getElementById('viz-b-lie').textContent = B.kind === 'dot' ? 'no aplica' : fmt(lie, 1);
    document.getElementById('viz-b-zero').textContent = B.kind === 'pie' ? 'sin eje' : String(base);
    document.getElementById('viz-b-note').textContent = note;
    document.getElementById('viz-b-head').textContent = B.kind === 'bar' && B.trunc ? 'gráfico engañoso' : B.kind === 'pie' ? 'difícil de comparar' : 'gráfico honesto';

    const f = fit(document.getElementById('viz-sales')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const mono = tok('--f-mono');
    if (B.kind === 'pie') {
      const cols = ['--accent', '--r-mod', '--r-ds', '--hot', '--muted'].map(tok);
      const total = SALES.reduce((s, d) => s + d[1], 0);
      const wide = w >= 460;
      const r = Math.min(h / 2 - 18, wide ? w * 0.2 : w * 0.24);
      const cx = wide ? w * 0.32 : r + 16, cy = h / 2;
      let a0 = -Math.PI / 2;
      SALES.forEach((d, i) => {
        const a1 = a0 + d[1] / total * Math.PI * 2;
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.stroke();
        a0 = a1;
      });
      const lx = cx + r + (wide ? 36 : 18), rowH = 22, ly0 = cy - (SALES.length - 1) * rowH / 2;
      ctx.font = '12px ' + mono; ctx.textAlign = 'left';
      SALES.forEach((d, i) => {
        const y = ly0 + i * rowH;
        ctx.fillStyle = cols[i]; ctx.fillRect(lx, y - 8, 10, 10);
        ctx.fillStyle = ink; ctx.fillText(d[0], lx + 16, y + 1);
      });
      return;
    }
    const pad = { l: 92, r: 18, t: 12, b: 28 };
    const lo = base, hi = 440;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const rowH = (h - pad.t - pad.b) / SALES.length;
    const step = B.trunc ? 20 : (w < 480 ? 200 : 100);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    SALES.forEach((d, i) => {
      const yc = pad.t + rowH * (i + .5);
      if (B.kind === 'bar') {
        const bh = Math.min(26, rowH * .62);
        ctx.fillStyle = accent; ctx.globalAlpha = i === 0 ? 1 : .55;
        ctx.fillRect(X(lo), yc - bh / 2, X(d[1]) - X(lo), bh); ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Math.round(yc) + .5); ctx.lineTo(w - pad.r, Math.round(yc) + .5); ctx.stroke();
        ctx.fillStyle = accent; ctx.globalAlpha = i === 0 ? 1 : .7; ctx.beginPath(); ctx.arc(X(d[1]), yc, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = ink; ctx.font = '12px ' + mono; ctx.textAlign = 'right';
      ctx.fillText(d[0], pad.l - 8, yc + 4);
      ctx.fillStyle = muted; ctx.font = '11px ' + mono; ctx.textAlign = 'left';
      const lx = X(d[1]) + (B.kind === 'bar' ? 5 : 10);
      if (lx + 24 < w) ctx.fillText(d[1], lx, yc + 4);
    });
    // eje base
    ctx.strokeStyle = B.trunc && B.kind === 'bar' ? tok('--hot') : muted; ctx.lineWidth = B.trunc && B.kind === 'bar' ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(Math.round(X(lo)) + .5, pad.t); ctx.lineTo(Math.round(X(lo)) + .5, h - pad.b); ctx.stroke();
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + mono; ctx.textAlign = 'center';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ctx.fillText(v, Math.min(X(v), w - pad.r - 10), h - 9);
  }
  segBind('viz-kind', b => { B.kind = b.dataset.k; drawSales(); });
  segBind('viz-axis', b => { B.trunc = b.dataset.z === '1'; drawSales(); });

  M.draw['viz'] = () => { drawAns(); drawSales(); };
  M.init.push(() => { drawAns(); drawSales(); });
})();
