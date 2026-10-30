/* StatEdx · sesión ph: Pruebas de hipótesis y valor p */
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
    const f = fit(document.getElementById('ph-c-coin')); if (!f) return; const { ctx, w, h } = f;
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
    document.getElementById('ph-ab-sig').textContent = sig + ' de 200';
    document.getElementById('ph-ab-rate').textContent = pct(sig / 200);
    document.getElementById('ph-ab-what').textContent = AB.d ? 'potencia' : 'falsos positivos';
    document.getElementById('ph-ab-theory').textContent = AB.d ? '≈ ' + pct(power, 0) : 'α = 5 %';
    document.getElementById('ph-ab-head').textContent = AB.d ? `efecto real = ${fmt(AB.d, 1)}σ` : 'H₀ es cierta';
    const accent = tok('--accent'), hot = tok('--hot'), muted = tok('--muted'), line = tok('--line'), ink = tok('--ink');
    let f = fit(document.getElementById('ph-c-ab'));
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
    f = fit(document.getElementById('ph-c-abh'));
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
  segBind('ph-ab-d', b => { AB.d = +b.dataset.d; abRun(); });
  document.getElementById('ph-ab-again').addEventListener('click', abRun);


  // ---------- potencia: distribuciones del estadístico z bajo H0 y bajo H1 ----------
  const PW = { d: 0.4, n: 50, a: 0.05 };
  const zq = a => { let lo = 0, hi = 8; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; (1 - Phi(m) > a) ? lo = m : hi = m; } return (lo + hi) / 2; };
  function drawPW() {
    const zc = zq(PW.a / 2), delta = PW.d * Math.sqrt(PW.n / 2);
    const power = 1 - Phi(zc - delta) + Phi(-zc - delta);
    const n80 = Math.ceil(2 * ((zc + 0.8416) / Math.max(PW.d, 1e-9)) ** 2);
    document.getElementById('ph-pw-pow').textContent = pct(power, 1);
    document.getElementById('ph-pw-beta').textContent = pct(1 - power, 1);
    document.getElementById('ph-pw-zc').textContent = '± ' + fmt(zc, 2);
    document.getElementById('ph-pw-n80').textContent = PW.d > 0 ? n80.toLocaleString('es') + ' por grupo' : '–';
    document.getElementById('ph-pw-head').textContent = `δ = d·√(n/2) = ${fmt(delta, 2)}`;
    const f = fit(document.getElementById('ph-c-pow')); if (!f) return; const { ctx, w, h } = f;
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');
    ctx.clearRect(0, 0, w, h);
    const pad = { l: 12, r: 12, t: 16, b: 26 }, lo = -4, hi = Math.max(6, delta + 4);
    const X = v => pad.l + (v - lo) / (hi - lo) * (w - pad.l - pad.r);
    const peak = npdf(0, 0, 1) * 1.1, Y = d => h - pad.b - d / peak * (h - pad.t - pad.b);
    const area = (a, b, m, col, alpha) => { ctx.fillStyle = col; ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(X(a), Y(0)); for (let i = 0; i <= 80; i++) { const x = a + (b - a) * i / 80; ctx.lineTo(X(x), Y(npdf(x, m, 1))); } ctx.lineTo(X(b), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; };
    area(zc, hi, delta, accent, .45); area(lo, -zc, delta, accent, .45);
    area(-zc, zc, delta, muted, .18);
    area(zc, hi, 0, hot, .7); area(lo, -zc, 0, hot, .7);
    for (const [m, col, dash] of [[0, ink, []], [delta, accent, [5, 4]]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const x = lo + (hi - lo) * i / 240; const y = Y(npdf(x, m, 1)); i ? ctx.lineTo(X(x), y) : ctx.moveTo(X(x), y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = muted; ctx.lineWidth = 1;
    for (const z of [-zc, zc]) { ctx.beginPath(); ctx.moveTo(Math.round(X(z)) + .5, pad.t - 4); ctx.lineTo(Math.round(X(z)) + .5, h - pad.b); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    ctx.fillText('H₀', X(0), Y(npdf(0, 0, 1)) - 4);
    if (delta > 0.6) { ctx.fillStyle = accent; ctx.fillText('H₁', X(delta), Y(npdf(0, 0, 1)) - 4); }
    axisTicks(ctx, X, -4, Math.floor(hi), w < 480 ? 2 : 1, h - 8, muted);
  }
  const pwD = document.getElementById('ph-pw-d'), pwN = document.getElementById('ph-pw-n');
  pwD.addEventListener('input', () => { PW.d = +pwD.value / 100; document.getElementById('ph-pw-d-v').textContent = fmt(PW.d, 2); drawPW(); });
  pwN.addEventListener('input', () => { PW.n = +pwN.value; document.getElementById('ph-pw-n-v').textContent = PW.n; drawPW(); });
  segBind('ph-pw-alpha', b => { PW.a = +b.dataset.a; drawPW(); });

  M.draw.ph = () => { drawPH(); drawAB(); drawPW(); };
  M.init.push(() => { abRun(); drawPW(); });
})();
