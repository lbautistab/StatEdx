/* StatEdx · sesión cnn: Redes neuronales convolucionales */
(() => {
  const { fit, tok, fmt, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = (px = 11) => px + 'px ' + tok('--f-mono');
  const sgn = (x, d) => (x < -1e-12 ? '−' : '') + fmt(Math.abs(x), d);
  const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // =====================================================================
  // Simulador 1: convolución 2D sobre una imagen de 16 × 16
  // =====================================================================
  const NIMG = 16;
  const IMG = (() => {
    const a = Array.from({ length: NIMG }, () => new Array(NIMG).fill(0));
    for (let r = 0; r < NIMG; r++) for (let c = 0; c < NIMG; c++) {
      if ((r - 3) ** 2 + (c - 12.5) ** 2 <= 4.5) a[r][c] = 0.7;          // sol
      if (r >= 3 && r <= 7 && Math.abs(c - 6) <= r - 2) a[r][c] = 0.55;  // techo
      if (r >= 8 && r <= 14 && c >= 2 && c <= 10) a[r][c] = 0.9;          // paredes
      if (r >= 11 && r <= 14 && c >= 5 && c <= 6) a[r][c] = 0.15;         // puerta
      if (r >= 9 && r <= 10 && c >= 8 && c <= 9) a[r][c] = 0.3;           // ventana
      if (r === 15) a[r][c] = 0.4;                                        // suelo
    }
    return a;
  })();
  const KER = {
    vert: { name: 'Sobel · bordes verticales', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
    horiz: { name: 'Sobel · bordes horizontales', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
    blur: { name: 'promedio 3 × 3', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9)) },
    lap: { name: 'laplaciano', k: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] },
    sharp: { name: 'realce (nitidez)', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  };
  const C = { k: 'vert', p: 0, s: 1, act: 'none', frac: 127 / 195, pos: 127, playing: false, last: 0 };

  function compute() {
    const n = NIMG + 2 * C.p, K = KER[C.k].k;
    const Xp = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => {
      const rr = r - C.p, cc = c - C.p; return rr >= 0 && rr < NIMG && cc >= 0 && cc < NIMG ? IMG[rr][cc] : 0;
    }));
    const m = Math.floor((n - 3) / C.s) + 1;
    const out = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => {
      let s = 0; for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) s += Xp[i * C.s + u][j * C.s + v] * K[u][v];
      return Math.abs(s) < 1e-9 ? 0 : s;
    }));
    const act = C.act === 'none' ? out : out.map(r => r.map(v => Math.max(v, 0)));
    let pool = null;
    if (C.act === 'pool') {
      const q = Math.floor(m / 2);
      pool = Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) =>
        Math.max(act[2 * i][2 * j], act[2 * i][2 * j + 1], act[2 * i + 1][2 * j], act[2 * i + 1][2 * j + 1])));
    }
    return { n, Xp, m, out, act, pool, K };
  }
  const kLabel = v => C.k === 'blur' ? '⅑' : sgn(v, 0);

  function convDraw() {
    const R = compute(), m = R.m;
    const pos = Math.min(C.pos, m * m - 1), i = Math.floor(pos / m), j = pos % m;
    const slider = $('cnn-pos'); slider.max = m * m - 1; slider.value = pos;
    $('cnn-pos-v').textContent = `fila ${i + 1}, columna ${j + 1}`;
    $('cnn-head').textContent = KER[C.k].name;
    $('cnn-in-lbl').textContent = C.p ? '16 × 16 + relleno → 18 × 18' : '16 × 16';
    const fin = R.pool || R.act, q = fin.length;
    $('cnn-out-lbl').textContent = R.pool ? `${m} × ${m} → pool ${q} × ${q}` : `${m} × ${m}`;
    $('cnn-r-size').textContent = R.pool ? `${m}² → ${q} × ${q}` : `${m} × ${m}`;
    $('cnn-r-val').textContent = sgn(R.act[i][j], 2);
    let nz = 0; fin.forEach(r => r.forEach(v => { if (Math.abs(v) > 1e-9) nz++; }));
    $('cnn-r-act').textContent = M.pct(nz / (q * q), 0);
    $('cnn-r-par').textContent = '9 + 1 = 10';

    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line'), surface = tok('--surface');
    // ---------- entrada ----------
    let f = fit($('cnn-c-in'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const n = R.n, cs = Math.floor(Math.min(w - 8, h - 8) / n), ox = Math.round((w - cs * n) / 2), oy = Math.round((h - cs * n) / 2);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const isPad = C.p && (r === 0 || c === 0 || r === n - 1 || c === n - 1);
        const v = R.Xp[r][c];
        if (v > 0) { ctx.fillStyle = ink; ctx.globalAlpha = v; ctx.fillRect(ox + c * cs, oy + r * cs, cs, cs); ctx.globalAlpha = 1; }
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = isPad ? 1 : .5;
        if (isPad) ctx.setLineDash([2, 2]);
        ctx.strokeRect(ox + c * cs + .5, oy + r * cs + .5, cs - 1, cs - 1); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      const wx = ox + j * C.s * cs, wy = oy + i * C.s * cs;
      ctx.fillStyle = hot; ctx.globalAlpha = .12; ctx.fillRect(wx, wy, 3 * cs, 3 * cs); ctx.globalAlpha = 1;
      ctx.font = '600 ' + mono(Math.max(8, Math.min(12, Math.floor(cs * 0.55)))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) {
        const cx = wx + (v + .5) * cs, cy = wy + (u + .5) * cs, t = kLabel(R.K[u][v]);
        const tw = ctx.measureText(t).width + 4;
        ctx.fillStyle = surface; ctx.globalAlpha = .82; ctx.fillRect(cx - tw / 2, cy - 7, tw, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = R.K[u][v] < 0 ? hot : R.K[u][v] > 0 ? accent : muted; ctx.fillText(t, cx, cy + .5);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = hot; ctx.lineWidth = 2.5; ctx.strokeRect(wx + 1, wy + 1, 3 * cs - 2, 3 * cs - 2);
    }
    // ---------- salida ----------
    f = fit($('cnn-c-out'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      let mx = 1e-9; R.act.forEach(r => r.forEach(v => { mx = Math.max(mx, Math.abs(v)); }));
      const drawMap = (A, x0, y0, cs, hi, hj, hsize) => {
        const k = A.length;
        for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) {
          const v = A[r][c];
          if (Math.abs(v) > 1e-9) { ctx.fillStyle = v > 0 ? accent : hot; ctx.globalAlpha = 0.12 + 0.88 * Math.min(1, Math.abs(v) / mx); ctx.fillRect(x0 + c * cs, y0 + r * cs, cs, cs); ctx.globalAlpha = 1; }
          ctx.strokeStyle = line; ctx.globalAlpha = .5; ctx.lineWidth = 1; ctx.strokeRect(x0 + c * cs + .5, y0 + r * cs + .5, cs - 1, cs - 1); ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.strokeRect(x0 + hj * cs + 1, y0 + hi * cs + 1, hsize * cs - 2, hsize * cs - 2);
      };
      if (R.pool) {
        const avail = w - 24, cs = Math.max(4, Math.floor(Math.min(avail * 0.64 / m, (h - 30) / m)));
        const cs2 = Math.max(4, Math.floor(Math.min((avail - cs * m) / q, (h - 30) / q)));
        const tot = cs * m + 24 + cs2 * q, x0 = Math.round((w - tot) / 2), y0 = Math.round((h - cs * m) / 2) + 6;
        const pi = Math.min(Math.floor(i / 2), q - 1), pj = Math.min(Math.floor(j / 2), q - 1);
        drawMap(R.act, x0, y0, cs, i, j, 1);
        ctx.strokeStyle = muted; ctx.setLineDash([3, 2]); ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 2 * pj * cs + .5, y0 + 2 * pi * cs + .5, 2 * cs - 1, 2 * cs - 1); ctx.setLineDash([]);
        const x1 = x0 + cs * m + 24, y1 = Math.round((h - cs2 * q) / 2) + 6;
        drawMap(R.pool, x1, y1, cs2, pi, pj, 1);
        ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
        ctx.fillText('ReLU', x0 + cs * m / 2, y0 - 8); ctx.fillText('max pool', x1 + cs2 * q / 2, y1 - 8);
        ctx.fillText('→', x0 + cs * m + 12, h / 2 + 4);
      } else {
        const cs = Math.floor(Math.min(w - 8, h - 8) / m), x0 = Math.round((w - cs * m) / 2), y0 = Math.round((h - cs * m) / 2);
        drawMap(R.act, x0, y0, cs, i, j, 1);
        if (cs >= 15) {
          ctx.font = mono(Math.min(11, Math.floor(cs * 0.45))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = ink; ctx.fillText(sgn(R.act[i][j], 1), x0 + (j + .5) * cs, y0 + (i + .5) * cs - cs);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }

  function convPlay(ts) {
    if (!C.playing) return;
    if (M.current !== 'cnn') { C.playing = false; $('cnn-play').textContent = 'Recorrer'; return; }
    if (ts - C.last > 70) {
      C.last = ts; const m = compute().m;
      if (C.pos >= m * m - 1) { C.playing = false; $('cnn-play').textContent = 'Recorrer'; convDraw(); return; }
      C.pos++; convDraw();
    }
    requestAnimationFrame(convPlay);
  }
  function convInit() {
    const keepFrac = () => { C.frac = C.pos / Math.max(1, +$('cnn-pos').max); };
    const reapply = () => { const m = compute().m; C.pos = Math.round(C.frac * (m * m - 1)); convDraw(); };
    segBind('cnn-k', b => { C.k = b.dataset.k; convDraw(); });
    segBind('cnn-pad', b => { keepFrac(); C.p = +b.dataset.p; reapply(); });
    segBind('cnn-stride', b => { keepFrac(); C.s = +b.dataset.s; reapply(); });
    segBind('cnn-act', b => { C.act = b.dataset.a; convDraw(); });
    $('cnn-pos').addEventListener('input', e => { C.pos = +e.target.value; convDraw(); });
    $('cnn-play').addEventListener('click', () => {
      if (C.playing) { C.playing = false; $('cnn-play').textContent = 'Recorrer'; return; }
      const m = compute().m; if (C.pos >= m * m - 1) C.pos = 0;
      C.playing = true; $('cnn-play').textContent = 'Pausa'; requestAnimationFrame(convPlay);
    });
    convDraw();
  }

  // =====================================================================
  // Simulador 2: arquitectura (formas, parámetros y campo receptivo)
  // =====================================================================
  const A = { nb: 3, f0: 32, k: 3, head: 'flat' };
  function archCompute() {
    const layers = [{ H: 32, C: 3, p: 0, kind: 'in' }];
    let H = 32, Cin = 3, r = 1, j = 1, pconv = 0;
    for (let b = 0; b < A.nb; b++) {
      const Cout = A.f0 * 2 ** b, p = A.k * A.k * Cin * Cout + Cout;
      pconv += p; r += (A.k - 1) * j; r += 1 * j; j *= 2;
      H = Math.floor(H / 2); Cin = Cout;
      layers.push({ H, C: Cout, p, kind: 'blk' });
    }
    const feat = A.head === 'flat' ? H * H * Cin : Cin, phead = feat * 10 + 10;
    return { layers, pconv, phead, feat, r, H, Cin };
  }
  function archDraw() {
    const R = archCompute();
    $('cnn-nb-v').textContent = A.nb;
    $('cnn-r-pconv').textContent = miles(R.pconv);
    $('cnn-r-phead').textContent = miles(R.phead);
    $('cnn-r-ptot').textContent = miles(R.pconv + R.phead);
    $('cnn-r-rf').textContent = Math.min(R.r, 999) + ' px' + (R.r >= 32 ? ' (toda la imagen)' : '');
    $('cnn-arch-head').textContent = `${A.nb} bloque${A.nb > 1 ? 's' : ''} · ${A.k}×${A.k} · ${A.head === 'flat' ? 'aplanar' : 'promedio global'}`;
    $('cnn-arch-lbl').textContent = `${M.pct(R.phead / (R.pconv + R.phead), 0)} de los parámetros en la cabeza`;
    const f = fit($('cnn-c-arch')); if (!f) return; const { ctx, w, h } = f;
    const ink = tok('--ink'), muted = tok('--muted'), accent = tok('--accent'), hot = tok('--hot'), line = tok('--line'), bg = tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 520, fs = narrow ? 9.5 : 11;
    const items = R.layers.length + 1, slot = (w - 16) / items;
    const base = h - 70, maxH = h - 120;
    const box = (cx, Hs, Cs, color, alpha) => {
      const fh = 14 + maxH * Hs / 32, fw = Math.min(slot * 0.42, 4 + 5 * Math.log2(Cs + 1)), d = Math.min(fh * 0.28, slot * 0.22);
      const x = cx - (fw + d) / 2, y = base - fh;
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + d + fw, y - d); ctx.lineTo(x + fw, y); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = alpha * 0.7; ctx.beginPath(); ctx.moveTo(x + fw, y); ctx.lineTo(x + fw + d, y - d); ctx.lineTo(x + fw + d, base - d); ctx.lineTo(x + fw, base); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = alpha * 1.2 > 1 ? 1 : alpha * 1.2; ctx.fillRect(x, y, fw, fh); ctx.globalAlpha = 1;
      ctx.strokeStyle = bg; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, fw - 1, fh - 1);
      return { top: y - d, right: x + fw + d, left: x };
    };
    ctx.textAlign = 'center';
    let prevRight = null;
    R.layers.forEach((L, idx) => {
      const cx = 8 + slot * (idx + .5);
      const b = box(cx, L.H, L.C, L.kind === 'in' ? muted : accent, L.kind === 'in' ? .45 : .75);
      if (prevRight !== null) { ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(prevRight + 2, base - 8); ctx.lineTo(b.left - 3, base - 8); ctx.stroke(); }
      prevRight = b.right;
      ctx.fillStyle = ink; ctx.font = '600 ' + mono(fs);
      ctx.fillText(`${L.H}×${L.H}`, cx, base + 16);
      ctx.fillStyle = muted; ctx.font = mono(fs); ctx.fillText(`×${L.C}`, cx, base + 30);
      ctx.fillText(L.kind === 'in' ? 'entrada' : '+' + (L.p >= 1e6 ? fmt(L.p / 1e6, 1) + 'M' : L.p >= 1e4 ? Math.round(L.p / 1e3) + 'k' : miles(L.p)), cx, base + 46);
    });
    // cabeza
    const cx = 8 + slot * (items - .5), barH = 14 + maxH * Math.min(1, Math.log10(R.feat + 1) / Math.log10(32 * 32 * 64 + 1));
    const bw = Math.min(14, slot * 0.25);
    ctx.fillStyle = hot; ctx.globalAlpha = .75; ctx.fillRect(cx - bw - 2, base - barH, bw, barH); ctx.globalAlpha = 1;
    ctx.fillStyle = hot; ctx.fillRect(cx + 4, base - 30, bw, 30);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(prevRight + 2, base - 8); ctx.lineTo(cx - bw - 5, base - 8); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '600 ' + mono(fs); ctx.fillText(miles(R.feat) + '→10', cx, base + 16);
    ctx.fillStyle = muted; ctx.font = mono(fs); ctx.fillText(A.head === 'flat' ? 'aplanar' : 'prom.', cx, base + 30);
    ctx.fillText('+' + (R.phead >= 1e6 ? fmt(R.phead / 1e6, 1) + 'M' : R.phead >= 1e4 ? Math.round(R.phead / 1e3) + 'k' : miles(R.phead)), cx, base + 46);
    // campo receptivo sobre la entrada
    const rf = Math.min(R.r, 32), fh0 = 14 + maxH;
    const cx0 = 8 + slot * .5, fw0 = Math.min(slot * 0.42, 4 + 5 * Math.log2(4)), d0 = Math.min(fh0 * 0.28, slot * 0.22), x0 = cx0 - (fw0 + d0) / 2;
    ctx.strokeStyle = hot; ctx.lineWidth = 2; const rh = fh0 * rf / 32;
    ctx.strokeRect(x0 + 1, base - fh0 / 2 - rh / 2, fw0 - 2, rh);
    ctx.fillStyle = hot; ctx.font = mono(fs); ctx.textAlign = 'left';
    ctx.fillText('campo receptivo ' + rf + '×' + rf, 8, 14);
    ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(8, base + .5); ctx.lineTo(w - 8, base + .5); ctx.stroke();
  }
  function archInit() {
    $('cnn-nb').addEventListener('input', e => { A.nb = +e.target.value; archDraw(); });
    segBind('cnn-f0', b => { A.f0 = +b.dataset.f; archDraw(); });
    segBind('cnn-ks', b => { A.k = +b.dataset.k; archDraw(); });
    segBind('cnn-hd', b => { A.head = b.dataset.h; archDraw(); });
    archDraw();
  }

  M.draw['cnn'] = () => { convDraw(); archDraw(); };
  M.init.push(() => { convInit(); archInit(); });
})();
