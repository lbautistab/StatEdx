/* StatEdx · clase 14, árboles de decisión y random forest */
(() => {
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + M.tok('--f-mono');
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function marker(ctx, x, y, cls, r, fill, edge) {
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath();
    if (cls) ctx.rect(x - r * .9, y - r * .9, r * 1.8, r * 1.8); else ctx.arc(x, y, r, 0, 7);
    ctx.fill(); ctx.stroke();
  }

  // ---------- simulador 1: el mejor corte ----------
  const SP = { s: 4, crit: 'gini', y: 'AAABAAABABBABBBABBBB'.split('').map(c => c === 'B' ? 1 : 0) };
  const imp = (nB, n) => { if (!n) return 0; const p = nB / n; if (SP.crit === 'gini') return 1 - p * p - (1 - p) * (1 - p); return (p > 0 ? -p * Math.log2(p) : 0) + (p < 1 ? -(1 - p) * Math.log2(1 - p) : 0); };
  function spStats(s) {
    const L = SP.y.slice(0, s), R = SP.y.slice(s), sum = a => a.reduce((x, y) => x + y, 0);
    const iL = imp(sum(L), L.length), iR = imp(sum(R), R.length), iP = imp(sum(SP.y), 20);
    const w = (L.length * iL + R.length * iR) / 20;
    return { L, R, iL, iR, iP, w, g: iP - w, aL: L.length - sum(L), bL: sum(L), aR: R.length - sum(R), bR: sum(R) };
  }
  const spBest = () => { let b = 0; for (let s = 1; s < 20; s++) if (spStats(s).w < spStats(b).w - 1e-12) b = s; return b; };
  function spDraw() {
    const st = spStats(SP.s), best = spBest(), d = 3;
    $('trees-sp-s-v').textContent = SP.s;
    $('trees-sp-l').textContent = SP.s ? M.fmt(st.iL, d) : '—';
    $('trees-sp-r').textContent = SP.s < 20 ? M.fmt(st.iR, d) : '—';
    $('trees-sp-w').textContent = M.fmt(st.w, d);
    $('trees-sp-g').textContent = M.fmt(st.g, d);
    $('trees-sp-head').textContent = SP.s === best ? 'este es el mejor corte' : 'mejor corte: ' + best + ' a la izquierda';
    const fr = M.fit($('trees-sp')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line'), bg = M.tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14 };
    const X = i => pad.l + (i + .5) / 20 * (w - pad.l - pad.r); // posición de la observación i
    const C = s => pad.l + s / 20 * (w - pad.l - pad.r);        // posición del corte s
    // franja de observaciones
    const yDots = 46;
    ctx.fillStyle = accent; ctx.globalAlpha = .08; ctx.fillRect(pad.l, 24, C(SP.s) - pad.l, 44);
    ctx.fillStyle = hot; ctx.fillRect(C(SP.s), 24, w - pad.r - C(SP.s), 44); ctx.globalAlpha = 1;
    const r = Math.min(6, (w - pad.l - pad.r) / 20 * 0.32);
    SP.y.forEach((c, i) => marker(ctx, X(i), yDots, c, r, c ? hot : accent, bg));
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C(SP.s), 18); ctx.lineTo(C(SP.s), 74); ctx.stroke();
    ctx.font = mono(); ctx.fillStyle = muted; ctx.textBaseline = 'alphabetic';
    if (SP.s > 0) { ctx.textAlign = 'left'; ctx.fillText(st.aL + ' A · ' + st.bL + ' B', pad.l + 2, 14); }
    if (SP.s < 20) { ctx.textAlign = 'right'; ctx.fillText(st.aR + ' A · ' + st.bR + ' B', w - pad.r - 2, 14); }
    // curva de impureza ponderada
    const top = 100, bot = h - 26, ymax = SP.crit === 'gini' ? 0.5 : 1;
    const Y = v => bot - v / ymax * (bot - top);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 2; k++) { const v = ymax * k / 2, y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(M.fmt(v, 2), pad.l - 6, y); }
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = ink; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(st.iP) + .5); ctx.lineTo(w - pad.r, Y(st.iP) + .5); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
    for (let s = 0; s <= 20; s++) { const y = Y(spStats(s).w); s ? ctx.lineTo(C(s), y) : ctx.moveTo(C(s), y); }
    ctx.stroke();
    // ganancia como segmento vertical
    ctx.strokeStyle = hot; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(C(SP.s), Y(st.iP)); ctx.lineTo(C(SP.s), Y(st.w)); ctx.stroke();
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(C(SP.s), Y(st.w), 4.5, 0, 7); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(C(best), Y(spStats(best).w), 7.5, 0, 7); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let s = 0; s <= 20; s += 5) ctx.fillText(s, C(s), h - 8);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, bot + .5); ctx.lineTo(w - pad.r, bot + .5); ctx.stroke();
  }
  $('trees-sp-s').addEventListener('input', e => { SP.s = +e.target.value; spDraw(); });
  M.segBind('trees-sp-crit', b => { SP.crit = b.dataset.c; spDraw(); });
  $('trees-sp-best').addEventListener('click', () => { SP.s = spBest(); $('trees-sp-s').value = SP.s; spDraw(); });

  // ---------- simulador 2: CART con Gini y random forest ----------
  const DMAX = 8, NT = 25, GRID = 60;
  const T = { depth: 3, mode: 'tree', data: 'moons', tr: [], te: [], trees: [], forests: [], acc: [] };
  const DOM = { moons: { x0: -1.7, x1: 2.7, y0: -1.25, y1: 1.75 }, circles: { x0: -1.6, x1: 1.6, y0: -1.6, y1: 1.6 } };
  function genPoint(c) {
    if (T.data === 'moons') { const t = Math.PI * Math.random(); const x = c ? 1 - Math.cos(t) : Math.cos(t), y = c ? 0.5 - Math.sin(t) : Math.sin(t); return [x + 0.2 * M.randn(), y + 0.2 * M.randn(), c]; }
    const a = 2 * Math.PI * Math.random(), rr = c ? 0.5 : 1.05; return [rr * Math.cos(a) + 0.16 * M.randn(), rr * Math.sin(a) + 0.16 * M.randn(), c];
  }
  const gini = (n1, n) => { if (!n) return 0; const p = n1 / n; return 2 * p * (1 - p); };
  function build(pts, depth, maxD, mtry, r, box) { // pts: arreglo de [x, y, clase]
    const n = pts.length; let n1 = 0; for (const p of pts) n1 += p[2];
    const node = { p: n1 / n, n, box };
    if (depth >= maxD || n1 === 0 || n1 === n || n < 2) return node;
    const parent = gini(n1, n);
    let feats = [0, 1];
    if (mtry === 1) feats = [r() < .5 ? 0 : 1];
    let best = null;
    const tryFeats = fs => {
      for (const j of fs) {
        const s = pts.slice().sort((a, b) => a[j] - b[j]);
        let l1 = 0;
        for (let i = 0; i < n - 1; i++) {
          l1 += s[i][2];
          if (s[i][j] === s[i + 1][j]) continue;
          const nl = i + 1, nr = n - nl, wimp = (nl * gini(l1, nl) + nr * gini(n1 - l1, nr)) / n;
          if (!best || wimp < best.w - 1e-12) best = { w: wimp, j, t: (s[i][j] + s[i + 1][j]) / 2 };
        }
      }
    };
    tryFeats(feats);
    if ((!best || best.w >= parent - 1e-12) && feats.length === 1) { best = null; tryFeats([1 - feats[0]]); } // como sklearn: si no hay corte útil, prueba las demás
    if (!best || best.w >= parent - 1e-12) return node;
    const L = [], R = []; for (const p of pts) (p[best.j] <= best.t ? L : R).push(p);
    const bl = box.slice(), br = box.slice();
    if (best.j === 0) { bl[1] = best.t; br[0] = best.t; } else { bl[3] = best.t; br[2] = best.t; }
    node.j = best.j; node.t = best.t;
    node.l = build(L, depth + 1, maxD, mtry, r, bl); node.r = build(R, depth + 1, maxD, mtry, r, br);
    return node;
  }
  const prob = (node, x) => { while (node.l) node = x[node.j] <= node.t ? node.l : node.r; return node.p; };
  const leaves = node => node.l ? leaves(node.l) + leaves(node.r) : 1;
  const leafList = (node, out = []) => { if (node.l) { leafList(node.l, out); leafList(node.r, out); } else out.push(node); return out; };
  const accOf = (pf, pts) => pts.reduce((a, p) => a + ((pf(p) > 0.5 ? 1 : 0) === p[2] ? 1 : 0), 0) / pts.length;

  function tFit() {
    const d = DOM[T.data], box = [d.x0, d.x1, d.y0, d.y1];
    T.trees = []; T.forests = []; T.acc = [];
    for (let k = 1; k <= DMAX; k++) {
      const tree = build(T.tr, 0, k, 2, null, box);
      const r = rng(1000 + k), forest = [], inbag = [];
      for (let b = 0; b < NT; b++) {
        const boot = [], used = new Uint8Array(T.tr.length);
        for (let i = 0; i < T.tr.length; i++) { const q = Math.floor(r() * T.tr.length); boot.push(T.tr[q]); used[q] = 1; }
        forest.push(build(boot, 0, k, 1, r, box)); inbag.push(used);
      }
      const fp = x => forest.reduce((a, t) => a + prob(t, x), 0) / NT;
      // exactitud OOB: cada punto se predice solo con los árboles que no lo vieron
      let ok = 0, cnt = 0;
      T.tr.forEach((p, i) => { let s = 0, m = 0; forest.forEach((t, b) => { if (!inbag[b][i]) { s += prob(t, p); m++; } }); if (m) { cnt++; ok += ((s / m > 0.5 ? 1 : 0) === p[2]) ? 1 : 0; } });
      T.trees[k] = tree; T.forests[k] = { trees: forest, fp, oob: ok / cnt, leaves: forest.reduce((a, t) => a + leaves(t), 0) / NT };
      T.acc[k] = { tree: { tr: accOf(x => prob(tree, x), T.tr), te: accOf(x => prob(tree, x), T.te) }, rf: { tr: accOf(fp, T.tr), te: accOf(fp, T.te) } };
    }
    tDraw();
  }
  function tNew() {
    T.tr = []; T.te = [];
    for (let i = 0; i < 200; i++) { T.tr.push(genPoint(i % 2)); T.te.push(genPoint(i % 2)); }
    tFit();
  }
  function tDraw() {
    const k = T.depth, a = T.acc[k][T.mode];
    $('trees-depth-v').textContent = k;
    $('trees-tr').textContent = M.pct(a.tr, 1); $('trees-te').textContent = M.pct(a.te, 1);
    if (T.mode === 'tree') { $('trees-leaves-l').textContent = 'número de hojas'; $('trees-leaves').textContent = leaves(T.trees[k]); $('trees-oob').textContent = '—'; }
    else { $('trees-leaves-l').textContent = 'hojas por árbol (prom.)'; $('trees-leaves').textContent = M.fmt(T.forests[k].leaves, 1); $('trees-oob').textContent = M.pct(T.forests[k].oob, 1); }
    $('trees-other').textContent = T.mode === 'tree' ? 'prueba del bosque' : 'prueba de un árbol';
    let bk = 1; for (let j = 2; j <= DMAX; j++) if (T.acc[j][T.mode].te > T.acc[bk][T.mode].te) bk = j;
    const far = a.te < T.acc[bk][T.mode].te - 0.02;
    $('trees-head').textContent = (T.mode === 'tree' ? 'un árbol' : '25 árboles') + ' · ' + (!far ? 'cerca de la mejor profundidad' : (k < bk ? 'demasiado simple' : 'sobreajusta'));
    drawMap(); drawAcc();
  }
  function drawMap() {
    const fr = M.fit($('trees-map')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), line = M.tok('--line'), bg = M.tok('--bg');
    ctx.clearRect(0, 0, w, h);
    const d = DOM[T.data];
    const X = v => (v - d.x0) / (d.x1 - d.x0) * w, Y = v => h - (v - d.y0) / (d.y1 - d.y0) * h;
    if (T.mode === 'tree') {
      for (const lf of leafList(T.trees[T.depth])) {
        const c = lf.p > 0.5, pur = Math.abs(lf.p - 0.5) * 2;
        ctx.fillStyle = c ? hot : accent; ctx.globalAlpha = 0.1 + 0.22 * pur;
        const [x0, x1, y0, y1] = lf.box;
        ctx.fillRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1));
        ctx.globalAlpha = .9; ctx.strokeStyle = bg; ctx.lineWidth = 1; ctx.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1));
      }
      ctx.globalAlpha = 1;
    } else {
      // rejilla de 60×60 pintada en un lienzo auxiliar de 60×60 píxeles y escalada con suavizado
      const fp = T.forests[T.depth].fp, off = T.off || (T.off = document.createElement('canvas'));
      off.width = GRID; off.height = GRID; const o = off.getContext('2d'); o.clearRect(0, 0, GRID, GRID);
      for (let gx = 0; gx < GRID; gx++) for (let gy = 0; gy < GRID; gy++) {
        const x = d.x0 + (gx + .5) / GRID * (d.x1 - d.x0), y = d.y1 - (gy + .5) / GRID * (d.y1 - d.y0);
        const p = fp([x, y]);
        o.fillStyle = p > 0.5 ? hot : accent; o.globalAlpha = 0.08 + 0.34 * Math.abs(p - 0.5) * 2;
        o.fillRect(gx, gy, 1, 1);
      }
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
    }
    for (const p of T.tr) marker(ctx, X(p[0]), Y(p[1]), p[2], 3.4, p[2] ? hot : accent, bg);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
    void ink;
  }
  function drawAcc() {
    const fr = M.fit($('trees-acc')); if (!fr) return; const { ctx, w, h } = fr;
    const accent = M.tok('--accent'), hot = M.tok('--hot'), ink = M.tok('--ink'), muted = M.tok('--muted'), line = M.tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 44, r: 14, t: 14, b: 26 }, lo = 0.5, hi = 1;
    const X = k => pad.l + (k - 1) / (DMAX - 1) * (w - pad.l - pad.r);
    const Y = v => h - pad.b - (Math.max(lo, v) - lo) / (hi - lo) * (h - pad.t - pad.b);
    ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let v = 0.5; v <= 1.0001; v += 0.1) { const y = Math.round(Y(v)) + .5; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(Math.round(v * 100) + ' %', pad.l - 6, y); }
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = ink; ctx.globalAlpha = .14; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X(T.depth), pad.t); ctx.lineTo(X(T.depth), h - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
    const other = T.mode === 'tree' ? 'rf' : 'tree';
    const line_ = (get, col, lw, dash) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); for (let k = 1; k <= DMAX; k++) { const y = Y(get(k)); k === 1 ? ctx.moveTo(X(k), y) : ctx.lineTo(X(k), y); } ctx.stroke(); ctx.setLineDash([]); };
    line_(k => T.acc[k][other].te, ink, 1.4, [4, 3]);
    line_(k => T.acc[k][T.mode].tr, accent, 2.2, []);
    line_(k => T.acc[k][T.mode].te, hot, 2.2, []);
    for (const [v, col] of [[T.acc[T.depth][T.mode].tr, accent], [T.acc[T.depth][T.mode].te, hot]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(T.depth), Y(v), 4.5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.textAlign = 'center';
    for (let k = 1; k <= DMAX; k++) ctx.fillText(k, X(k), h - 8);
  }
  $('trees-depth').addEventListener('input', e => { T.depth = +e.target.value; tDraw(); });
  M.segBind('trees-mode', b => { T.mode = b.dataset.m; tDraw(); });
  M.segBind('trees-data', b => { T.data = b.dataset.d; tNew(); });
  $('trees-again').addEventListener('click', tNew);

  M.draw['trees'] = () => { spDraw(); tDraw(); };
  M.init.push(() => { spDraw(); tNew(); });
})();
