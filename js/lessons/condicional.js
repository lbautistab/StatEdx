/* StatEdx · sesión condicional: Probabilidad condicional y teorema de Bayes */
(() => {
  const { fit, tok, fmt, pct, segBind } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  const pctAuto = p => p < 0.01 ? pct(p, 2) : p < 0.1 ? pct(p, 1) : pct(p, 1);

  // ================= laboratorio 1: valor predictivo =================
  const DX = { prev: 0.02, sens: 0.9, esp: 0.95, k: 1 };
  const prevFrom = v => { const p = 0.001 * Math.pow(500, v / 100); const d = Math.pow(10, Math.floor(Math.log10(p)) - 1); return Math.round(p / d) * d; };
  const vppOf = (prev, s, e) => s * prev / (s * prev + (1 - e) * (1 - prev));
  const el = { prev: $('condicional-prev'), sens: $('condicional-sens'), esp: $('condicional-esp') };
  el.prev.addEventListener('input', () => { DX.prev = prevFrom(+el.prev.value); drawDX(); });
  el.sens.addEventListener('input', () => { DX.sens = +el.sens.value / 100; drawDX(); });
  el.esp.addEventListener('input', () => { DX.esp = +el.esp.value / 1000; drawDX(); });
  segBind('condicional-k', b => { DX.k = +b.dataset.k; drawDX(); });

  function drawDX() {
    const { sens, esp, k } = DX;
    $('condicional-prev-v').textContent = pct(DX.prev, DX.prev < 0.01 ? 2 : DX.prev < 0.1 ? 1 : 0);
    $('condicional-sens-v').textContent = pct(sens, 0);
    $('condicional-esp-v').textContent = pct(esp, 1);
    // la prevalencia con la que llega la gente a la prueba k es la posterior tras k − 1 positivos
    let pin = DX.prev; for (let i = 1; i < k; i++) pin = vppOf(pin, sens, esp);
    const post = vppOf(pin, sens, esp);
    const vpn = esp * (1 - pin) / (esp * (1 - pin) + (1 - sens) * pin);
    const lr = sens / (1 - esp);
    $('condicional-vpp').textContent = pctAuto(post);
    $('condicional-vpn').textContent = pct(vpn, vpn > 0.999 ? 2 : 1);
    const nPos = 1000 * (sens * pin + (1 - esp) * (1 - pin));
    $('condicional-npos').textContent = fmt(nPos, nPos < 10 ? 1 : 0);
    $('condicional-lr').textContent = fmt(lr, lr < 10 ? 1 : 0);
    $('condicional-dx-head').textContent = k === 1 ? 'una prueba' : k + ' pruebas positivas seguidas';
    $('condicional-grid-lbl').textContent = 'prevalencia de entrada ' + pctAuto(pin);
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // ---- cuadrícula de 1 000 personas ----
    let f = fit($('condicional-c-grid'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const nI = Math.round(1000 * pin), tp = Math.round(nI * sens), fn = nI - tp;
      const nS = 1000 - nI, fp = Math.round(nS * (1 - esp)), tn = nS - fp;
      const cols = 40, rows = 25, pad = 6, top = 22;
      const cell = Math.min((w - 2 * pad) / cols, (h - top - pad) / rows);
      const x0 = (w - cell * cols) / 2, r = Math.max(1.2, cell * 0.36);
      // orden por columnas: primero infectados positivos, luego infectados negativos, falsos positivos, sanos negativos
      const kinds = [[tp, accent, 1], [fn, ink, 1], [fp, hot, 1], [tn, line, .9]];
      let idx = 0;
      for (const [n, color, a] of kinds) {
        ctx.fillStyle = color; ctx.globalAlpha = a;
        for (let i = 0; i < n; i++, idx++) {
          const c = Math.floor(idx / rows), rr = idx % rows;
          ctx.beginPath(); ctx.arc(x0 + (c + .5) * cell, top + (rr + .5) * cell, r, 0, 2 * Math.PI); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.font = mono(); ctx.textAlign = 'left'; ctx.fillStyle = ink;
      const txt = `positivos: ${tp + fp} · verdaderos: ${tp}`;
      ctx.fillText(txt, x0, 13);
    }

    // ---- curva VPP vs prevalencia ----
    f = fit($('condicional-c-vpp'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 12, t: 12, b: 26 };
      const L0 = Math.log10(0.001), L1 = Math.log10(0.5);
      const X = p => pad.l + (Math.log10(p) - L0) / (L1 - L0) * (w - pad.l - pad.r);
      const Y = v => h - pad.b - v * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
      const xt = [0.001, 0.01, 0.1, 0.5];
      for (const p of [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5]) { const xx = Math.round(X(p)) + .5; ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke(); }
      for (let v = 0; v <= 1.001; v += 0.25) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // curvas para 1, 2 y 3 pruebas; la elegida resaltada
      for (let kk = 1; kk <= 3; kk++) {
        ctx.strokeStyle = kk === k ? accent : muted; ctx.lineWidth = kk === k ? 2.6 : 1.3; ctx.setLineDash(kk === k ? [] : [4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const p = Math.pow(10, L0 + (L1 - L0) * i / 200); let q = p;
          for (let j = 0; j < kk; j++) q = vppOf(q, sens, esp);
          const yy = Y(q); i ? ctx.lineTo(X(p), yy) : ctx.moveTo(X(p), yy);
        }
        ctx.stroke(); ctx.setLineDash([]);
      }
      // diagonal: sin información (VPP = prevalencia)
      ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.globalAlpha = .5; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const p = Math.pow(10, L0 + (L1 - L0) * i / 100); i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)); }
      ctx.stroke(); ctx.globalAlpha = 1;
      // punto actual
      const xp = X(DX.prev), yp = Y(post);
      ctx.strokeStyle = hot; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xp, h - pad.b); ctx.lineTo(xp, yp); ctx.lineTo(pad.l, yp); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(xp, yp, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (const p of xt) ctx.fillText(pct(p, p < 0.01 ? 1 : 0).replace(' ', ''), Math.min(X(p), w - pad.r - 14), h - 8);
      ctx.textAlign = 'right';
      for (let v = 0; v <= 1.001; v += 0.25) ctx.fillText(Math.round(v * 100) + '%', pad.l - 5, Y(v) + 4);
      ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.globalAlpha = .7;
      ctx.fillText('VPP = prev.', X(0.12), Y(0.12) + 14 > h - pad.b - 4 ? Y(0.12) - 6 : Y(0.12) + 14);
      ctx.globalAlpha = 1;
    }
  }

  // ================= laboratorio 2: Monty Hall =================
  const MH = { n: 3, games: 0, stay: 0, sw: 0, hist: [] };
  function play(times) {
    for (let t = 0; t < times; t++) {
      const car = Math.floor(Math.random() * MH.n), pick = Math.floor(Math.random() * MH.n);
      // el presentador abre todas las demás puertas con cabra menos una; cambiar gana si la elección inicial falló
      MH.games++; if (pick === car) MH.stay++; else MH.sw++;
      MH.hist.push([MH.stay / MH.games, MH.sw / MH.games]);
    }
    drawMH();
  }
  function resetMH() { MH.games = MH.stay = MH.sw = 0; MH.hist = []; drawMH(); }
  $('condicional-play10').addEventListener('click', () => play(10));
  $('condicional-play500').addEventListener('click', () => play(500));
  $('condicional-reset').addEventListener('click', resetMH);
  segBind('condicional-doors', b => { MH.n = +b.dataset.n; resetMH(); });

  function drawMH() {
    const g = MH.games;
    $('condicional-mh-n').textContent = fmt(g, 0).replace(/\./g, ' ');
    $('condicional-mh-stay').textContent = g ? pct(MH.stay / g, 1) : '–';
    $('condicional-mh-sw').textContent = g ? pct(MH.sw / g, 1) : '–';
    $('condicional-mh-th').textContent = pct((MH.n - 1) / MH.n, 1);
    $('condicional-mh-head').textContent = MH.n + ' puertas · el presentador abre ' + (MH.n - 2);
    const f = fit($('condicional-c-mh')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 40, r: 14, t: 12, b: 26 };
    const N = Math.max(50, g);
    const X = i => pad.l + i / N * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .55;
    for (let v = 0; v <= 1.001; v += 0.25) { const yy = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const v of [1 / MH.n, (MH.n - 1) / MH.n]) { ctx.strokeStyle = muted; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke(); ctx.setLineDash([]); }
    for (const [j, color] of [[0, hot], [1, accent]]) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      MH.hist.forEach((pt, i) => { const xx = X(i + 1), yy = Y(pt[j]); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
    }
    ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
    for (let v = 0; v <= 1.001; v += 0.25) ctx.fillText(Math.round(v * 100) + '%', pad.l - 5, Y(v) + 4);
    ctx.textAlign = 'center';
    const step = N <= 50 ? 10 : N <= 200 ? 50 : N <= 1000 ? 250 : N <= 3000 ? 500 : 1000 * Math.ceil(N / 6000);
    for (let i = 0; i <= N; i += step) { const xx = X(i); if (xx > w - pad.r - 12 && i) continue; ctx.fillText(String(i), xx, h - 8); }
    if (!g) { ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText('pulsa “Jugar” para empezar', (pad.l + w - pad.r) / 2, Y(0.5) + 4); }
    else { ctx.textAlign = 'right'; ctx.fillStyle = muted; ctx.fillText('juegos →', w - pad.r, Y(0.5) + 4); }
  }

  M.draw.condicional = () => { drawDX(); drawMH(); };
  M.init.push(() => { DX.prev = prevFrom(+el.prev.value); drawDX(); drawMH(); });
})();
