/* StatEdx · sesión graficos: Gráficos descriptivos */
(() => {
  const { fit, tok, fmt, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);

  // ---------- datos ----------
  const TRAS = [12, 25, 8, 35, 18, 22, 45, 15, 28, 30, 19, 52, 24, 16, 38, 21, 27, 9, 33, 61,
    14, 26, 40, 23, 17, 29, 48, 20, 31, 11, 36, 25, 22, 57, 18, 43, 27, 34, 13, 24];
  const DATA = {
    trans: { name: 'transporte', tipo: 'Nominal', title: 'Medio de transporte de 40 estudiantes', unit: 'estudiantes',
      labels: ['Bus', 'Metro', 'Caminando', 'Bicicleta', 'Auto'], short: ['Bus', 'Metro', 'Camin.', 'Bici', 'Auto'], counts: [16, 10, 6, 5, 3] },
    satis: { name: 'satisfacción', tipo: 'Ordinal', title: 'Satisfacción de 54 clientes', unit: 'clientes',
      labels: ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho'], short: ['Muy ins.', 'Insat.', 'Neutral', 'Satisf.', 'Muy sat.'], counts: [3, 7, 12, 22, 10] },
    tras: { name: 'traslado', tipo: 'Cuantitativa', title: 'Minutos de traslado de 40 estudiantes', unit: 'minutos', xs: TRAS.slice().sort((a, b) => a - b), edges: [0, 10, 20, 30, 40, 50, 60, 70] },
    ventas: { name: 'ventas', tipo: 'Serie de tiempo', title: 'Ventas mensuales de un negocio (miles)', unit: 'miles de pesos',
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], short: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      counts: [120, 115, 130, 128, 140, 150, 165, 160, 145, 150, 170, 210], edges: [100, 120, 140, 160, 180, 200, 220] },
  };
  const GNAME = { barras: 'Barras', sectores: 'Sectores', pareto: 'Pareto', hist: 'Histograma', poli: 'Polígono', ojiva: 'Ojiva', caja: 'Caja', puntos: 'Puntos', lineas: 'Líneas' };
  // veredicto: [nivel, explicación, dibujar]
  const V = {
    trans: {
      barras: ['ok', 'Adecuado: una barra por categoría, ordenadas de mayor a menor. La moda (bus) se ve al instante.', 1],
      sectores: ['meh', 'Con cuidado: sirve porque son partes de un todo con 5 categorías, pero porciones parecidas (bici y caminando) son difíciles de comparar.', 1],
      pareto: ['ok', 'Adecuado: barras ordenadas con el porcentaje acumulado. Bus y metro juntos son el 65 %.', 1],
      hist: ['no', 'No se puede: una variable nominal no tiene números ni intervalos. Usa barras.', 0],
      poli: ['no', 'No se puede: unir categorías sin orden con líneas sugiere una continuidad que no existe.', 0],
      ojiva: ['no', 'No se puede: acumular exige un orden, y los medios de transporte no lo tienen.', 0],
      caja: ['no', 'No se puede: la caja necesita cuartiles, y una nominal no tiene orden.', 0],
      puntos: ['no', 'No se puede: no hay una recta numérica donde ubicar los datos.', 0],
      lineas: ['no', 'No se puede: no hay tiempo ni orden entre las categorías.', 0],
    },
    satis: {
      barras: ['ok', 'Adecuado: barras en el orden natural de los niveles. Se ve que las respuestas se cargan hacia satisfecho.', 1],
      sectores: ['meh', 'Con cuidado: los sectores pierden el orden de los niveles, que es información importante.', 1],
      pareto: ['no', 'No recomendado: ordenar por frecuencia rompe el orden natural de una variable ordinal.', 1],
      hist: ['no', 'No se puede: los niveles no son intervalos numéricos. Usa barras separadas.', 0],
      poli: ['meh', 'Con cuidado: la línea sugiere distancias iguales entre niveles, algo que la escala no garantiza.', 1],
      ojiva: ['ok', 'Adecuado: como hay orden, se puede acumular. El 41 % está en neutral o menos.', 1],
      caja: ['no', 'No recomendado: la caja supone distancias entre los niveles. Informa la mediana (satisfecho) y la tabla.', 0],
      puntos: ['no', 'No recomendado: con solo 5 niveles, las barras muestran lo mismo con más claridad.', 0],
      lineas: ['no', 'No se puede: los niveles no son momentos en el tiempo.', 0],
    },
    tras: {
      barras: ['no', 'No recomendado: una barra por cada valor forma un peine sin forma, porque casi no hay valores repetidos.', 1],
      sectores: ['no', 'No recomendado: 7 porciones de intervalos numéricos no se pueden comparar y se pierde el orden.', 1],
      pareto: ['no', 'No recomendado: ordenar los intervalos por frecuencia destruye la forma de la distribución.', 1],
      hist: ['ok', 'Adecuado: intervalos de 10 minutos. Pico entre 20 y 30 y cola larga a la derecha.', 1],
      poli: ['ok', 'Adecuado: misma información que el histograma, y permite superponer varios grupos.', 1],
      ojiva: ['ok', 'Adecuado: lee percentiles. La curva cruza 0,5 cerca de 25 minutos, la mediana.', 1],
      caja: ['ok', 'Adecuado: resumen de cinco números. Bigote derecho largo y un atípico en 61.', 1],
      puntos: ['ok', 'Adecuado con pocos datos: muestra cada valor, los huecos y los extremos.', 1],
      lineas: ['no', 'No se puede: los datos no tienen un orden en el tiempo.', 0],
    },
    ventas: {
      barras: ['meh', 'Con cuidado: columnas por mes funcionan, pero las líneas muestran mejor la tendencia.', 1],
      sectores: ['no', 'No recomendado: los meses no son partes de un todo que interese comparar, y se pierde el tiempo.', 1],
      pareto: ['no', 'No recomendado: ordenar los meses por ventas destruye la secuencia temporal.', 1],
      hist: ['no', 'No recomendado: agrupa los meses por valor y la tendencia desaparece.', 1],
      poli: ['no', 'No recomendado: para una serie de tiempo el gráfico natural es el de líneas.', 0],
      ojiva: ['no', 'No recomendado: acumular ventas por valor no responde ninguna pregunta útil.', 0],
      caja: ['meh', 'Con cuidado: resume la distribución de los 12 meses, pero pierde el orden temporal.', 1],
      puntos: ['meh', 'Con cuidado: ubica los valores pero pierde la secuencia de los meses.', 1],
      lineas: ['ok', 'Adecuado: tendencia creciente y un salto en diciembre, típico de la temporada de fiestas.', 1],
    },
  };
  const S = { d: 'trans', g: 'barras' };
  const q7 = (s, p) => { const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(i + 1, s.length - 1); return s[i] + (h - i) * (s[j] - s[i]); };
  const countIn = (xs, edges) => edges.slice(0, -1).map((a, i) => xs.filter(x => x >= a && x < edges[i + 1]).length);

  function draw() {
    const D = DATA[S.d], [lvl, why, can] = V[S.d][S.g];
    $('graficos-r-var').textContent = D.name;
    $('graficos-r-tipo').textContent = D.tipo;
    $('graficos-r-g').textContent = GNAME[S.g];
    $('graficos-r-v').textContent = lvl === 'ok' ? 'Adecuado' : lvl === 'meh' ? 'Con cuidado' : 'No conviene';
    $('graficos-why').textContent = why;
    $('graficos-title').textContent = D.title;
    $('graficos-unit').textContent = '';
    $('graficos-head').textContent = { ok: '✓ adecuado', meh: '~ con cuidado', no: '✗ no conviene' }[lvl];

    const f = fit($('graficos-plot')); if (!f) return; const { ctx, w, h } = f;
    const C = { accent: tok('--accent'), hot: tok('--hot'), ink: tok('--ink'), muted: tok('--muted'), line: tok('--line'), bg: tok('--surface'), mono: tok('--f-mono') };
    ctx.clearRect(0, 0, w, h);
    if (!can) {
      ctx.fillStyle = C.muted; ctx.font = '600 15px ' + C.mono; ctx.textAlign = 'center';
      ctx.fillText('✗ ' + GNAME[S.g] + ': no se puede dibujar', w / 2, h / 2 - 8);
      ctx.font = '12px ' + C.mono; ctx.fillText(D.tipo === 'Serie de tiempo' ? 'con una serie de tiempo' : 'con una variable ' + D.tipo.toLowerCase(), w / 2, h / 2 + 14);
      return;
    }
    const narrow = w < 520;
    const pad = { l: 40, r: S.g === 'pareto' ? 40 : 14, t: 18, b: 40 };
    const PW = w - pad.l - pad.r, PH = h - pad.t - pad.b;
    const Y0 = h - pad.b;
    const gridY = (max, step, fmtv = v => v) => {
      ctx.font = '11px ' + C.mono; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      for (let v = 0; v <= max + 1e-9; v += step) {
        const y = Math.round(Y0 - v / max * PH) + .5;
        ctx.strokeStyle = C.line; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillText(fmtv(v), pad.l - 6, y + 4);
      }
    };
    const niceMax = m => { for (const s of [1, 2, 5, 10, 20, 25, 50, 100]) if (m / s <= 6) return [Math.ceil(m / s) * s, s]; return [Math.ceil(m / 100) * 100, 100]; };
    const catLabels = (labs, xs) => {
      const slot = labs.length > 1 ? xs[1] - xs[0] : PW;
      let fs = narrow ? 10 : 11; ctx.font = fs + 'px ' + C.mono;
      const widest = () => Math.max(...labs.map(l => ctx.measureText(l).width));
      if (widest() > slot - 4) { fs = 9; ctx.font = fs + 'px ' + C.mono; }
      const every = widest() > slot - 4 ? 2 : 1;
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      labs.forEach((l, i) => { if (i % every === 0) ctx.fillText(l, xs[i], Y0 + 16); else ctx.fillText(l, xs[i], Y0 + 28); });
    };
    const axisX = () => { ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Y0 + .5); ctx.lineTo(w - pad.r, Y0 + .5); ctx.stroke(); };

    // conjuntos categóricos (o tratados como categorías)
    let labels, counts;
    if (D.labels) { labels = narrow ? D.short : D.labels; counts = D.counts.slice(); }
    else if (S.g === 'barras') {
      const vals = [...new Set(D.xs)]; labels = vals.map(String); counts = vals.map(v => D.xs.filter(x => x === v).length);
    } else { labels = D.edges.slice(0, -1).map((a, i) => `${a}-${D.edges[i + 1]}`); counts = countIn(D.xs, D.edges); }

    if (S.g === 'barras' || S.g === 'pareto') {
      let idx = labels.map((_, i) => i);
      if (S.g === 'pareto' || (S.g === 'barras' && S.d === 'trans')) idx.sort((a, b) => counts[b] - counts[a]);
      const L = idx.map(i => labels[i]), Cn = idx.map(i => counts[i]), tot = Cn.reduce((a, b) => a + b, 0);
      const [mx, st] = S.d === 'ventas' ? [250, 50] : niceMax(Math.max(...Cn));
      gridY(mx, st);
      const bw = PW / L.length, xs = L.map((_, i) => pad.l + bw * (i + .5));
      ctx.fillStyle = C.accent;
      Cn.forEach((c, i) => { const bh = c / mx * PH; ctx.globalAlpha = .85; ctx.fillRect(xs[i] - bw * .36, Y0 - bh, bw * .72, bh); ctx.globalAlpha = 1; });
      axisX();
      if (L.length <= 14) catLabels(L, xs);
      else { ctx.font = '10px ' + C.mono; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; for (let i = 0; i < L.length; i += Math.ceil(L.length / 8)) ctx.fillText(L[i], xs[i], Y0 + 16); }
      if (S.g === 'pareto') {
        let acc = 0; const pts = Cn.map((c, i) => { acc += c; return [xs[i], Y0 - acc / tot * PH]; });
        ctx.strokeStyle = C.hot; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.hot; ctx.fill(); });
        ctx.font = '11px ' + C.mono; ctx.textAlign = 'left'; ctx.fillStyle = C.hot;
        for (const p of [0, 50, 100]) ctx.fillText(p + '%', w - pad.r + 5, Y0 - p / 100 * PH + 4);
      }
      return;
    }
    if (S.g === 'sectores') {
      const tot = counts.reduce((a, b) => a + b, 0), cx = w / 2, cy = pad.t + PH / 2 + 4, R = Math.min(PH / 2 + 6, w / 2 - (narrow ? 92 : 80));
      const pal = ['--accent', '--hot', '--r-mod', '--r-ds', '--muted'];
      let a0 = -Math.PI / 2;
      counts.forEach((c, i) => {
        const a1 = a0 + c / tot * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
        ctx.fillStyle = tok(pal[i % pal.length]); ctx.globalAlpha = Math.floor(i / pal.length) % 2 ? .5 : .92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
        const am = (a0 + a1) / 2, lx = cx + Math.cos(am) * (R + 10), ly = cy + Math.sin(am) * (R + 10);
        ctx.font = (narrow ? '10px ' : '11px ') + C.mono; ctx.fillStyle = C.ink; ctx.textAlign = Math.cos(am) >= 0 ? 'left' : 'right';
        if (c / tot >= 0.03) ctx.fillText(`${labels[i]} ${fmt(100 * c / tot, 0)}%`, lx, ly + 4);
        a0 = a1;
      });
      return;
    }
    if (D.labels && S.g === 'poli') { // ordinal: polígono sobre los niveles
      const [mx, st] = niceMax(Math.max(...counts) + 1); gridY(mx, st);
      const bw = PW / labels.length, xs = labels.map((_, i) => pad.l + bw * (i + .5));
      const pts = counts.map((c, i) => [xs[i], Y0 - c / mx * PH]);
      ctx.strokeStyle = C.hot; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.hot; ctx.fill(); });
      axisX(); catLabels(labels, xs); return;
    }
    // gráficos sobre una recta numérica
    const xsv = D.xs || D.counts.slice().sort((a, b) => a - b);
    const edges = D.edges || [0, 1];
    const lo = edges[0], hi = edges[edges.length - 1];
    const X = v => pad.l + (v - lo) / (hi - lo) * PW;
    const stepX = S.d === 'ventas' ? (narrow ? 40 : 20) : (narrow ? 20 : 10);
    if (S.g === 'hist' || S.g === 'poli') {
      const cn = countIn(xsv, edges), [mx, st] = niceMax(Math.max(...cn) + 1);
      gridY(mx, st);
      cn.forEach((c, i) => {
        const x0 = X(edges[i]), x1 = X(edges[i + 1]), bh = c / mx * PH;
        ctx.fillStyle = C.accent; ctx.globalAlpha = S.g === 'hist' ? .85 : .18; ctx.fillRect(x0, Y0 - bh, x1 - x0, bh); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.bg; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, Y0 - bh + .5, x1 - x0 - 1, bh);
      });
      if (S.g === 'poli') {
        const a = edges[1] - edges[0];
        const pts = [[lo - a / 2, 0], ...cn.map((c, i) => [edges[i] + a / 2, c]), [hi + a / 2, 0]].map(([v, c]) => [Math.max(pad.l, Math.min(w - pad.r, X(v))), Y0 - c / mx * PH]);
        ctx.strokeStyle = C.hot; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.hot; ctx.fill(); });
      }
      axisX(); axisTicks(ctx, X, lo, hi, stepX, Y0 + 16, C.muted);
      return;
    }
    if (S.g === 'ojiva') {
      if (D.labels) { // ordinal: acumulada por nivel
        const tot = counts.reduce((a, b) => a + b, 0); gridY(1, .25, v => fmt(v, 2));
        const bw = PW / labels.length, xs = labels.map((_, i) => pad.l + bw * (i + .5));
        let acc = 0; const pts = counts.map((c, i) => { acc += c; return [xs[i], Y0 - acc / tot * PH]; });
        ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill(); });
        axisX(); catLabels(labels, xs); return;
      }
      const cn = countIn(xsv, edges), n = xsv.length; gridY(1, .25, v => fmt(v, 2));
      let acc = 0; const pts = [[X(lo), Y0], ...cn.map((c, i) => { acc += c; return [X(edges[i + 1]), Y0 - acc / n * PH]; })];
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill(); });
      // lectura de la mediana
      let me = lo, a2 = 0; for (let i = 0; i < cn.length; i++) { if (a2 + cn[i] >= n / 2) { me = edges[i] + (n / 2 - a2) / cn[i] * (edges[i + 1] - edges[i]); break; } a2 += cn[i]; }
      const yh = Y0 - .5 * PH; ctx.strokeStyle = C.hot; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad.l, yh); ctx.lineTo(X(me), yh); ctx.lineTo(X(me), Y0); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.hot; ctx.font = '600 12px ' + C.mono; ctx.textAlign = 'left'; ctx.fillText('Me ≈ ' + fmt(me, 1), X(me) + 6, yh - 6);
      axisX(); axisTicks(ctx, X, lo, hi, stepX, Y0 + 16, C.muted);
      return;
    }
    if (S.g === 'caja' || S.g === 'puntos') {
      ctx.strokeStyle = C.line; ctx.globalAlpha = .55;
      for (let v = lo; v <= hi; v += stepX) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, Y0); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (S.g === 'puntos') {
        const r = Math.max(3, Math.min(5, PW / 90)), placed = [];
        xsv.forEach(v => { const x = X(v); let lv = 0; while (placed.some(p => p.lv === lv && Math.abs(p.x - x) < 2 * r + 1)) lv++; placed.push({ x, lv });
          ctx.beginPath(); ctx.arc(x, Y0 - 4 - r - lv * (2 * r + 1), r, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill(); });
      } else {
        const q1 = q7(xsv, .25), me = q7(xsv, .5), q3 = q7(xsv, .75), iqr = q3 - q1, fl = q1 - 1.5 * iqr, fh = q3 + 1.5 * iqr;
        const wl = xsv.find(x => x >= fl), wh = [...xsv].reverse().find(x => x <= fh), by = pad.t + PH / 2, bh = Math.min(60, PH * .4);
        ctx.fillStyle = C.accent; ctx.globalAlpha = .18; ctx.fillRect(X(q1), by - bh / 2, X(q3) - X(q1), bh); ctx.globalAlpha = 1;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(X(q1), by - bh / 2, X(q3) - X(q1), bh);
        ctx.beginPath(); ctx.moveTo(X(me), by - bh / 2); ctx.lineTo(X(me), by + bh / 2);
        ctx.moveTo(X(wl), by); ctx.lineTo(X(q1), by); ctx.moveTo(X(q3), by); ctx.lineTo(X(wh), by);
        ctx.moveTo(X(wl), by - 10); ctx.lineTo(X(wl), by + 10); ctx.moveTo(X(wh), by - 10); ctx.lineTo(X(wh), by + 10); ctx.stroke();
        xsv.filter(x => x < fl || x > fh).forEach(x => { ctx.beginPath(); ctx.arc(X(x), by, 4, 0, Math.PI * 2); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.hot; ctx.lineWidth = 1.5; ctx.stroke(); });
        ctx.font = '11px ' + C.mono; ctx.fillStyle = C.muted; ctx.textAlign = 'center';
        ctx.fillText('Q1 ' + fmt(q1, 1), X(q1), by - bh / 2 - 8); ctx.fillText('Q3 ' + fmt(q3, 1), X(q3), by + bh / 2 + 16);
        ctx.fillStyle = C.ink; ctx.fillText('Me ' + fmt(me, 1), X(me), by - bh / 2 - 22);
      }
      axisX(); axisTicks(ctx, X, lo, hi, stepX, Y0 + 16, C.muted);
      return;
    }
    if (S.g === 'lineas') {
      const vals = D.counts, mx = 250, st = 50; gridY(mx, st);
      const bw = PW / vals.length, xs = vals.map((_, i) => pad.l + bw * (i + .5));
      const pts = vals.map((v, i) => [xs[i], Y0 - v / mx * PH]);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      pts.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, i === 11 ? 5 : 3.5, 0, Math.PI * 2); ctx.fillStyle = i === 11 ? C.hot : C.accent; ctx.fill(); });
      axisX(); catLabels(labels, xs);
    }
  }
  segBind('graficos-dat', b => { S.d = b.dataset.d; draw(); });
  segBind('graficos-g', b => { S.g = b.dataset.g; draw(); });
  M.draw['graficos'] = draw;
  M.init.push(draw);
})();
