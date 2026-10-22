/* StatEdx · sesión kmeans: Clustering: k-means y jerárquico */
(() => {
  const { fit, tok, fmt, randn, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const PAL = ['--accent', '--hot', '--r-mod', '--r-ds', '--ink', '--muted'];
  const cols = () => PAL.map(tok);
  function shape(ctx, x, y, s, r) {
    ctx.beginPath();
    if (s === 0 || s === 4) ctx.arc(x, y, r, 0, 7);
    else if (s === 1 || s === 5) ctx.rect(x - r * .88, y - r * .88, r * 1.76, r * 1.76);
    else if (s === 2) { ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 1.05, y + r * .75); ctx.lineTo(x - r * 1.05, y + r * .75); ctx.closePath(); }
    else { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.1, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.1, y); ctx.closePath(); }
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- simulador 1: k-means paso a paso ----------
  const N = 300, KMAX = 6, LIM = 1.25, G = 64;
  const S = { k: 4, init: 'rand', data: 'blobs', pts: [], D: null, c: [], a: null, phase: 'assign', it: 0, done: false, elbow: [], timer: 0 };
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

  function genData() {
    const pts = [];
    for (let i = 0; i < N; i++) {
      if (S.data === 'blobs') {
        const m = [[-0.55, 0.5], [0.5, 0.58], [-0.45, -0.5], [0.58, -0.45]][i % 4];
        pts.push([m[0] + 0.17 * randn(), m[1] + 0.17 * randn()]);
      } else if (S.data === 'long') {
        const cx = [-0.55, 0, 0.55][i % 3], t = 0.42 * randn(), u = 0.07 * randn();
        pts.push([cx + u + 0.12 * t, Math.max(-1.15, Math.min(1.15, t))]);
      } else {
        if (i % 3 === 0) pts.push([0.15 * randn(), 0.15 * randn()]);
        else { const a = 2 * Math.PI * Math.random(), r = 0.82 + 0.06 * randn(); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
      }
    }
    S.pts = pts;
    const D = new Float32Array(N * N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) D[i * N + j] = D[j * N + i] = Math.sqrt(d2(pts[i], pts[j]));
    S.D = D;
  }
  function initCenters(k, kind, r = Math.random) {
    const P = S.pts, c = [];
    if (kind === 'rand') {
      const used = new Set();
      while (c.length < k) { const i = Math.floor(r() * N); if (!used.has(i)) { used.add(i); c.push(P[i].slice()); } }
      return c;
    }
    c.push(P[Math.floor(r() * N)].slice());
    const md = P.map(p => d2(p, c[0]));
    while (c.length < k) {
      let tot = 0; for (const v of md) tot += v;
      let u = r() * tot, i = 0; while (i < N - 1 && (u -= md[i]) > 0) i++;
      c.push(P[i].slice());
      for (let j = 0; j < N; j++) md[j] = Math.min(md[j], d2(P[j], P[i]));
    }
    return c;
  }
  function assign(c, a) {
    let ch = false;
    for (let i = 0; i < N; i++) {
      let b = 0, bd = Infinity;
      for (let j = 0; j < c.length; j++) { const v = d2(S.pts[i], c[j]); if (v < bd) { bd = v; b = j; } }
      if (a[i] !== b) { a[i] = b; ch = true; }
    }
    return ch;
  }
  function update(c, a) {
    const sx = new Float64Array(c.length), sy = new Float64Array(c.length), n = new Float64Array(c.length);
    for (let i = 0; i < N; i++) { sx[a[i]] += S.pts[i][0]; sy[a[i]] += S.pts[i][1]; n[a[i]]++; }
    for (let j = 0; j < c.length; j++) if (n[j]) c[j] = [sx[j] / n[j], sy[j] / n[j]];
  }
  const wcss = (c, a) => { let w = 0; for (let i = 0; i < N; i++) w += d2(S.pts[i], c[a[i]]); return w; };
  function silhouette(a, k) {
    if (k < 2) return NaN;
    let tot = 0; const sum = new Float64Array(k), cnt = new Float64Array(k);
    for (let i = 0; i < N; i++) cnt[a[i]]++;
    for (let i = 0; i < N; i++) {
      sum.fill(0);
      for (let j = 0; j < N; j++) if (j !== i) sum[a[j]] += S.D[i * N + j];
      const own = a[i]; if (cnt[own] < 2) continue;
      const ai = sum[own] / (cnt[own] - 1); let bi = Infinity;
      for (let g = 0; g < k; g++) if (g !== own && cnt[g]) bi = Math.min(bi, sum[g] / cnt[g]);
      if (bi === Infinity) continue;
      tot += (bi - ai) / Math.max(ai, bi);
    }
    return tot / N;
  }
  function lloyd(k, kind, r) {
    const c = initCenters(k, kind, r), a = new Int8Array(N).fill(-1);
    for (let t = 0; t < 100; t++) { if (!assign(c, a) && t) break; update(c, a); }
    return { c, a, w: wcss(c, a) };
  }
  function computeElbow() {
    const r = rng(7);
    S.elbow = [];
    for (let k = 1; k <= KMAX; k++) {
      let best = null;
      for (let s = 0; s < 6; s++) { const f = lloyd(k, 'pp', r); if (!best || f.w < best.w) best = f; }
      S.elbow[k] = { w: best.w, s: silhouette(best.a, k) };
    }
  }
  function reinit() {
    stop();
    S.c = initCenters(S.k, S.init); S.a = new Int8Array(N).fill(-1);
    S.phase = 'assign'; S.it = 0; S.done = false; S.sil = NaN;
    kmDraw();
  }
  function step() {
    if (S.done) return;
    if (S.phase === 'assign') {
      const ch = assign(S.c, S.a);
      if (!ch && S.it > 0) S.done = true;
      S.phase = 'update'; S.sil = silhouette(S.a, S.k);
    } else { update(S.c, S.a); S.it++; S.phase = 'assign'; }
    kmDraw();
  }
  function stop() { if (S.timer) { clearTimeout(S.timer); S.timer = 0; } $('kmeans-run').textContent = 'Ejecutar'; }
  function run() {
    if (S.timer) { stop(); return; }
    if (S.done) reinit();
    $('kmeans-run').textContent = 'Detener';
    const tick = () => {
      if (M.current !== 'kmeans' || S.done) { stop(); return; }
      step(); S.timer = setTimeout(tick, 380);
    };
    tick();
  }
  function newData() { stop(); genData(); computeElbow(); reinit(); }

  function kmDraw() {
    if (!S.pts.length) return;
    const C = cols(), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    const assigned = S.a && S.a[0] >= 0;
    $('kmeans-k-v').textContent = S.k;
    $('kmeans-r-it').textContent = S.it;
    $('kmeans-r-w').textContent = assigned ? fmt(wcss(S.c, S.a), 2) : '—';
    $('kmeans-r-s').textContent = assigned && S.k > 1 ? fmt(S.sil, 3) : '—';
    $('kmeans-r-st').textContent = S.done ? 'convergió' : S.phase === 'assign' ? 'toca asignar' : 'toca actualizar';
    $('kmeans-phase').textContent = S.done ? 'asignaciones estables' : 'próximo paso: ' + (S.phase === 'assign' ? 'asignar' : 'mover centros');
    $('kmeans-head').textContent = `k = ${S.k} · ${S.init === 'pp' ? 'k-means++' : 'inicio al azar'}`;

    let fr = fit($('kmeans-c'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const sc = Math.min(w, h) / (2 * LIM), ox = w / 2, oy = h / 2;
      const X = v => ox + v * sc, Y = v => oy - v * sc;
      // región de cada centro (Voronoi) en una rejilla
      const off = S.off || (S.off = document.createElement('canvas')), gw = G, gh = Math.max(8, Math.round(G * h / w));
      off.width = gw; off.height = gh; const o = off.getContext('2d'); o.clearRect(0, 0, gw, gh); o.globalAlpha = .13;
      for (let gx = 0; gx < gw; gx++) for (let gy = 0; gy < gh; gy++) {
        const p = [((gx + .5) / gw * w - ox) / sc, (oy - (gy + .5) / gh * h) / sc];
        let b = 0, bd = Infinity; S.c.forEach((c, j) => { const v = d2(p, c); if (v < bd) { bd = v; b = j; } });
        o.fillStyle = C[b % 6]; o.fillRect(gx, gy, 1, 1);
      }
      ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, w, h);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .5;
      for (let v = -1; v <= 1; v += 0.5) { ctx.beginPath(); ctx.moveTo(X(v) + .5, 0); ctx.lineTo(X(v) + .5, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, Y(v) + .5); ctx.lineTo(w, Y(v) + .5); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // puntos
      for (let i = 0; i < N; i++) {
        const p = S.pts[i], g = assigned ? S.a[i] : -1;
        ctx.fillStyle = g < 0 ? muted : C[g % 6]; ctx.globalAlpha = g < 0 ? .55 : .85;
        shape(ctx, X(p[0]), Y(p[1]), g < 0 ? 0 : g, 2.9); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // centros
      S.c.forEach((c, j) => {
        const x = X(c[0]), y = Y(c[1]);
        ctx.fillStyle = C[j % 6]; ctx.strokeStyle = bg; ctx.lineWidth = 3; shape(ctx, x, y, j, 8); ctx.stroke(); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = 1.6; shape(ctx, x, y, j, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
      });
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
    }

    fr = fit($('kmeans-elbow'));
    if (fr && S.elbow.length) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const accent = C[0], hot = C[1];
      const pad = { l: 44, r: 40, t: 16, b: 26 }, wmax = S.elbow[1].w;
      const X = k => pad.l + (k - 1) / (KMAX - 1) * (w - pad.l - pad.r);
      const Yw = v => h - pad.b - v / wmax * (h - pad.t - pad.b), Ys = v => h - pad.b - v * (h - pad.t - pad.b);
      ctx.font = mono(); ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
      for (let q = 0; q <= 4; q++) {
        const y = Math.round(h - pad.b - q / 4 * (h - pad.t - pad.b)) + .5;
        ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = accent; ctx.textAlign = 'right'; ctx.fillText(fmt(wmax * q / 4, 0), pad.l - 6, y);
        ctx.fillStyle = hot; ctx.textAlign = 'left'; ctx.fillText(fmt(q / 4, 2), w - pad.r + 6, y);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = ink; ctx.globalAlpha = .14; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(X(S.k), pad.t); ctx.lineTo(X(S.k), h - pad.b); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let k = 1; k <= KMAX; k++) { const y = Yw(S.elbow[k].w); k === 1 ? ctx.moveTo(X(k), y) : ctx.lineTo(X(k), y); } ctx.stroke();
      ctx.strokeStyle = hot; ctx.beginPath();
      for (let k = 2; k <= KMAX; k++) { const y = Ys(Math.max(0, S.elbow[k].s)); k === 2 ? ctx.moveTo(X(k), y) : ctx.lineTo(X(k), y); } ctx.stroke();
      let bs = 2; for (let k = 3; k <= KMAX; k++) if (S.elbow[k].s > S.elbow[bs].s) bs = k;
      for (let k = 1; k <= KMAX; k++) {
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(X(k), Yw(S.elbow[k].w), 3.5, 0, 7); ctx.fill();
        if (k > 1) { ctx.fillStyle = hot; ctx.beginPath(); ctx.rect(X(k) - 3.2, Ys(Math.max(0, S.elbow[k].s)) - 3.2, 6.4, 6.4); ctx.fill(); }
      }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(bs), Ys(S.elbow[bs].s), 8, 0, 7); ctx.stroke();
      if (S.done && S.k > 0) { ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); const y = Yw(wcss(S.c, S.a)); ctx.beginPath(); ctx.moveTo(X(S.k) - 14, y); ctx.lineTo(X(S.k) + 14, y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = 'center';
      for (let k = 1; k <= KMAX; k++) ctx.fillText(k, X(k), h - 8);
    }
  }

  $('kmeans-k').addEventListener('input', e => { S.k = +e.target.value; reinit(); });
  segBind('kmeans-init', b => { S.init = b.dataset.i; reinit(); });
  segBind('kmeans-data', b => { S.data = b.dataset.d; newData(); });
  $('kmeans-step').addEventListener('click', () => { stop(); step(); });
  $('kmeans-run').addEventListener('click', run);
  $('kmeans-reinit').addEventListener('click', reinit);
  $('kmeans-again').addEventListener('click', newData);

  // ---------- simulador 2: clustering jerárquico ----------
  const NH = 14, LET = 'ABCDEFGHIJKLMN';
  const H = { link: 'complete', cut: 55, pts: [], merges: [], seed: 3 };
  function hcPoints() {
    const r = rng(H.seed), g = () => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const cen = [[2.2, 7.4], [7.3, 7.8], [5.0, 2.4]], pts = [];
    const ok = q => pts.every(p => Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.85);
    const clamp = q => [Math.max(0.5, Math.min(9.5, q[0])), Math.max(0.5, Math.min(9.5, q[1]))];
    for (let i = 0; i < 12; i++) { const c = cen[i % 3]; let q, t = 0; do { q = clamp([c[0] + 0.8 * g(), c[1] + 0.8 * g()]); } while (!ok(q) && ++t < 200); pts.push(q); }
    for (const c of [[4.8, 5.6], [9.0, 3.6]]) { let q, t = 0; do { q = clamp([c[0] + 0.5 * g(), c[1] + 0.5 * g()]); } while (!ok(q) && ++t < 200); pts.push(q); }
    H.pts = pts;
    hcBuild();
  }
  function hcBuild() {
    const P = H.pts, dd = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
    let cl = P.map((p, i) => ({ id: i, m: [i] }));
    const linkD = (A, B) => {
      if (H.link === 'ward') {
        const ca = [0, 0], cb = [0, 0];
        for (const i of A.m) { ca[0] += P[i][0] / A.m.length; ca[1] += P[i][1] / A.m.length; }
        for (const i of B.m) { cb[0] += P[i][0] / B.m.length; cb[1] += P[i][1] / B.m.length; }
        return Math.sqrt(2 * A.m.length * B.m.length / (A.m.length + B.m.length)) * Math.hypot(ca[0] - cb[0], ca[1] - cb[1]);
      }
      let mn = Infinity, mx = 0, s = 0;
      for (const i of A.m) for (const j of B.m) { const v = dd(i, j); mn = Math.min(mn, v); mx = Math.max(mx, v); s += v; }
      return H.link === 'single' ? mn : H.link === 'complete' ? mx : s / (A.m.length * B.m.length);
    };
    H.merges = []; let next = NH;
    while (cl.length > 1) {
      let bi = 0, bj = 1, bd = Infinity;
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const v = linkD(cl[i], cl[j]); if (v < bd) { bd = v; bi = i; bj = j; } }
      const A = cl[bi], B = cl[bj], node = { id: next++, m: A.m.concat(B.m), l: A.id, r: B.id, h: bd };
      H.merges.push(node);
      cl = cl.filter((_, q) => q !== bi && q !== bj); cl.push(node);
    }
  }
  function hcDraw() {
    if (!H.pts.length) return;
    const C = cols(), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg'), hot = tok('--hot');
    const top = H.merges[NH - 2].h, cutH = H.cut / 100 * top * 1.08;
    // grupos bajo el corte (unión de las fusiones con altura ≤ corte)
    const par = Array.from({ length: 2 * NH }, (_, i) => i), find = x => par[x] === x ? x : (par[x] = find(par[x]));
    for (const m of H.merges) if (m.h <= cutH) { par[find(m.l)] = m.id; par[find(m.r)] = m.id; par[m.id] = m.id; }
    const roots = {}; for (let i = 0; i < NH; i++) { const r = find(i); (roots[r] = roots[r] || []).push(i); }
    const groups = Object.values(roots).sort((a, b) => b.length - a.length || a[0] - b[0]);
    const gcol = new Array(NH), gidx = new Array(NH);
    groups.forEach((g, q) => g.forEach(i => { gidx[i] = q; gcol[i] = g.length > 1 && q < 4 ? C[q] : muted; }));
    const hs = H.merges.map(m => m.h); let gj = 0, gv = -1;
    for (let j = 0; j < hs.length - 1; j++) if (hs[j + 1] - hs[j] > gv) { gv = hs[j + 1] - hs[j]; gj = j; }
    $('kmeans-cut-v').textContent = fmt(cutH, 2);
    $('kmeans-hc-k').textContent = groups.length;
    $('kmeans-hc-h').textContent = fmt(cutH, 2);
    $('kmeans-hc-top').textContent = fmt(top, 2);
    $('kmeans-hc-gap').textContent = 'k = ' + (NH - gj - 1);
    $('kmeans-hc-head').textContent = { single: 'enlace simple', complete: 'enlace completo', average: 'enlace promedio', ward: 'enlace de Ward' }[H.link];

    let fr = fit($('kmeans-hc-pts'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const sc = Math.min(w, h) / 10.4, ox = (w - 10 * sc) / 2, oy = (h - 10 * sc) / 2;
      const X = v => ox + v * sc, Y = v => h - oy - v * sc;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .5;
      for (let v = 0; v <= 10; v += 2) { ctx.beginPath(); ctx.moveTo(X(v) + .5, Y(0)); ctx.lineTo(X(v) + .5, Y(10)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(0), Y(v) + .5); ctx.lineTo(X(10), Y(v) + .5); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // une cada punto con el centro de su grupo
      groups.forEach(g => { if (g.length < 2) return; const cx = g.reduce((s, i) => s + H.pts[i][0], 0) / g.length, cy = g.reduce((s, i) => s + H.pts[i][1], 0) / g.length;
        ctx.strokeStyle = gcol[g[0]]; ctx.globalAlpha = .45; ctx.lineWidth = 1.2; g.forEach(i => { ctx.beginPath(); ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(H.pts[i][0]), Y(H.pts[i][1])); ctx.stroke(); }); ctx.globalAlpha = 1; });
      ctx.font = '600 11px ' + tok('--f-mono'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      H.pts.forEach((p, i) => {
        ctx.fillStyle = gcol[i]; ctx.strokeStyle = bg; ctx.lineWidth = 2; shape(ctx, X(p[0]), Y(p[1]), gidx[i] < 4 && groups[gidx[i]].length > 1 ? gidx[i] : 0, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bg; ctx.fillText(LET[i], X(p[0]), Y(p[1]) + (gidx[i] === 2 ? 2 : 0) + .5);
      });
      ctx.textBaseline = 'alphabetic';
    }

    fr = fit($('kmeans-hc-tree'));
    if (fr) {
      const { ctx, w, h } = fr; ctx.clearRect(0, 0, w, h);
      const pad = { l: 38, r: 10, t: 12, b: 24 }, ymax = top * 1.08;
      const Y = v => h - pad.b - v / ymax * (h - pad.t - pad.b);
      const byId = {}; H.merges.forEach(m => byId[m.id] = m);
      const order = []; const walk = id => { if (id < NH) order.push(id); else { walk(byId[id].l); walk(byId[id].r); } };
      walk(H.merges[NH - 2].id);
      const pos = {}; order.forEach((id, q) => pos[id] = pad.l + (q + .5) / NH * (w - pad.l - pad.r));
      const yOf = id => id < NH ? Y(0) : Y(byId[id].h);
      const step = ymax > 12 ? 4 : ymax > 6 ? 2 : ymax > 3 ? 1 : 0.5;
      ctx.font = mono(); ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let v = 0; v <= ymax + 1e-9; v += step) { const y = Math.round(Y(v)) + .5; ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillText(fmt(v, step < 1 ? 1 : 0), pad.l - 6, y); }
      ctx.textBaseline = 'alphabetic';
      for (const m of H.merges) {
        pos[m.id] = (pos[m.l] + pos[m.r]) / 2;
        const below = m.h <= cutH, col = below ? gcol[m.m[0]] : ink;
        ctx.strokeStyle = col; ctx.lineWidth = below ? 2.2 : 1.6;
        ctx.beginPath(); ctx.moveTo(pos[m.l], yOf(m.l)); ctx.lineTo(pos[m.l], Y(m.h)); ctx.lineTo(pos[m.r], Y(m.h)); ctx.lineTo(pos[m.r], yOf(m.r)); ctx.stroke();
      }
      ctx.strokeStyle = hot; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(cutH)); ctx.lineTo(w - pad.r, Y(cutH)); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 11px ' + tok('--f-mono'); ctx.textAlign = 'center';
      order.forEach(id => { ctx.fillStyle = gcol[id] === muted ? muted : gcol[id]; ctx.fillText(LET[id], pos[id], h - 8); });
    }
  }
  segBind('kmeans-link', b => { H.link = b.dataset.l; hcBuild(); hcDraw(); });
  $('kmeans-cut').addEventListener('input', e => { H.cut = +e.target.value; hcDraw(); });
  $('kmeans-hc-again').addEventListener('click', () => { H.seed = Math.floor(Math.random() * 1e9); hcPoints(); hcDraw(); });

  M.draw['kmeans'] = () => { kmDraw(); hcDraw(); };
  M.init.push(() => { genData(); computeElbow(); reinit(); hcPoints(); hcDraw(); });
})();
