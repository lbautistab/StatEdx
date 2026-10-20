/* Muestra · fondo negro o blanco
 * Se carga en el <head> para aplicar el tema antes de pintar la página y evitar un parpadeo.
 * Por defecto el fondo es negro; la elección del visitante se recuerda en este navegador.
 */
(() => {
  const KEY = 'muestra-theme';
  const root = document.documentElement;
  let theme = 'dark';
  try { const saved = localStorage.getItem(KEY); if (saved === 'light' || saved === 'dark') theme = saved; } catch (e) {}
  root.dataset.theme = theme;

  function sync(btn) {
    const dark = root.dataset.theme === 'dark';
    btn.setAttribute('aria-label', dark ? 'Cambiar a fondo blanco' : 'Cambiar a fondo negro');
    btn.title = dark ? 'Fondo blanco' : 'Fondo negro';
    btn.setAttribute('aria-pressed', String(dark));
  }

  addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
      sync(btn);
    });
  });
})();
