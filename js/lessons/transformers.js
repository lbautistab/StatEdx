/* StatEdx · sesión transformers: Atención y transformers */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = (px = 11) => px + 'px ' + tok('--f-mono');
  const sgn = (x, d) => (x < -1e-12 ? '−' : '') + fmt(Math.abs(x), d);

  // =====================================================================
  // Simulador 1: autoatención en una frase
  // Dimensiones: [animado, lugar, verbo, función gramatical]
  // =====================================================================
  const BASE = [
    { w: 'El', k: [0, 0, 0, 1.2], q: [1.2, 0.8, 0, 0] },
    { w: 'animal', k: [2, 0, 0, 0.2], q: [0, 0, 1.5, 0.5] },
    { w: 'no', k: [0, 0, 0.6, 0.8], q: [0, 0, 2, 0] },
    { w: 'cruzó', k: [0, 0.3, 1.6, 0], q: [1.4, 1.2, 0, 0] },
    { w: 'la', k: [0, 0, 0, 1.2], q: [0.6, 1.4, 0, 0] },
    { w: 'calle', k: [0, 2, 0, 0.2], q: [0, 0, 1.2, 0.5] },
    { w: 'porque', k: [0, 0, 0.4, 1], q: [0, 0, 1.4, 0.4] },
    { w: 'estaba', k: [0, 0, 1.4, 0.3], q: [1, 1, 0.3, 0] },
  ];
  const END = {
    cansado: { w: 'cansado', k: [0.8, 0, 0.8, 0], q: [2.2, 0, 0.6, 0] },
    inundada: { w: 'inundada', k: [0, 0.8, 0.8, 0], q: [0, 2.2, 0.6, 0] },
  };
  const AT = { qi: 8, temp: 1, end: 'cansado', mask: 0 };
  const toks = () => BASE.concat([END[AT.end]]);

  function attn() {
    const T = toks(), n = T.length, dk = 4;
    const A = T.map((a, i) => {
      const s = T.map((b, j) => (AT.mask && j > i) ? -Infinity : (a.q[0] * b.k[0] + a.q[1] * b.k[1] + a.q[2] * b.k[2] + a.q[3] * b.k[3]) / (Math.sqrt(dk) * AT.temp));
      const mx = Math.max(...s), e = s.map(v => v === -Infinity ? 0 : Math.exp(v - mx)), z = e.reduce((x, y) => x + y, 0);
      return e.map(v => v / z);
    });
    return { T, n, A };
  }

  function attnDraw() {
    const { T, n, A } = attn(), row = A[AT.qi];
    $('transformers-q-v').textContent = '“' + T[AT.qi].w + '”';
    $('transformers-temp-v').textContent = fmt(AT.temp, 1);
    let top = 0; row.forEach((v, j) => { if (v > row[top]) top = j; });
    const ent = -row.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
    const eff = 1 / row.reduce((s, p) => s + p * p, 0);
    $('transformers-r-top').textContent = T[top].w;
    $('transformers-r-max').textContent = pct(row[top], 1);
    $('transformers-r-ent').textContent = fmt(ent, 2);
    $('transformers-r-eff').textContent = fmt(eff, 2);
    $('transformers-head').textContent = 'softmax(QKᵀ / (√4 · τ))';
    $('transformers-bar-lbl').textContent = '“' + T[AT.qi].w + '” mira a…';
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line');

    // ---------- matriz ----------
    let f = fit($('transformers-c-map'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const narrow = w < 360, fs = narrow ? 9 : 10.5;
      ctx.font = mono(fs);
      const lab = Math.max(...T.map(t => ctx.measureText(t.w).width)) + 8;
      const cs = Math.floor(Math.min((w - lab - 6) / n, (h - lab - 4) / n));
      const x0 = Math.round(lab + (w - lab - cs * n) / 2), y0 = 4;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = A[i][j];
        if (AT.mask && j > i) { ctx.fillStyle = line; ctx.globalAlpha = .35; ctx.fillRect(x0 + j * cs, y0 + i * cs, cs, cs); }
        else { ctx.fillStyle = accent; ctx.globalAlpha = 0.04 + 0.96 * Math.sqrt(v); ctx.fillRect(x0 + j * cs, y0 + i * cs, cs, cs); }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = line; ctx.globalAlpha = .6; ctx.lineWidth = 1; ctx.strokeRect(x0 + j * cs + .5, y0 + i * cs + .5, cs - 1, cs - 1); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = hot; ctx.lineWidth = 2.5; ctx.strokeRect(x0 + 1, y0 + AT.qi * cs + 1, cs * n - 2, cs - 2);
      ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      T.forEach((t, i) => { ctx.fillStyle = i === AT.qi ? hot : muted; ctx.fillText(t.w, x0 - 6, y0 + (i + .5) * cs); });
      ctx.textBaseline = 'alphabetic';
      T.forEach((t, j) => {
        ctx.save(); ctx.translate(x0 + (j + .5) * cs + 4, y0 + n * cs + 6); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = j === top ? ink : muted; ctx.textAlign = 'right'; ctx.fillText(t.w, 0, 0); ctx.restore();
      });
      mapGeom = { x0, y0, cs, n };
    }

    // ---------- barras ----------
    f = fit($('transformers-c-bar'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      ctx.font = mono(10.5);
      const lab = Math.max(...T.map(t => ctx.measureText(t.w).width)) + 10;
      const pad = { l: lab, r: 44, t: 6, b: 22 }, bh = (h - pad.t - pad.b) / n;
      const X = v => pad.l + v * (w - pad.l - pad.r);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      for (const v of [0, .25, .5, .75, 1]) { const x = Math.round(X(v)) + .5; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), X(v), h - 6);
      row.forEach((v, j) => {
        const y = pad.t + j * bh;
        ctx.fillStyle = j === top ? hot : accent; ctx.globalAlpha = (AT.mask && j > AT.qi) ? .15 : .85;
        ctx.fillRect(X(0), y + bh * .18, Math.max(0, X(v) - X(0)), bh * .64); ctx.globalAlpha = 1;
        ctx.fillStyle = j === AT.qi ? ink : muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(T[j].w, pad.l - 6, y + bh / 2);
        ctx.textAlign = 'left'; ctx.fillStyle = v > 0.005 ? ink : muted;
        ctx.fillText(AT.mask && j > AT.qi ? '—' : pct(v, 0), X(v) + 4, y + bh / 2);
        ctx.textBaseline = 'alphabetic';
      });
    }
  }
  let mapGeom = null;

  // =====================================================================
  // Simulador 2: codificación posicional sinusoidal
  // =====================================================================
  const NP = 64;
  const PEs = { p: 20, d: 64 };
  function pe(p, d) {
    const v = new Array(d);
    for (let i = 0; i < d; i += 2) { const a = p / Math.pow(10000, i / d); v[i] = Math.sin(a); v[i + 1] = Math.cos(a); }
    return v;
  }
  const cos = (a, b) => { let s = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return s / Math.sqrt(na * nb); };

  function peDraw() {
    const d = PEs.d, P = Array.from({ length: NP }, (_, p) => pe(p, d)), p = PEs.p;
    const sims = P.map(v => cos(P[p], v));
    $('transformers-p-v').textContent = p;
    const simAt = k => p + k < NP ? sgn(sims[p + k], 3) : sgn(cos(P[p], pe(p + k, d)), 3);
    $('transformers-r-s1').textContent = simAt(1);
    $('transformers-r-s5').textContent = simAt(5);
    $('transformers-r-s20').textContent = simAt(20);
    const per = 2 * Math.PI * Math.pow(10000, (d - 2) / d);
    $('transformers-r-per').textContent = String(Math.round(per)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' pos.';
    $('transformers-pe-head').textContent = `PE ∈ ℝ^(64 × ${d})`;
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line');

    let f = fit($('transformers-c-pe'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 30, r: 6, t: 6, b: 22 };
      const cw = (w - pad.l - pad.r) / d, ch = (h - pad.t - pad.b) / NP;
      for (let r = 0; r < NP; r++) for (let c = 0; c < d; c++) {
        const v = P[r][c]; ctx.fillStyle = v >= 0 ? accent : hot; ctx.globalAlpha = Math.abs(v) * 0.9;
        ctx.fillRect(pad.l + c * cw, pad.t + r * ch, Math.ceil(cw), Math.ceil(ch));
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(pad.l - 1, pad.t + p * ch - 1, w - pad.l - pad.r + 2, ch + 2);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (const r of [0, 16, 32, 48, 63]) ctx.fillText(r, pad.l - 5, pad.t + (r + .5) * ch + 4);
      ctx.textAlign = 'left'; ctx.fillText('dim 0', pad.l, h - 6);
      ctx.textAlign = 'right'; ctx.fillText('dim ' + (d - 1), w - pad.r, h - 6);
    }
    f = fit($('transformers-c-sim'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 36, r: 10, t: 10, b: 24 }, lo = -0.25, hi = 1;
      const X = k => pad.l + k / (NP - 1) * (w - pad.l - pad.r), Y = v => pad.t + (hi - v) / (hi - lo) * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (const v of [0, .25, .5, .75, 1]) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = v ? .5 : 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(fmt(v, 2), pad.l - 5, y + 4); }
      ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(p), pad.t); ctx.lineTo(X(p), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath();
      sims.forEach((v, k) => { const y = Y(Math.max(lo, v)); k ? ctx.lineTo(X(k), y) : ctx.moveTo(X(k), y); }); ctx.stroke();
      for (const k of [1, 5, 20]) if (p + k < NP) { ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(p + k), Y(Math.max(lo, sims[p + k])), 3.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (const k of [0, 16, 32, 48, 63]) ctx.fillText(k, X(k), h - 8);
    }
  }

  M.draw['transformers'] = () => { attnDraw(); peDraw(); };
  M.init.push(() => {
    $('transformers-q').addEventListener('input', e => { AT.qi = +e.target.value; attnDraw(); });
    $('transformers-temp').addEventListener('input', e => { AT.temp = +e.target.value; attnDraw(); });
    segBind('transformers-end', b => { AT.end = b.dataset.e; attnDraw(); });
    segBind('transformers-mask', b => { AT.mask = +b.dataset.m; attnDraw(); });
    $('transformers-c-map').addEventListener('click', e => {
      if (!mapGeom) return;
      const rc = e.currentTarget.getBoundingClientRect(), y = e.clientY - rc.top;
      const i = Math.floor((y - mapGeom.y0) / mapGeom.cs);
      if (i >= 0 && i < mapGeom.n) { AT.qi = i; $('transformers-q').value = i; attnDraw(); }
    });
    $('transformers-p').addEventListener('input', e => { PEs.p = +e.target.value; peDraw(); });
    segBind('transformers-d', b => { PEs.d = +b.dataset.d; peDraw(); });
    attnDraw(); peDraw();
  });
})();
