/* Muestra · núcleo del sitio
 * Datos del catálogo, navegación entre vistas, catálogo filtrable, quizzes,
 * índice de cada clase, pestañas R/Python y utilidades compartidas (window.M)
 * que usan los simuladores de js/lessons/.
 */
(() => {
  const css = () => getComputedStyle(document.documentElement);
  const tok = (name) => css().getPropertyValue(name).trim();
  const fmt = (x, d = 2) => x.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- data ----------
  const ROUTES = [
    { id: 'fund', name: 'Fundamentos', color: '--r-fund', desc: 'Descriptiva, probabilidad y distribuciones.', glyph: 'hist' },
    { id: 'inf', name: 'Inferencia', color: '--r-inf', desc: 'Muestreo, intervalos y pruebas de hipótesis.', glyph: 'ci' },
    { id: 'mod', name: 'Modelos', color: '--r-mod', desc: 'Regresión, modelos lineales y series de tiempo.', glyph: 'reg' },
    { id: 'ds', name: 'Ciencia de datos', color: '--r-ds', desc: 'pandas, visualización y aprendizaje automático.', glyph: 'tree' },
  ];
  const CLASSES = [
    { t: 'Medidas de tendencia central y dispersión', slug: 'desc', r: 'fund', l: 1, m: 40, d: 'Media, mediana, varianza y por qué la mediana resiste a los valores atípicos.' },
    { t: 'Probabilidad y variables aleatorias', slug: 'prob', r: 'fund', l: 1, m: 45, d: 'Espacios muestrales, eventos, esperanza y varianza de una variable aleatoria.' },
    { t: 'Distribución normal', r: 'fund', l: 1, m: 35, slug: 'normal', d: 'La campana, la regla 68-95-99,7 y cómo estandarizar con puntuaciones z.' },
    { t: 'El Teorema del Límite Central', r: 'inf', l: 2, m: 50, d: 'Por qué las medias muestrales forman una campana y cuánto se estrecha.', slug: 'tlc' },
    { t: 'Intervalos de confianza', r: 'inf', l: 2, m: 45, slug: 'ic', d: 'Qué significa realmente “95 % de confianza” y cómo calcular el margen de error.' },
    { t: 'Pruebas de hipótesis y valor p', r: 'inf', l: 2, m: 55, slug: 'ph', d: 'Hipótesis nula, errores tipo I y II, potencia y los malentendidos más comunes del valor p.' },
    { t: 'Inferencia bayesiana', slug: 'bayes', r: 'inf', l: 3, m: 60, d: 'Priors, verosimilitud y posteriores con un ejemplo de pruebas A/B.' },
    { t: 'Regresión lineal simple', slug: 'reg', r: 'mod', l: 2, m: 50, d: 'Mínimos cuadrados, interpretación de coeficientes y análisis de residuos.' },
    { t: 'Regresión logística', slug: 'logit', r: 'mod', l: 3, m: 55, d: 'Modelar probabilidades, razones de momios y curvas ROC.' },
    { t: 'Series de tiempo', slug: 'ts', r: 'mod', l: 3, m: 60, d: 'Tendencia, estacionalidad, autocorrelación y un primer modelo ARIMA.' },
    { t: 'Análisis exploratorio de datos', slug: 'eda', r: 'ds', l: 1, m: 45, d: 'Cargar, limpiar y resumir un conjunto de datos real con pandas y dplyr.' },
    { t: 'Visualización de datos', slug: 'viz', r: 'ds', l: 1, m: 40, d: 'Elegir el gráfico correcto y contar una historia con ggplot2 y seaborn.' },
    { t: 'Validación cruzada y sobreajuste', slug: 'cv', r: 'ds', l: 2, m: 45, d: 'Separar entrenamiento y prueba, k-fold y el equilibrio sesgo-varianza.' },
    { t: 'Árboles de decisión y random forest', slug: 'trees', r: 'ds', l: 3, m: 55, d: 'Cómo decide un árbol, por qué un bosque generaliza mejor y qué variables importan.' },
  ];
  const LEVELS = ['', 'Básico', 'Intermedio', 'Avanzado'];

  const GLYPHS = {
    hist: '<svg viewBox="0 0 200 86" aria-hidden="true">' + [10,22,40,62,74,62,40,22,10].map((h,i)=>`<rect x="${14+i*20}" y="${80-h}" width="16" height="${h}" rx="2" fill="currentColor" opacity="${.25+h/110}"/>`).join('') + '<line x1="6" y1="80.5" x2="194" y2="80.5" stroke="currentColor" opacity=".4"/></svg>',
    ci: '<svg viewBox="0 0 200 86" aria-hidden="true"><line x1="100" y1="4" x2="100" y2="82" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/>' + [[60,130],[78,150],[40,104],[70,118],[108,170],[52,140]].map((p,i)=>`<g opacity="${i===4?1:.75}"><line x1="${p[0]}" y1="${10+i*13}" x2="${p[1]}" y2="${10+i*13}" stroke="currentColor" stroke-width="3" stroke-linecap="round" ${i===4?'stroke-dasharray="2 5"':''}/><circle cx="${(p[0]+p[1])/2}" cy="${10+i*13}" r="3.5" fill="currentColor"/></g>`).join('') + '</svg>',
    reg: '<svg viewBox="0 0 200 86" aria-hidden="true">' + [[20,70],[34,62],[48,66],[60,52],[75,55],[88,44],[102,46],[118,34],[130,38],[146,26],[160,28],[176,16]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="currentColor" opacity=".55"/>`).join('') + '<line x1="12" y1="74" x2="188" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    tree: '<svg viewBox="0 0 200 86" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M100 14 L56 44 M100 14 L144 44 M56 44 L32 74 M56 44 L80 74 M144 44 L124 74 M144 44 L168 74" opacity=".6"/><g fill="currentColor" stroke="none"><circle cx="100" cy="14" r="7"/><circle cx="56" cy="44" r="6"/><circle cx="144" cy="44" r="6"/></g><g fill="currentColor" stroke="none" opacity=".55"><rect x="25" y="68" width="14" height="12" rx="3"/><rect x="73" y="68" width="14" height="12" rx="3"/><rect x="117" y="68" width="14" height="12" rx="3"/><rect x="161" y="68" width="14" height="12" rx="3"/></g></svg>',
  };

  // ---------- routing ----------
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('nav.links a')];
  const lessonViews = [...document.querySelectorAll('.lesson-view')];
  const secToView = {};
  lessonViews.forEach(v => v.querySelectorAll('.prose h2[id]').forEach(h => secToView[h.id] = v.dataset.view));
  let current = null;
  function route() {
    const h = (location.hash || '#inicio').slice(1);
    const isSec = h in secToView;
    let target = isSec ? secToView[h] : h;
    if (!views.some(v => v.dataset.view === target)) target = 'inicio';
    const changed = target !== current;
    views.forEach(v => v.hidden = v.dataset.view !== target);
    const navTarget = target === 'inicio' || target === 'tlc' ? target : 'clases';
    navLinks.forEach(a => a.dataset.route === navTarget ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    current = target;
    if (changed && !isSec) window.scrollTo(0, 0);
    if (isSec) document.getElementById(h)?.scrollIntoView();
    requestAnimationFrame(drawAll);
  }
  addEventListener('hashchange', route);

  // ---------- routes + catalog ----------
  const routesEl = document.getElementById('routes');
  routesEl.innerHTML = ROUTES.map(r => {
    const n = CLASSES.filter(c => c.r === r.id).length;
    return `<button class="route" data-r="${r.id}" style="--c:var(${r.color})">${GLYPHS[r.glyph]}<span class="count">${n} clases</span><h3>${r.name}</h3><p>${r.desc}</p></button>`;
  }).join('');
  routesEl.addEventListener('click', e => {
    const b = e.target.closest('.route'); if (!b) return;
    filter.r = b.dataset.r; renderCatalog(); location.hash = 'clases';
  });

  const filter = { r: '', l: '', q: '' };
  const chipsEl = document.getElementById('chips');
  function renderChips() {
    chipsEl.innerHTML = [{ id: '', name: 'Todas' }, ...ROUTES].map(r => `<button class="chip" data-r="${r.id}" aria-pressed="${filter.r === r.id}">${r.name}</button>`).join('');
  }
  chipsEl.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; filter.r = b.dataset.r; renderCatalog(); });
  document.getElementById('q').addEventListener('input', e => { filter.q = e.target.value; renderCatalog(); });
  document.getElementById('level').addEventListener('change', e => { filter.l = e.target.value; renderCatalog(); });
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function renderCatalog() {
    renderChips();
    const q = norm(filter.q.trim());
    const list = CLASSES.filter(c => (!filter.r || c.r === filter.r) && (!filter.l || c.l == filter.l) && (!q || norm(c.t + ' ' + c.d).includes(q)));
    const cards = document.getElementById('cards');
    cards.innerHTML = list.map((c) => {
      const r = ROUTES.find(x => x.id === c.r);
      const idx = CLASSES.indexOf(c) + 1;
      const dots = [1,2,3].map(i => `<i class="${i <= c.l ? 'on' : ''}"></i>`).join('');
      const inner = `<div class="card-top"><span class="tag">${r.name}</span>${c.slug ? '<span class="badge">Disponible</span>' : '<span class="badge soft">En preparación</span>'}</div>
        <h3>${c.t}</h3><p>${c.d}</p>
        <div class="card-meta"><span>Clase ${String(idx).padStart(2,'0')}</span><span>${c.m} min</span><span title="${LEVELS[c.l]}"><span class="level-dots">${dots}</span> ${LEVELS[c.l]}</span></div>`;
      return c.slug ? `<a class="card" href="#${c.slug}" style="--c:var(${r.color})">${inner}</a>` : `<div class="card" style="--c:var(${r.color})">${inner}</div>`;
    }).join('');
    document.getElementById('empty').hidden = list.length > 0;
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
  const ZQ = { '0.90': 1.6449, '0.95': 1.96, '0.99': 2.5758 };
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

  // ---------- quizzes ----------
  document.querySelectorAll('.quiz').forEach(q => q.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b) return;
    q.querySelectorAll('.opt').forEach(o => o.classList.remove('right', 'wrong'));
    const ok = b.dataset.ok === '1';
    b.classList.add(ok ? 'right' : 'wrong');
    const fb = q.querySelector('.feedback'); fb.textContent = '';
    const lead = document.createElement('b');
    lead.style.color = ok ? 'var(--ok)' : 'var(--bad)';
    lead.textContent = ok ? 'Correcto. ' : 'No exactamente. ';
    fb.append(lead, ok ? q.dataset.right : q.dataset.wrong);
  }));

  // ---------- lesson progress + toc ----------
  function onScroll() {
    const v = lessonViews.find(x => x.dataset.view === current); if (!v) return;
    const r = v.querySelector('.prose').getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight * 0.6)));
    v.querySelector('.progress i').style.width = (p * 100).toFixed(1) + '%';
    const links = [...v.querySelectorAll('.toc a')];
    let active = links[0]?.dataset.sec;
    for (const a of links) { if (document.getElementById(a.dataset.sec).getBoundingClientRect().top < 140) active = a.dataset.sec; }
    links.forEach(a => a.classList.toggle('active', a.dataset.sec === active));
  }
  addEventListener('scroll', onScroll, { passive: true });

  // ---------- redraw on resize / theme ----------
  function drawAll() { M.draw[current]?.(); onScroll(); }
  addEventListener('resize', drawAll);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawAll);
  new MutationObserver(drawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.fonts?.ready.then(drawAll);

  // ---------- code tabs (R / Python) ----------
  function setLang(l) {
    document.querySelectorAll('.codetabs pre[data-lang]').forEach(p => p.hidden = p.dataset.lang !== l);
    document.querySelectorAll('.codetabs .tabbar button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
    try { localStorage.setItem('muestra-lang', l); } catch (e) {}
  }
  document.addEventListener('click', e => { const b = e.target.closest('.codetabs .tabbar button'); if (b) setLang(b.dataset.lang); });
  let lang0 = 'py'; try { lang0 = localStorage.getItem('muestra-lang') || 'py'; } catch (e) {}

  // ---------- helpers for lesson scripts ----------
  window.M = {
    fit, tok, fmt, pct, randn, npdf, erf, Phi, tq, segBind, axisTicks,
    draw: {},            // M.draw[vista] = función que redibuja los canvas de esa vista
    init: [],             // funciones que se ejecutan una vez, antes de la primera vista
    get current() { return current; },
  };

  addEventListener('DOMContentLoaded', () => {
    setLang(lang0);
    M.init.forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
    route();
  });
})();
