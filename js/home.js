/* Muestra · portada: tablero de Galton animado */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---------- Galton board ----------
  const G = { rows: 12, bins: new Array(13).fill(0), balls: [], total: 0, last: 0 };
  // start from a plausible resting state so the first frame already shows the bell
  (function seed() {
    for (let i = 0; i < 260; i++) { let k = 0; for (let r = 0; r < G.rows; r++) k += Math.random() < .5 ? 0 : 1; G.bins[k]++; G.total++; }
  })();
  function spawnBall() {
    const steps = []; for (let r = 0; r < G.rows; r++) steps.push(Math.random() < .5 ? -1 : 1);
    G.balls.push({ steps, t: -0.6, v: 0.045 + Math.random() * 0.01 });
  }
  function drawGalton() {
    const cv = document.getElementById('galton'); const f = fit(cv); if (!f) return; const { ctx, w, h } = f;
    const ink = tok('--ink'), accent = tok('--accent'), muted = tok('--muted'), line = tok('--line'), hot = tok('--hot');
    ctx.clearRect(0, 0, w, h);
    const top = 26, pegH = 170, dx = Math.min(w / (G.rows + 3), 30), dy = pegH / G.rows, cx = w / 2;
    // pegs
    ctx.fillStyle = muted;
    for (let r = 0; r < G.rows; r++) for (let j = 0; j <= r; j++) {
      const x = cx + (j - r / 2) * dx, y = top + r * dy;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // funnel
    ctx.strokeStyle = line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 26, 2); ctx.lineTo(cx - 6, top - 12); ctx.moveTo(cx + 26, 2); ctx.lineTo(cx + 6, top - 12); ctx.stroke();
    // bins
    const baseY = h - 22, binTop = top + pegH + 8, maxH = baseY - binTop;
    const max = Math.max(...G.bins, 1);
    const bw = dx * 0.78;
    for (let k = 0; k <= G.rows; k++) {
      const x = cx + (k - G.rows / 2) * dx;
      const bh = (G.bins[k] / max) * maxH * 0.92;
      ctx.fillStyle = accent; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - bw / 2, baseY - bh, bw, bh, [3, 3, 0, 0]) : ctx.rect(x - bw / 2, baseY - bh, bw, bh); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(x - dx / 2, binTop); ctx.lineTo(x - dx / 2, baseY); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx + (G.rows / 2 + .5) * dx, binTop); ctx.lineTo(cx + (G.rows / 2 + .5) * dx, baseY); ctx.stroke();
    // normal overlay (binomial n=12, p=.5 → N(6, √3))
    const s = Math.sqrt(G.rows) / 2, pk = npdf(G.rows / 2, G.rows / 2, s);
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const k = -0.5 + (G.rows + 1) * i / 120, x = cx + (k - G.rows / 2) * dx;
      const y = baseY - npdf(k, G.rows / 2, s) / pk * maxH * 0.92;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, baseY + .5); ctx.lineTo(w - 12, baseY + .5); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let k = 0; k <= G.rows; k += 2) ctx.fillText(k, cx + (k - G.rows / 2) * dx, baseY + 15);
    // balls
    ctx.fillStyle = hot;
    for (const b of G.balls) {
      let x, y;
      if (b.t < 0) { x = cx; y = top - 12 + b.t * 12; }
      else {
        const r = Math.floor(b.t), fr = b.t - r;
        let k0 = 0; for (let i = 0; i < r; i++) k0 += b.steps[i];
        const k1 = r < G.rows ? k0 + b.steps[r] : k0;
        const x0 = cx + k0 * dx / 2, x1 = cx + k1 * dx / 2;
        x = x0 + (x1 - x0) * fr; y = top + r * dy - 6 + fr * dy - Math.sin(fr * Math.PI) * 5;
        if (b.t >= G.rows) { y = binTop + (b.t - G.rows) * 60; }
      }
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    document.getElementById('galton-count').textContent = 'n = ' + G.total.toLocaleString('es');
  }
  function stepGalton(ts) {
    if (M.current === 'inicio' && !document.hidden) {
      if (ts - G.last > 120 && G.balls.length < 40) { spawnBall(); G.last = ts; }
      for (const b of G.balls) b.t += b.v;
      G.balls = G.balls.filter(b => {
        if (b.t >= G.rows + 0.4) {
          const k = (b.steps.reduce((a, c) => a + c, 0) + G.rows) / 2;
          G.bins[k]++; G.total++;
          if (Math.max(...G.bins) > 900) G.bins = G.bins.map(v => Math.round(v * 0.6));
          return false;
        }
        return true;
      });
      drawGalton();
    }
    requestAnimationFrame(stepGalton);
  }

  M.draw.inicio = drawGalton;
  M.init.push(() => { drawGalton(); if (!reduceMotion) requestAnimationFrame(stepGalton); });
})();
