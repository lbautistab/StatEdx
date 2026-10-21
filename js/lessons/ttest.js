/* StatEdx · sesión ttest: Pruebas t para una y dos medias */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const mono = () => '11px ' + tok('--f-mono');
  // ---------- distribuciones (gamma y beta incompletas) ----------
  function lgam(x) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgam(1 - x);
    x -= 1; let a = c[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const tiny = 1e-30, qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < tiny) d = tiny; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny; c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const ln = -x + a * Math.log(x) - lgam(a);
    if (x < a + 1) { let s = 1 / a, t = s; for (let n = 1; n < 500; n++) { t *= x / (a + n); s += t; if (Math.abs(t) < Math.abs(s) * 1e-15) break; } return s * Math.exp(ln); }
    const tiny = 1e-30; let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < tiny) d = tiny; c = b + an / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return 1 - Math.exp(ln) * h;
  }
  const tsf2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);           // valor p bilateral
  const tpdf = (t, df) => Math.exp(lgam((df + 1) / 2) - lgam(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + t * t / df));
  function tinv(p2, df) { let lo = 0, hi = 200; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; tsf2(m, df) > p2 ? lo = m : hi = m; } return (lo + hi) / 2; }
  const sgn = (x, d) => (x < 0 ? '−' : '') + fmt(Math.abs(x), d);
  const pfmt = p => p < 0.0001 ? '< 0,0001' : fmt(p, p < 0.01 ? 4 : 3);

  const NMAX = 60;
  const S = { design: 'welch', delta: 4, sd: 6, k: 1, na: 10, nb: 10, rho: 0.8, za: [], zb: [] };
  function newSample() {
    S.za = Array.from({ length: NMAX }, randn);
    S.zb = Array.from({ length: NMAX }, randn);
    S.jx = Array.from({ length: NMAX * 2 }, () => Math.random() - 0.5);
    draw();
  }
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const vari = (a, m = mean(a)) => a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);

  function sample() {
    const par = S.design === 'par';
    const na = S.na, nb = par ? S.na : S.nb;
    const A = [], B = [];
    for (let i = 0; i < na; i++) A.push(70 + S.sd * S.za[i]);
    for (let i = 0; i < nb; i++) {
      const z = par ? S.rho * S.za[i] + Math.sqrt(1 - S.rho * S.rho) * S.zb[i] : S.zb[i];
      B.push(70 + S.delta + S.k * S.sd * z);
    }
    return { A, B, par };
  }
  function test(A, B, design) {
    const ma = mean(A), mb = mean(B), va = vari(A, ma), vb = vari(B, mb), na = A.length, nb = B.length;
    const sp = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
    let t, df, d;
    if (design === 'par') {
      const D = B.map((b, i) => b - A[i]), md = mean(D), sd = Math.sqrt(vari(D, md));
      t = md / (sd / Math.sqrt(na)); df = na - 1; d = md / sd;
    } else if (design === 'student') {
      t = (mb - ma) / (sp * Math.sqrt(1 / na + 1 / nb)); df = na + nb - 2; d = (mb - ma) / sp;
    } else {
      const ua = va / na, ub = vb / nb;
      t = (mb - ma) / Math.sqrt(ua + ub); df = (ua + ub) ** 2 / (ua * ua / (na - 1) + ub * ub / (nb - 1)); d = (mb - ma) / sp;
    }
    if (!isFinite(t)) t = 0;
    return { t, df, p: tsf2(t, df), d, ma, mb };
  }

  function draw() {
    if (!S.za.length) return;
    const { A, B, par } = sample();
    const r = test(A, B, S.design);
    const rInd = par ? test(A, B, 'welch') : null;
    $('ttest-r-t').textContent = sgn(r.t, 2);
    $('ttest-r-df').textContent = fmt(r.df, Number.isInteger(r.df) ? 0 : 1);
    $('ttest-r-p').textContent = pfmt(r.p);
    $('ttest-r-d').textContent = sgn(r.d, 2);
    $('ttest-head').textContent = par ? `pareada · si ignoras el par: p = ${pfmt(rInd.p)}` : `x̄B − x̄A = ${sgn(r.mb - r.ma, 2)}`;
    $('ttest-lbl-t').textContent = 'gl = ' + fmt(r.df, Number.isInteger(r.df) ? 0 : 1);
    $('ttest-lbl').textContent = par ? '— media · líneas: pares' : '— media de cada grupo';
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line');

    // ----- datos -----
    let f = fit($('ttest-c-data'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 38, r: 12, t: 14, b: 26 };
      let lo = Infinity, hi = -Infinity;
      for (const v of A.concat(B)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const span = hi - lo, step = span > 80 ? 20 : span > 40 ? 10 : span > 16 ? 5 : 2;
      lo = Math.floor((lo - 1) / step) * step; hi = Math.ceil((hi + 1) / step) * step;
      const Y = v => h - pad.b - (v - lo) / (hi - lo) * (h - pad.t - pad.b);
      const cw = w - pad.l - pad.r, cx = [pad.l + cw * 0.3, pad.l + cw * 0.7], jw = Math.min(cw * 0.16, 60);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = lo; v <= hi + 1e-9; v += step) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'right';
      for (let v = lo; v <= hi + 1e-9; v += step) ctx.fillText(sgn(v, 0), pad.l - 6, Math.min(Math.max(Y(v) + 4, pad.t + 8), h - pad.b));
      ctx.textAlign = 'center';
      ctx.fillText(par ? 'A · antes' : 'grupo A', cx[0], h - 8); ctx.fillText(par ? 'B · después' : 'grupo B', cx[1], h - 8);
      const xa = i => par ? cx[0] + jw * 0.35 : cx[0] + S.jx[i] * jw * 1.4;
      const xb = i => par ? cx[1] - jw * 0.35 : cx[1] + S.jx[NMAX + i] * jw * 1.4;
      if (par) {
        ctx.lineWidth = 1;
        for (let i = 0; i < A.length; i++) { ctx.strokeStyle = B[i] > A[i] ? hot : muted; ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(xa(i), Y(A[i])); ctx.lineTo(xb(i), Y(B[i])); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      const dots = (arr, X, col) => { ctx.fillStyle = col; ctx.globalAlpha = .75; for (let i = 0; i < arr.length; i++) { ctx.beginPath(); ctx.arc(X(i), Y(arr[i]), 3.4, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; };
      dots(A, xa, accent); dots(B, xb, hot);
      // medias
      ctx.lineWidth = 3;
      for (const [m, x, col] of [[r.ma, cx[0], accent], [r.mb, cx[1], hot]]) {
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x - jw, Y(m)); ctx.lineTo(x + jw, Y(m)); ctx.stroke();
      }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx[0] + jw, Y(r.ma)); ctx.lineTo(cx[1] - jw, Y(r.mb)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
    }

    // ----- distribución t -----
    f = fit($('ttest-c-t'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 12, r: 12, t: 30, b: 26 }, L = 6;
      const X = v => pad.l + (v + L) / (2 * L) * (w - pad.l - pad.r);
      const peak = tpdf(0, Math.max(r.df, 1)) * 1.08;
      const Y = d => h - pad.b - d / Math.max(peak, npdf(0, 0, 1)) * (h - pad.t - pad.b);
      const df = Math.max(r.df, 1);
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let v = -L; v <= L; v += 2) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // colas del valor p
      const ta = Math.min(Math.abs(r.t), L);
      ctx.fillStyle = hot; ctx.globalAlpha = .35;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(X(s * ta), Y(0));
        for (let i = 0; i <= 80; i++) { const v = s * (ta + (L - ta) * i / 80); ctx.lineTo(X(v), Y(tpdf(v, df))); }
        ctx.lineTo(X(s * L), Y(0)); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // normal de referencia
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.globalAlpha = .6; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const v = -L + 2 * L * i / 200, y = Y(npdf(v, 0, 1)); i ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // curva t
      ctx.strokeStyle = accent; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const v = -L + 2 * L * i / 240, y = Y(tpdf(v, df)); i ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); }
      ctx.stroke();
      // valores críticos
      const tc = tinv(0.05, df);
      ctx.strokeStyle = muted; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      for (const s of [-1, 1]) if (tc < L) { const x = Math.round(X(s * tc)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t + 28); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      ctx.textAlign = 'left';
      if (tc < L) ctx.fillText('±' + fmt(tc, 2), X(tc) + 5, pad.t + 44);
      // t observado
      const tx = X(Math.max(-L, Math.min(L, r.t)));
      ctx.strokeStyle = hot; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tx, pad.t - 4); ctx.lineTo(tx, h - pad.b); ctx.stroke();
      ctx.fillStyle = hot; ctx.font = '600 12px ' + tok('--f-mono');
      const off = Math.abs(r.t) > L ? (r.t > 0 ? ' →' : '← ') : '';
      ctx.textAlign = tx > w - 70 ? 'right' : tx < 70 ? 'left' : 'center';
      ctx.fillText(r.t < 0 ? off + 't = ' + sgn(r.t, 2) : 't = ' + sgn(r.t, 2) + off, tx, pad.t - 10);
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = mono(); ctx.textAlign = 'center';
      for (let v = -L; v <= L; v += 2) ctx.fillText(sgn(v, 0), Math.min(Math.max(X(v), pad.l + 8), w - pad.r - 8), h - 8);
    }
  }

  // ----- controles -----
  const bindRange = (id, key, d, after) => {
    const el = $(id); el.addEventListener('input', () => { S[key] = +el.value; $(id + '-v').textContent = fmt(S[key], d); after && after(); draw(); });
  };
  bindRange('ttest-delta', 'delta', 1);
  bindRange('ttest-sd', 'sd', 1);
  bindRange('ttest-k', 'k', 1);
  bindRange('ttest-na', 'na', 0, () => { if (S.design === 'par') syncNb(); });
  bindRange('ttest-nb', 'nb', 0);
  bindRange('ttest-rho', 'rho', 2);
  function syncNb() {
    const par = S.design === 'par';
    $('ttest-nb').disabled = par; $('ttest-rho').disabled = !par;
    if (par) { $('ttest-nb').value = S.na; $('ttest-nb-v').textContent = S.na; }
    else { $('ttest-nb').value = S.nb; $('ttest-nb-v').textContent = S.nb; }
  }
  segBind('ttest-design', b => { S.design = b.dataset.d; syncNb(); draw(); });
  $('ttest-again').addEventListener('click', newSample);
  ['ttest-delta-v', 'ttest-sd-v'].forEach(id => $(id).textContent = fmt(S[id === 'ttest-delta-v' ? 'delta' : 'sd'], 1));

  M.draw['ttest'] = draw;
  M.init.push(() => { syncNb(); newSample(); });
})();
