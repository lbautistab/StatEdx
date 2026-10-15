/* Muestra · clase 6, pruebas de hipótesis */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;

  // ---------- lesson: hypothesis tests ----------
  const BIN = (() => { const p = [Math.pow(0.5, 100)]; for (let k = 0; k < 100; k++) p.push(p[k] * (100 - k) / (k + 1)); return p; })();
  const PH = { k: 60, a: 0.05 };
  function phPval(k) { const d = Math.abs(k - 50); let s = 0; for (let i = 0; i <= 100; i++) if (Math.abs(i - 50) >= d) s += BIN[i]; return Math.min(1, s); }
  function drawPH() {
    const p = phPval(PH.k), rej = p < PH.a;
    document.getElementById('ph-o').textContent = PH.k + ' de 100';
    document.getElementById('ph-p').textContent = fmt(p, 4);
    document.getElementById('ph-a').textContent = fmt(PH.a, 2);
    const d = document.getElementById('ph-d'); d.textContent = rej ? 'Rechazar' : 'No rechazar'; d.style.color = rej ? 'var(--hot)' : 'var(--ink)';
    document.getElementById('ph-head').textContent = 'Binomial(100; 0,5)';
    const f = fit(document.getElementById('c-ph')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 12, r: 12, t: 18, b: 26 }, lo = 24.5, hi = 75.5, peak = BIN[50] * 1.08;
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const Y = q => h - pad.b - q / peak * (h - pad.t - pad.b);
    const bw = (X(1) - X(0)) * 0.78, dd = Math.abs(PH.k - 50);
    for (let i = 25; i <= 75; i++) {
      const tail = Math.abs(i - 50) >= dd;
      ctx.fillStyle = tail ? hot : accent; ctx.globalAlpha = tail ? .95 : .35;
      ctx.fillRect(X(i) - bw / 2, Y(BIN[i]), bw, h - pad.b - Y(BIN[i]));
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.round(X(PH.k)) + .5, pad.t - 6); ctx.lineTo(Math.round(X(PH.k)) + .5, h - pad.b); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '600 12px ' + tok('--f-mono'); ctx.textAlign = PH.k > 66 ? 'right' : 'left';
    ctx.fillText(' tu resultado: ' + PH.k + ' ', X(PH.k), pad.t + 2);
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    axisTicks(ctx, X, 30, 70, 10, h - 8, muted);
  }
  const phk = document.getElementById('ph-k');
  phk.addEventListener('input', () => { PH.k = +phk.value; document.getElementById('ph-k-v').textContent = PH.k; drawPH(); });
  segBind('ph-alpha', b => { PH.a = +b.dataset.a; drawPH(); });

  const AB = { d: 0, ps: [] };
  function abRun() {
    AB.ps = Array.from({ length: 200 }, () => {
      let sa = 0, sb = 0; for (let i = 0; i < 50; i++) { sa += randn(); sb += randn() + AB.d; }
      const z = (sb / 50 - sa / 50) / Math.sqrt(2 / 50);
      return 2 * (1 - Phi(Math.abs(z)));
    });
    drawAB();
  }
  function drawAB() {
    const sig = AB.ps.filter(p => p < 0.05).length;
    const power = AB.d ? 1 - Phi(1.96 - AB.d / Math.sqrt(2 / 50)) + Phi(-1.96 - AB.d / Math.sqrt(2 / 50)) : 0.05;
    document.getElementById('ab-sig').textContent = sig + ' de 200';
    document.getElementById('ab-rate').textContent = pct(sig / 200);
    document.getElementById('ab-what').textContent = AB.d ? 'potencia' : 'falsos positivos';
    document.getElementById('ab-theory').textContent = AB.d ? '≈ ' + pct(power, 0) : 'α = 5 %';
    document.getElementById('ab-head').textContent = AB.d ? `efecto real = ${fmt(AB.d, 1)}σ` : 'H₀ es cierta';
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line'), ink = tok('--ink');
    let f = fit(document.getElementById('c-ab'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const cols = 20, rows = 10, gx = (w - 24) / cols, gy = (h - 24) / rows, r = Math.min(gx, gy) * 0.32;
      AB.ps.forEach((p, i) => {
        const x = 12 + gx * (i % cols + .5), y = 12 + gy * (Math.floor(i / cols) + .5);
        ctx.fillStyle = p < 0.05 ? hot : muted; ctx.globalAlpha = p < 0.05 ? 1 : .35;
        ctx.beginPath(); ctx.arc(x, y, p < 0.05 ? r * 1.15 : r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    f = fit(document.getElementById('c-ab-h'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 14, b: 26 }, B = 20, counts = new Array(B).fill(0);
      AB.ps.forEach(p => counts[Math.min(B - 1, Math.floor(p * B))]++);
      const peak = Math.max(...counts, 20);
      const X = v => pad.l + v * (w - pad.l - pad.r);
      const Y = c => h - pad.b - c / peak * (h - pad.t - pad.b);
      const px = (w - pad.l - pad.r) / B;
      counts.forEach((c, i) => { ctx.fillStyle = i === 0 ? hot : accent; ctx.globalAlpha = i === 0 ? 1 : .75; ctx.fillRect(pad.l + i * px + .5, Y(c), px - 1, h - pad.b - Y(c)); });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(10) + .5); ctx.lineTo(w - pad.r, Y(10) + .5); ctx.stroke(); ctx.setLineDash([]);
            ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, 1, 0.25, h - 8, muted);
    }
  }
  segBind('ab-d', b => { AB.d = +b.dataset.d; abRun(); });
  document.getElementById('ab-again').addEventListener('click', abRun);

  M.draw.ph = () => { drawPH(); drawAB(); };
  M.init.push(abRun);
})();
