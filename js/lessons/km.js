/* StatEdx · sesión km: Estimador de Kaplan-Meier */
(() => {
  const { fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks } = M;
  const $ = id => document.getElementById(id);
  const font = () => '11px ' + tok('--f-mono');
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const SHAPE = 1.3, SCALE = 14, TMAX = 30;
  const Strue = t => Math.exp(-Math.pow(t / SCALE, SHAPE));

  const KM = { n: 12, cens: 3, ci: 'loglog', seed: 4, subj: [], steps: [], k: 0 };
  function kmData() {
    const r = rng(KM.seed); KM.raw = [];
    for (let i = 0; i < 200; i++) KM.raw.push({ T: SCALE * Math.pow(-Math.log(1 - r()), 1 / SHAPE), u: r() });
  }
  function kmFit() {
    const rate = KM.cens / 100;
    KM.subj = KM.raw.slice(0, KM.n).map(s => {
      const C = Math.min(TMAX, rate > 0 ? -Math.log(1 - s.u) / rate : Infinity);
      // tiempos redondeados a décimas de mes: produce algunos empates realistas
      const y = Math.max(0.1, Math.round(Math.min(s.T, C) * 10) / 10);
      return { y, d: s.T <= C ? 1 : 0 };
    }).sort((a, b) => a.y - b.y || b.d - a.d);
    // tabla de Kaplan-Meier
    KM.steps = []; let n = KM.subj.length, S = 1, g = 0, i = 0;
    while (i < KM.subj.length) {
      const t = KM.subj[i].y; let d = 0, c = 0;
      while (i < KM.subj.length && KM.subj[i].y === t) { KM.subj[i].d ? d++ : c++; i++; }
      if (d) {
        S *= 1 - d / n; if (n > d) g += d / (n * (n - d)); else g = NaN;
        KM.steps.push({ t, n, d, S, g });
      }
      n -= d + c;
    }
    KM.k = KM.steps.length;
  }
  function band(st) {
    const S = st.S;
    if (!(S > 0) || !isFinite(st.g)) return [NaN, NaN];
    if (KM.ci === 'plain') { const se = S * Math.sqrt(st.g); return [Math.max(0, S - 1.96 * se), Math.min(1, S + 1.96 * se)]; }
    if (S >= 1) return [1, 1];
    const e = Math.sqrt(st.g) / Math.abs(Math.log(S));
    return [Math.pow(S, Math.exp(1.96 * e)), Math.pow(S, Math.exp(-1.96 * e))];
  }
  function loglogBand(st) {
    const S = st.S; if (!(S > 0) || !isFinite(st.g) || S >= 1) return [S, S];
    const e = Math.sqrt(st.g) / Math.abs(Math.log(S));
    return [Math.pow(S, Math.exp(1.96 * e)), Math.pow(S, Math.exp(-1.96 * e))];
  }
  function medianInfo(steps) {
    let med = NaN, lo = NaN, hi = NaN;
    for (const st of steps) {
      const [l, u] = st.S > 0 ? loglogBand(st) : [0, 0];
      if (isNaN(med) && st.S <= 0.5) med = st.t;
      if (isNaN(lo) && l <= 0.5) lo = st.t;
      if (isNaN(hi) && u <= 0.5) hi = st.t;
    }
    return { med, lo, hi };
  }
  const tf = v => isFinite(v) ? fmt(v, 1) : 'NA';
  function kmSync() {
    $('km-n-v').textContent = KM.n; $('km-cens-v').textContent = KM.cens;
    const shown = KM.steps.slice(0, KM.k), st = shown[shown.length - 1];
    if (st) {
      $('km-lbl').textContent = `Ŝ en t = ${fmt(st.t, 1)} m · n = ${st.n}, d = ${st.d}`;
      $('km-s').textContent = fmt(st.S, 3);
      const [l, u] = band(st);
      $('km-sci').textContent = KM.ci !== 'none' && isFinite(l) ? fmt(l, 2) + '–' + fmt(u, 2) : '–';
    } else {
      $('km-lbl').textContent = `Ŝ en t = 0 · n = ${KM.subj.length}`; $('km-s').textContent = '1'; $('km-sci').textContent = '–';
    }
    const mi = medianInfo(shown);
    $('km-med').textContent = isFinite(mi.med) ? fmt(mi.med, 1) + ' m' : 'no alcanzada';
    $('km-mci').textContent = isFinite(mi.med) || isFinite(mi.lo) ? tf(mi.lo) + '–' + tf(mi.hi) : '–';
    const nc = KM.subj.filter(s => !s.d).length;
    $('km-head').textContent = `paso ${KM.k} de ${KM.steps.length} · ${nc} censurados de ${KM.subj.length}`;
    drawKM();
  }
  $('km-n').addEventListener('input', e => { KM.n = +e.target.value; kmFit(); kmSync(); });
  $('km-cens').addEventListener('input', e => { KM.cens = +e.target.value; kmFit(); kmSync(); });
  segBind('km-ci', b => { KM.ci = b.dataset.c; kmSync(); });
  $('km-reset').addEventListener('click', () => { KM.k = 0; kmSync(); });
  $('km-step').addEventListener('click', () => { KM.k = KM.k >= KM.steps.length ? 1 : KM.k + 1; kmSync(); });
  $('km-all').addEventListener('click', () => { KM.k = KM.steps.length; kmSync(); });
  $('km-new').addEventListener('click', () => { KM.seed = (KM.seed * 7919 + 29) % 100003; kmData(); kmFit(); kmSync(); });

  function drawKM() {
    const accent = tok('--accent'), hot = tok('--hot'), ink = tok('--ink'), muted = tok('--muted'), line = tok('--line'), bg = tok('--bg');
    const shown = KM.steps.slice(0, KM.k), cur = shown[shown.length - 1], tcur = cur ? cur.t : 0;
    // ---------- seguimiento ----------
    let f = fit($('km-c-sw'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 14, t: 10, b: 24 };
      const X = v => pad.l + v / TMAX * (w - pad.l - pad.r);
      ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.lineWidth = 1;
      for (let v = 0; v <= TMAX; v += 6) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const rows = KM.subj.length, rowH = (h - pad.t - pad.b) / rows;
      KM.subj.forEach((s, i) => {
        const y = pad.t + (i + .5) * rowH, atRisk = s.y >= tcur && KM.k > 0, past = KM.k > 0 && s.y < tcur;
        ctx.strokeStyle = atRisk ? accent : muted; ctx.globalAlpha = past ? .3 : (atRisk ? .95 : .6);
        ctx.lineWidth = Math.max(1, Math.min(3, rowH * .45));
        ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(s.y), y); ctx.stroke();
        if (rowH >= 4) {
          const r = Math.min(4, rowH * .4); ctx.beginPath(); ctx.arc(X(s.y), y, r, 0, Math.PI * 2);
          if (s.d) { ctx.fillStyle = hot; ctx.fill(); } else { ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke(); }
        } else if (s.d) { ctx.fillStyle = hot; ctx.fillRect(X(s.y) - 1, y - rowH / 2, 2, Math.max(1, rowH)); }
        ctx.globalAlpha = 1;
      });
      if (KM.k > 0) {
        const x = Math.round(X(tcur)) + .5; ctx.strokeStyle = hot; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      ctx.fillText('n=' + rows, pad.l - 5, pad.t + 10);
      axisTicks(ctx, X, 0, TMAX, 6, h - 7, muted);
    }
    // ---------- curva ----------
    f = fit($('km-c-km'));
    if (f) {
      const { ctx, w, h } = f; ctx.clearRect(0, 0, w, h);
      const pad = { l: 40, r: 14, t: 12, b: 56 };
      const X = v => pad.l + v / TMAX * (w - pad.l - pad.r), Y = v => h - pad.b - v * (h - pad.t - pad.b);
      ctx.strokeStyle = line; ctx.globalAlpha = .55; ctx.lineWidth = 1;
      for (let v = 0; v <= TMAX; v += 6) { const x = Math.round(X(v)) + .5; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
      for (const v of [0, .25, .5, .75, 1]) { const y = Math.round(Y(v)) + .5; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted; ctx.font = font(); ctx.textAlign = 'right';
      for (const v of [0, .5, 1]) ctx.fillText(fmt(v, v % 1 ? 1 : 0), pad.l - 6, Y(v) + 4);
      // curva real
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.globalAlpha = .7; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const t = TMAX * i / 200; i ? ctx.lineTo(X(t), Y(Strue(t))) : ctx.moveTo(X(t), Y(Strue(t))); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      const tEnd = KM.k >= KM.steps.length ? (KM.subj.length ? KM.subj[KM.subj.length - 1].y : 0) : tcur;
      // banda
      if (KM.ci !== 'none' && shown.length) {
        const pts = [{ t: 0, l: 1, u: 1 }];
        for (const st of shown) { const [l, u] = band(st); if (isFinite(l)) pts.push({ t: st.t, l, u }); else break; }
        const endT = pts.length === shown.length + 1 ? tEnd : pts[pts.length - 1].t;
        ctx.fillStyle = accent; ctx.globalAlpha = .18; ctx.beginPath();
        pts.forEach((p, i) => { const nx = i + 1 < pts.length ? pts[i + 1].t : endT; if (!i) ctx.moveTo(X(p.t), Y(p.u)); else ctx.lineTo(X(p.t), Y(p.u)); ctx.lineTo(X(nx), Y(p.u)); });
        for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i], nx = i + 1 < pts.length ? pts[i + 1].t : endT; ctx.lineTo(X(nx), Y(p.l)); ctx.lineTo(X(p.t), Y(p.l)); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      // curva KM escalonada
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X(0), Y(1));
      let S = 1;
      for (const st of shown) { ctx.lineTo(X(st.t), Y(S)); S = st.S; ctx.lineTo(X(st.t), Y(S)); }
      ctx.lineTo(X(tEnd), Y(S)); ctx.stroke();
      // marcas de censura hasta tEnd
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3;
      for (const s of KM.subj) if (!s.d && s.y <= tEnd + 1e-9) {
        let Sv = 1; for (const st of shown) if (st.t <= s.y) Sv = st.S;
        const x = Math.round(X(s.y)) + .5; ctx.beginPath(); ctx.moveTo(x, Y(Sv) - 4); ctx.lineTo(x, Y(Sv) + 4); ctx.stroke();
      }
      // paso actual
      if (cur) { ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(X(cur.t), Y(cur.S), 4.5, 0, Math.PI * 2); ctx.fill(); }
      // mediana
      const mi = medianInfo(shown);
      if (isFinite(mi.med)) {
        ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath();
        ctx.moveTo(pad.l, Math.round(Y(.5)) + .5); ctx.lineTo(X(mi.med), Math.round(Y(.5)) + .5); ctx.lineTo(X(mi.med), h - pad.b); ctx.stroke(); ctx.setLineDash([]);
      }
      // eje y tabla de número en riesgo
      ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + .5); ctx.lineTo(w - pad.r, h - pad.b + .5); ctx.stroke();
      axisTicks(ctx, X, 0, TMAX, 6, h - pad.b + 15, muted);
      ctx.fillStyle = ink; ctx.textAlign = 'center';
      for (let v = 0; v <= TMAX; v += 6) ctx.fillText(KM.subj.filter(s => s.y >= v).length, X(v), h - 10);
      ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText('n', pad.l - 12, h - 10);
    }
  }

  M.draw.km = drawKM;
  M.init.push(() => { kmData(); kmFit(); kmSync(); });
})();
