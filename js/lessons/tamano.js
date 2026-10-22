/* StatEdx · sesión tamano: Tamaño de muestra y diseño de encuestas */
(() => {
  const { fit, tok, fmt, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const miles = x => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const Z = { '0.90': 1.644854, '0.95': 1.959964, '0.99': 2.575829 };

  const S = { tipo: 'p', conf: '0.95', N: 50000, e: 3, p: 50, sigma: 12, deff: 1.5, tr: 60 };
  const eEl = $('tamano-e'), vEl = $('tamano-v'), dEl = $('tamano-deff'), tEl = $('tamano-tr');

  // e en las unidades del problema: puntos porcentuales o unidades de la variable
  function sizes(e) {
    const z = Z[S.conf];
    const v = S.tipo === 'p' ? (S.p / 100) * (1 - S.p / 100) : S.sigma ** 2;
    const ee = S.tipo === 'p' ? e / 100 : e;
    const n0 = z * z * v / (ee * ee), n1 = n0 * S.deff;
    const n2 = S.N ? n1 / (1 + (n1 - 1) / S.N) : n1;
    return { n0, n1, n2, nc: n2 / (S.tr / 100) };
  }

  function labels() {
    $('tamano-e-v').textContent = S.tipo === 'p' ? '±' + fmt(S.e, S.e % 1 ? 1 : 0) + ' pts' : '±' + fmt(S.e, S.e % 1 ? 1 : 0);
    $('tamano-v-lbl').firstChild.textContent = S.tipo === 'p' ? 'PROPORCIÓN ESPERADA · P = ' : 'DESVIACIÓN ESTÁNDAR · σ = ';
    $('tamano-v-v').textContent = S.tipo === 'p' ? S.p + ' %' : S.sigma;
    $('tamano-deff-v').textContent = fmt(S.deff, 1);
    $('tamano-tr-v').textContent = S.tr + ' %';
  }

  function render() {
    labels();
    const s = sizes(S.e), up = Math.ceil;
    $('tamano-r-n0').textContent = miles(up(s.n0));
    $('tamano-r-n1').textContent = miles(up(s.n1));
    $('tamano-r-n2').textContent = miles(up(s.n2));
    $('tamano-r-nc').textContent = miles(up(s.nc));
    const z = Z[S.conf], f = S.N ? up(s.n2) / S.N : 0;
    $('tamano-head').textContent = `z = ${fmt(z, 3)}` + (S.N ? ` · fracción n/N = ${fmt(100 * f, 1)} %` : ' · sin corrección finita');
    draw();
  }

  function draw() {
    const c = fit($('tamano-c')); if (!c) return; const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    const accent = tok('--accent'), muted = tok('--muted'), ink = tok('--ink'), line = tok('--line'), hot = tok('--hot'), bg = tok('--bg');
    const pad = { l: 58, r: 16, t: 16, b: 30 }, eLo = 1, eHi = 10;
    const X = e => pad.l + (e - eLo) / (eHi - eLo) * (w - pad.l - pad.r);
    // rango vertical logarítmico según las curvas
    let lo = Infinity, hi = 0;
    for (const e of [eLo, eHi]) { const s = sizes(e); lo = Math.min(lo, s.n0, s.n2); hi = Math.max(hi, s.n0, s.nc); }
    const L0 = Math.floor(Math.log10(Math.max(1, lo))), L1 = Math.ceil(Math.log10(hi));
    const Y = n => h - pad.b - (Math.log10(Math.max(n, 1)) - L0) / (L1 - L0) * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    for (let k = L0; k <= L1; k++) {
      const y = Math.round(Y(10 ** k)) + .5; ctx.globalAlpha = .7; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.globalAlpha = .3;
      for (const m of [2, 5]) if (k < L1) { const y2 = Math.round(Y(m * 10 ** k)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y2); ctx.lineTo(w - pad.r, y2); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillText(miles(10 ** k), pad.l - 6, Math.min(Math.max(y + 4, pad.t + 8), h - pad.b));
    }
    ctx.globalAlpha = .6;
    for (let e = 2; e <= eHi; e += 2) { const x = Math.round(X(e)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const curve = (key, col, lw, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const e = eLo + (eHi - eLo) * i / 200, y = Y(sizes(e)[key]); i ? ctx.lineTo(X(e), y) : ctx.moveTo(X(e), y); }
      ctx.stroke(); ctx.setLineDash([]);
    };
    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t - 2, w - pad.l - pad.r, h - pad.t - pad.b + 4); ctx.clip();
    curve('n0', muted, 2, [5, 4]); curve('n2', ink, 1.8, []); curve('nc', accent, 2.6, []);
    ctx.restore();
    if (S.N) { const y = Y(S.N); if (y > pad.t && y < h - pad.b) { ctx.strokeStyle = hot; ctx.globalAlpha = .6; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.fillStyle = hot; ctx.textAlign = 'right'; ctx.fillText('N = ' + miles(S.N), w - pad.r - 4, y - 5); } }
    // punto elegido
    const s = sizes(S.e), x = X(S.e);
    for (const [n, col] of [[s.n2, ink], [s.nc, hot]]) { ctx.fillStyle = col; ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, Y(n), 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = ink; ctx.font = '600 12px ' + tok('--f-mono');
    const right = x > w * 0.62; ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(miles(Math.ceil(s.nc)) + ' a contactar', x + (right ? -10 : 10), Math.max(Y(s.nc) - 8, pad.t + 10));
    // eje x
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
    for (let e = 1; e <= eHi; e += 1) if ((e === 1 && w > 520) || e % 2 === 0) ctx.fillText('±' + e, Math.min(X(e), w - pad.r - 10), h - 10);
    ctx.textAlign = 'left'; ctx.fillText(S.tipo === 'p' ? 'margen (pts)' : 'margen', pad.l + 4, pad.t + 10);
  }

  eEl.addEventListener('input', () => { S.e = +eEl.value; render(); });
  vEl.addEventListener('input', () => { if (S.tipo === 'p') S.p = +vEl.value; else S.sigma = +vEl.value; render(); });
  dEl.addEventListener('input', () => { S.deff = +dEl.value; render(); });
  tEl.addEventListener('input', () => { S.tr = +tEl.value; render(); });
  segBind('tamano-tipo', b => {
    S.tipo = b.dataset.t;
    if (S.tipo === 'p') { vEl.min = 5; vEl.max = 95; vEl.step = 5; vEl.value = S.p; }
    else { vEl.min = 1; vEl.max = 40; vEl.step = 1; vEl.value = S.sigma; }
    render();
  });
  segBind('tamano-conf', b => { S.conf = b.dataset.c; render(); });
  segBind('tamano-N', b => { S.N = +b.dataset.n; render(); });

  M.draw['tamano'] = render;
  M.init.push(render);
})();
