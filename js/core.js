/* StatEdx · núcleo del sitio
 * Navegación entre vistas, carga de cada sesión bajo demanda (lessons/<slug>.html y
 * js/lessons/<slug>.js), bloques de la portada, catálogo filtrable, quizzes, índice de
 * cada sesión, pestañas R/Python y utilidades compartidas (window.M) para los simuladores.
 * Los datos de bloques y sesiones viven en js/catalog.js.
 */
(() => {
  const css = () => getComputedStyle(document.documentElement);
  const tok = (name) => css().getPropertyValue(name).trim();
  const fmt = (x, d = 2) => x.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- data ----------
  const { BLOCKS, SESSIONS, FAMILIES, LEVELS } = window.CATALOG;
  const blockOf = {};
  BLOCKS.forEach(b => b.sessions.forEach((s, i) => blockOf[s] = { block: b, idx: i }));
  const ORDER = BLOCKS.flatMap(b => b.sessions);
  const READY = ORDER.filter(s => SESSIONS[s].ready);
  const slugsByLength = Object.keys(SESSIONS).sort((a, b) => b.length - a.length);

  const GLYPHS = {
    hist: '<svg viewBox="0 0 200 86" aria-hidden="true">' + [10,22,40,62,74,62,40,22,10].map((h,i)=>`<rect x="${14+i*20}" y="${80-h}" width="16" height="${h}" rx="2" fill="currentColor" opacity="${.25+h/110}"/>`).join('') + '<line x1="6" y1="80.5" x2="194" y2="80.5" stroke="currentColor" opacity=".4"/></svg>',
    ci: '<svg viewBox="0 0 200 86" aria-hidden="true"><line x1="100" y1="4" x2="100" y2="82" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/>' + [[60,130],[78,150],[40,104],[70,118],[108,170],[52,140]].map((p,i)=>`<g opacity="${i===4?1:.75}"><line x1="${p[0]}" y1="${10+i*13}" x2="${p[1]}" y2="${10+i*13}" stroke="currentColor" stroke-width="3" stroke-linecap="round" ${i===4?'stroke-dasharray="2 5"':''}/><circle cx="${(p[0]+p[1])/2}" cy="${10+i*13}" r="3.5" fill="currentColor"/></g>`).join('') + '</svg>',
    reg: '<svg viewBox="0 0 200 86" aria-hidden="true">' + [[20,70],[34,62],[48,66],[60,52],[75,55],[88,44],[102,46],[118,34],[130,38],[146,26],[160,28],[176,16]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="currentColor" opacity=".55"/>`).join('') + '<line x1="12" y1="74" x2="188" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    tree: '<svg viewBox="0 0 200 86" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M100 14 L56 44 M100 14 L144 44 M56 44 L32 74 M56 44 L80 74 M144 44 L124 74 M144 44 L168 74" opacity=".6"/><g fill="currentColor" stroke="none"><circle cx="100" cy="14" r="7"/><circle cx="56" cy="44" r="6"/><circle cx="144" cy="44" r="6"/></g><g fill="currentColor" stroke="none" opacity=".55"><rect x="25" y="68" width="14" height="12" rx="3"/><rect x="73" y="68" width="14" height="12" rx="3"/><rect x="117" y="68" width="14" height="12" rx="3"/><rect x="161" y="68" width="14" height="12" rx="3"/></g></svg>',
    scatter: '<svg viewBox="0 0 200 86" aria-hidden="true">' + [[24,58],[36,40],[44,66],[58,30],[66,52],[80,44],[92,22],[98,62],[112,36],[124,50],[136,28],[150,58],[160,40],[172,24]].map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i%3?3.5:5}" fill="currentColor" opacity="${i%3?.45:.8}"/>`).join('') + '<circle cx="182" cy="78" r="5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="82.5" x2="194" y2="82.5" stroke="currentColor" opacity=".4"/></svg>',
    bell: (() => { let d = ''; for (let i = 0; i <= 60; i++) { const x = -3 + i / 10; d += (i ? 'L' : 'M') + (10 + i * 3).toFixed(1) + ' ' + (80 - 68 * Math.exp(-x * x / 2)).toFixed(1); }
      return `<svg viewBox="0 0 200 86" aria-hidden="true"><path d="${d} L190 80 L10 80 Z" fill="currentColor" opacity=".18"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="100" y1="10" x2="100" y2="80" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/><line x1="6" y1="80.5" x2="194" y2="80.5" stroke="currentColor" opacity=".4"/></svg>`; })(),
    grid: '<svg viewBox="0 0 200 86" aria-hidden="true">' + Array.from({ length: 40 }, (_, i) => { const c = i % 10, r = Math.floor(i / 10), on = [3,7,12,18,21,26,33,38].includes(i); return `<circle cx="${28 + c * 16}" cy="${16 + r * 18}" r="${on ? 5.5 : 4}" fill="currentColor" opacity="${on ? 1 : .22}"/>`; }).join('') + '</svg>',
    map: '<svg viewBox="0 0 200 86" aria-hidden="true">' + Array.from({ length: 30 }, (_, i) => { const c = i % 10, r = Math.floor(i / 10), v = Math.exp(-((c - 6.5) ** 2 + (r - 1) ** 2 * 3) / 14); return `<rect x="${20 + c * 16.5}" y="${10 + r * 23}" width="15" height="21" rx="2" fill="currentColor" opacity="${(.12 + .85 * v).toFixed(2)}"/>`; }).join('') + '</svg>',
    surv: '<svg viewBox="0 0 200 86" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M10 10 H34 V20 H58 V27 H80 V40 H104 V46 H128 V58 H152 V63 H190"/><path d="M10 10 H44 V16 H72 V22 H100 V28 H130 V33 H160 V38 H190" opacity=".45"/><g stroke-width="1.6" opacity=".8"><path d="M66 23 v8 M116 42 v8 M170 59 v8"/></g><line x1="6" y1="80.5" x2="194" y2="80.5" stroke-width="1" opacity=".4"/></svg>',
    wave: (() => { let d = ''; for (let i = 0; i <= 90; i++) { const x = 8 + i * 2.05, y = 62 - i * 0.38 - 14 * Math.sin(i / 4.3) - 3 * Math.sin(i * 1.7); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      return `<svg viewBox="0 0 200 86" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 62 L192 28" stroke="currentColor" stroke-dasharray="4 4" opacity=".5"/><line x1="6" y1="82.5" x2="194" y2="82.5" stroke="currentColor" opacity=".4"/></svg>`; })(),
    net: (() => { const L = [[40, [18, 43, 68]], [100, [10, 32, 54, 76]], [160, [30, 56]]]; let s = '';
      for (let k = 0; k < 2; k++) for (const a of L[k][1]) for (const b of L[k + 1][1]) s += `<line x1="${L[k][0]}" y1="${a}" x2="${L[k + 1][0]}" y2="${b}" stroke="currentColor" opacity=".35"/>`;
      for (const [x, ys] of L) for (const y of ys) s += `<circle cx="${x}" cy="${y}" r="6.5" fill="currentColor"/>`;
      return `<svg viewBox="0 0 200 86" aria-hidden="true">${s}</svg>`; })(),
  };

  // ---------- routing ----------
  const main = document.querySelector('main');
  const navLinks = [...document.querySelectorAll('nav.links a')];
  const loaded = {};   // slug -> Promise<boolean> (true si la sesión existe)
  let current = null;

  // Una dirección puede ser una sesión (#reg) o una sección de una sesión (#reg-formula).
  function sessionForHash(h) {
    if (SESSIONS[h]) return h;
    return slugsByLength.find(s => h.startsWith(s + '-')) || null;
  }

  async function route() {
    const h = decodeURIComponent((location.hash || '#inicio').slice(1));
    let target = 'inicio', sec = null;
    if (h === 'inicio' || h === 'clases') target = h;
    else if (h.startsWith('bloque-')) { target = 'clases'; filter.b = h.slice(7); filter.q = ''; filter.l = ''; syncFilters(); renderCatalog(); }
    else {
      const slug = sessionForHash(h);
      if (slug) { target = slug; if (h !== slug) sec = h; }
    }
    if (SESSIONS[target]) {
      const ok = await loadLesson(target);
      if (!ok) target = 'clases';
      const now = decodeURIComponent((location.hash || '#inicio').slice(1));
      if (now !== h) return;      // el usuario navegó a otro sitio mientras cargaba
    }
    const changed = target !== current;
    document.querySelectorAll('main > [data-view]').forEach(v => v.hidden = v.dataset.view !== target);
    const navTarget = target === 'inicio' || target === 'tlc' ? target : 'clases';
    navLinks.forEach(a => a.dataset.route === navTarget ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    current = target;
    if (SESSIONS[target]) document.title = SESSIONS[target].t + ' · StatEdx';
    else document.title = 'StatEdx';
    if (sec) document.getElementById(sec)?.scrollIntoView();
    else if (h.startsWith('bloque-')) document.getElementById('cards')?.scrollIntoView();
    else if (changed) window.scrollTo(0, 0);
    requestAnimationFrame(drawAll);
  }
  addEventListener('hashchange', route);

  function loadLesson(slug) {
    if (loaded[slug]) return loaded[slug];
    return loaded[slug] = (async () => {
      let html;
      try {
        const res = await fetch('lessons/' + slug + '.html');
        if (!res.ok) throw new Error(res.status);
        html = await res.text();
      } catch (err) { delete loaded[slug]; console.warn('No se pudo cargar la sesión', slug, err); return false; }
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const view = tpl.content.querySelector('[data-view]');
      if (!view) return false;
      view.hidden = true;
      decorate(view, slug);
      main.append(view);
      const k = M.init.length;
      await new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'js/lessons/' + slug + '.js';
        s.onload = resolve;
        s.onerror = () => { console.warn('Sesión sin script:', slug); resolve(); };
        document.body.append(s);
      });
      M.init.slice(k).forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
      setLang(lang);
      typeset(view);
      return true;
    })();
  }

  function typeset(el) {
    const MJ = window.MathJax;
    if (MJ?.startup?.promise && MJ.typesetPromise) MJ.startup.promise.then(() => MJ.typesetPromise([el])).catch(err => console.warn(err));
    // si MathJax aún no terminó de cargar, su primera pasada sobre la página incluye esta sesión
  }

  // Migas (Clases / Bloque / Sesión k de n) y enlaces Anterior / Siguiente, a partir del catálogo.
  function decorate(view, slug) {
    const { block, idx } = blockOf[slug];
    const crumbs = view.querySelector('.crumbs');
    if (crumbs) crumbs.innerHTML = `<a href="#clases">Clases</a><span>/</span><a href="#bloque-${block.id}">${block.name}</a><span>/</span><span>Sesión ${idx + 1} de ${block.sessions.length}</span>`;
    const next = view.querySelector('.next');
    if (next) {
      const seq = READY.includes(slug) ? READY : ORDER;
      const i = seq.indexOf(slug), prev = seq[i - 1], nxt = seq[i + 1];
      next.innerHTML = (prev ? `<a href="#${prev}"><span>Anterior</span><b>${SESSIONS[prev].t}</b></a>` : '<span></span>') +
        (nxt ? `<a href="#${nxt}" style="text-align:right"><span>Siguiente${blockOf[nxt].block !== block ? ' · ' + blockOf[nxt].block.name : ''}</span><b>${SESSIONS[nxt].t}</b></a>` : '');
    }
  }

  // ---------- home: blocks ----------
  const routesEl = document.getElementById('routes');
  routesEl.innerHTML = BLOCKS.map((b, i) => {
    const n = b.sessions.length;
    return `<a class="route" href="#bloque-${b.id}" style="--c:var(${FAMILIES[b.fam]})">${GLYPHS[b.glyph] || GLYPHS.hist}<span class="count">Bloque ${String(i + 1).padStart(2, '0')} · ${n} sesiones</span><h3>${b.name}</h3><p>${b.desc}</p></a>`;
  }).join('');
  const setFact = (k, v) => { const el = document.querySelector(`[data-fact="${k}"]`); if (el) el.textContent = v; };
  setFact('sessions', ORDER.length); setFact('blocks', BLOCKS.length);

  // ---------- catalog ----------
  const filter = { b: '', l: '', q: '' };
  const blockSel = document.getElementById('block');
  blockSel.innerHTML = '<option value="">Todos los bloques</option>' + BLOCKS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  const qEl = document.getElementById('q'), levelEl = document.getElementById('level');
  function syncFilters() { blockSel.value = filter.b; qEl.value = filter.q; levelEl.value = filter.l; }
  blockSel.addEventListener('change', e => { filter.b = e.target.value; renderCatalog(); });
  qEl.addEventListener('input', e => { filter.q = e.target.value; renderCatalog(); });
  levelEl.addEventListener('change', e => { filter.l = e.target.value; renderCatalog(); });
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function renderCatalog() {
    const q = norm(filter.q.trim());
    let total = 0;
    const html = BLOCKS.filter(b => !filter.b || b.id === filter.b).map(b => {
      const bi = BLOCKS.indexOf(b) + 1;
      const list = b.sessions.filter(s => { const c = SESSIONS[s];
        return (!filter.l || c.l == filter.l) && (!q || norm(c.t + ' ' + c.d + ' ' + b.name).includes(q)); });
      total += list.length;
      if (!list.length) return '';
      const color = `var(${FAMILIES[b.fam]})`;
      const cards = list.map(s => {
        const c = SESSIONS[s], k = b.sessions.indexOf(s) + 1;
        const dots = [1,2,3].map(i => `<i class="${i <= c.l ? 'on' : ''}"></i>`).join('');
        const inner = `<div class="card-top"><span class="tag">Sesión ${k}</span>${c.ready ? '' : '<span class="badge soft">En preparación</span>'}</div>
          <h3>${c.t}</h3><p>${c.d}</p>
          <div class="card-meta"><span>${c.m} min</span><span title="${LEVELS[c.l]}"><span class="level-dots">${dots}</span> ${LEVELS[c.l]}</span></div>`;
        return c.ready ? `<a class="card" href="#${s}" style="--c:${color}">${inner}</a>` : `<div class="card soon" style="--c:${color}">${inner}</div>`;
      }).join('');
      return `<section class="block-group" id="grupo-${b.id}" style="--c:${color}">
        <header class="block-group-head"><div class="block-glyph">${GLYPHS[b.glyph] || ''}</div><div><div class="eyebrow">Bloque ${String(bi).padStart(2, '0')} · ${b.sessions.length} sesiones</div><h2>${b.name}</h2><p>${b.desc}</p></div></header>
        <div class="grid-cards">${cards}</div></section>`;
    }).join('');
    document.getElementById('cards').innerHTML = html;
    document.getElementById('empty').hidden = total > 0;
  }
  renderCatalog();

  // ---------- canvas helpers ----------
  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = +canvas.getAttribute('height');
    if (!w) return null;
    if (canvas._w !== w || canvas._dpr !== dpr) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
      canvas._w = w; canvas._dpr = dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const npdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

  // ---------- shared math ----------
  function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  function tq(z, df) { // Cornish-Fisher expansion of the t quantile
    const z3 = z ** 3, z5 = z ** 5, z7 = z ** 7;
    return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3);
  }
  const pct = (x, d = 1) => fmt(x * 100, d) + ' %';
  function axisTicks(ctx, X, from, to, step, y, muted) {
    ctx.fillStyle = muted; ctx.font = '11px ' + tok('--f-mono'); ctx.textAlign = 'center';
    for (let v = from; v <= to + 1e-9; v += step) ctx.fillText(+v.toFixed(2), X(v), y);
  }
  function segBind(id, fn) {
    document.getElementById(id).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      document.querySelectorAll('#' + id + ' button').forEach(x => x.setAttribute('aria-pressed', x === b));
      fn(b);
    });
  }

  // ---------- quizzes (delegated, so lazily loaded sessions work too) ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('.quiz .opt'); if (!b) return;
    const q = b.closest('.quiz');
    q.querySelectorAll('.opt').forEach(o => o.classList.remove('right', 'wrong'));
    const ok = b.dataset.ok === '1';
    b.classList.add(ok ? 'right' : 'wrong');
    const fb = q.querySelector('.feedback'); fb.textContent = '';
    const lead = document.createElement('b');
    lead.style.color = ok ? 'var(--ok)' : 'var(--bad)';
    lead.textContent = ok ? 'Correcto. ' : 'No exactamente. ';
    fb.append(lead, ok ? q.dataset.right : q.dataset.wrong);
  });

  // ---------- lesson progress + toc ----------
  function onScroll() {
    if (!SESSIONS[current]) return;
    const v = document.getElementById('view-' + current); if (!v) return;
    const r = v.querySelector('.prose').getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight * 0.6)));
    const bar = v.querySelector('.progress i'); if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    const links = [...v.querySelectorAll('.toc a')];
    let active = links[0]?.dataset.sec;
    for (const a of links) { if (document.getElementById(a.dataset.sec)?.getBoundingClientRect().top < 140) active = a.dataset.sec; }
    links.forEach(a => a.classList.toggle('active', a.dataset.sec === active));
  }
  addEventListener('scroll', onScroll, { passive: true });

  // ---------- redraw on resize / theme ----------
  function drawAll() { try { M.draw[current]?.(); } catch (err) { console.error(err); } onScroll(); }
  addEventListener('resize', drawAll);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawAll);
  new MutationObserver(drawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.fonts?.ready.then(drawAll);

  // ---------- code tabs (R / Python) ----------
  let lang = 'py'; try { lang = localStorage.getItem('muestra-lang') || 'py'; } catch (e) {}
  function setLang(l) {
    lang = l;
    document.querySelectorAll('.codetabs pre[data-lang]').forEach(p => p.hidden = p.dataset.lang !== l);
    document.querySelectorAll('.codetabs .tabbar button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
    try { localStorage.setItem('muestra-lang', l); } catch (e) {}
  }
  document.addEventListener('click', e => { const b = e.target.closest('.codetabs .tabbar button'); if (b) setLang(b.dataset.lang); });

  // ---------- helpers for lesson scripts ----------
  window.M = {
    fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks,
    draw: {},            // M.draw[slug] = función que redibuja los canvas de esa sesión
    init: [],            // funciones que se ejecutan una vez, cuando la sesión se carga
    get current() { return current; },
  };

  addEventListener('DOMContentLoaded', () => {
    setLang(lang);
    M.init.forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
    M.init.length = 0;
    route();
  });
})();
