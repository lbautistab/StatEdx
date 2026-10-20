# StatEdx

Clases de estadística y ciencia de datos en español. Cada clase empieza con un simulador interactivo, sigue con la teoría y las fórmulas, y termina con código en R y en Python, un quiz y ejercicios propuestos con solución.

Sitio publicado: https://lbautistab.github.io/StatEdx/

## Trabajar en VS Code

1. Clona el repositorio y abre la carpeta en VS Code:
   ```bash
   git clone https://github.com/lbautistab/StatEdx.git
   code StatEdx
   ```
2. Instala la extensión recomendada **Live Server** (VS Code te la sugiere al abrir la carpeta).
3. Clic derecho en `index.html` → **Open with Live Server**. Se abre en `http://127.0.0.1:5500` y se recarga cada vez que guardas.

No hace falta instalar nada más: no hay dependencias ni paso de compilación. También funciona abriendo `index.html` directamente en el navegador.

## Estructura

```
StatEdx/
├── index.html              Todo el contenido: portada, catálogo y las 14 clases
├── assets/                Logo de StatEdx (versión para fondo blanco y para fondo negro) e íconos
├── css/
│   └── styles.css          Estilos, colores del tema claro y oscuro, tipografía
├── js/
│   ├── mathjax-config.js   Configuración de las fórmulas (MathJax)
│   ├── theme.js            Fondo negro (por defecto) o blanco, con el botón del encabezado
│   ├── core.js             Catálogo, navegación, quizzes, pestañas R/Python y utilidades (window.M)
│   ├── home.js             Tablero de Galton animado de la portada
│   └── lessons/            Un archivo por clase con sus simuladores
│       ├── desc.js  prob.js  normal.js  tlc.js  ic.js  ph.js  bayes.js
│       └── reg.js  logit.js  ts.js  eda.js  viz.js  cv.js  trees.js
├── .vscode/                Extensiones y ajustes recomendados
└── .nojekyll               Le dice a GitHub Pages que publique los archivos tal cual
```

### Clases y sus identificadores

Cada clase tiene un identificador corto (slug). Se usa en la dirección (`#reg`), en el `id` de su vista (`view-reg`), en el prefijo de todos sus `id` (`reg-lab`, `reg-n`…) y en el nombre de su archivo JS.

| # | Clase | Slug | Ruta |
|---|---|---|---|
| 1 | Medidas de tendencia central y dispersión | `desc` | Fundamentos |
| 2 | Probabilidad y variables aleatorias | `prob` | Fundamentos |
| 3 | Distribución normal | `normal` | Fundamentos |
| 4 | Teorema del Límite Central | `tlc` | Inferencia |
| 5 | Intervalos de confianza | `ic` | Inferencia |
| 6 | Pruebas de hipótesis y valor p | `ph` | Inferencia |
| 7 | Inferencia bayesiana | `bayes` | Inferencia |
| 8 | Regresión lineal simple | `reg` | Modelos |
| 9 | Regresión logística | `logit` | Modelos |
| 10 | Series de tiempo | `ts` | Modelos |
| 11 | Análisis exploratorio de datos | `eda` | Ciencia de datos |
| 12 | Visualización de datos | `viz` | Ciencia de datos |
| 13 | Validación cruzada y sobreajuste | `cv` | Ciencia de datos |
| 14 | Árboles de decisión y random forest | `trees` | Ciencia de datos |

En `index.html`, cada clase empieza con un comentario como `<!-- ======================= CLASE: NORMAL ======================= -->`. Usa **Ctrl+F** (o **Cmd+F**) con el slug, o el panel **Outline**, para saltar a una clase.

## Cómo editar

- **Texto de una clase:** busca su `<div id="view-<slug>">` en `index.html`. Las fórmulas van entre `\( ... \)` (en línea) y `\[ ... \]` (en bloque), con sintaxis LaTeX.
- **Catálogo** (título, duración, nivel, descripción de cada tarjeta): arreglo `CLASSES` al inicio de `js/core.js`.
- **Colores y tipografía:** variables en `:root` al inicio de `css/styles.css`. Hay un bloque para el modo claro y dos para el modo oscuro; si cambias un color, cámbialo en los tres.
- **Logo:** está en `assets/`. Los archivos `*-dark.png` son la versión con letras claras para el fondo negro; el sitio muestra una u otra según el tema.
- **Fondo por defecto:** el sitio abre con fondo negro y el botón del encabezado cambia a blanco; la elección se recuerda en el navegador. Para cambiar el valor inicial, edita `let theme = 'dark'` en `js/theme.js`.
- **Simuladores:** `js/lessons/<slug>.js`.

### Piezas reutilizables

Copia cualquiera de estos bloques de una clase existente:

- **Simulador:** `<figure class="instrument lab">` con controles (`.controls`, `.seg`, `input[type=range]`), un `<canvas class="plot">` y un `.readout`.
- **Código en R y Python:** `<div class="codetabs">` con dos `<pre class="code" data-lang="py|r">`. Las pestañas se sincronizan en toda la página y el sitio recuerda el lenguaje elegido.
- **Quiz:** `<div class="quiz" data-right="…" data-wrong="…">` con cuatro `<button class="opt" data-ok="0|1">`.
- **Ejercicio:** `<div class="ex">` con un `<details>` que guarda la solución.
- **Fórmula destacada:** `<div class="eq">`; **idea clave:** `<div class="callout">`; **tabla:** `<div class="tablewrap"><table>…</table></div>`.

## Cómo agregar una clase nueva

1. **Catálogo:** agrega un objeto a `CLASSES` en `js/core.js`, con `slug`, ruta (`fund`, `inf`, `mod` o `ds`), nivel (1 a 3), minutos y descripción.
2. **Contenido:** en `index.html`, copia una clase completa (desde su comentario `CLASE:` hasta el `</div>` que la cierra) y pégala antes de `</main>`. Cambia el slug en el `id` de la vista, en `data-view` y en todos los `id` internos, que deben empezar por el slug y no repetirse en la página. Cada `<h2 id>` de la prosa debe tener su enlace en el índice (`<aside class="toc">`).
3. **Simulador:** crea `js/lessons/<slug>.js` y cárgalo al final de `index.html` con `<script src="js/lessons/<slug>.js"></script>`. El esqueleto mínimo:
   ```js
   (() => {
     const { fit, tok, fmt, segBind, axisTicks } = M;

     function draw() {
       const f = fit(document.getElementById('<slug>-plot')); if (!f) return;
       const { ctx, w, h } = f;
       ctx.clearRect(0, 0, w, h);
       ctx.fillStyle = tok('--accent');
       // ... dibuja con colores del tema, nunca con colores fijos
     }

     M.draw['<slug>'] = draw;               // se llama al abrir la clase, al cambiar el tamaño y el tema
     M.init.push(() => { /* preparar datos y readouts */ });
   })();
   ```
4. **Enlaces:** actualiza los `<div class="next">` de la clase anterior y de la siguiente.

### Utilidades disponibles en `window.M`

| Función | Para qué sirve |
|---|---|
| `M.fit(canvas)` | Ajusta el canvas a la pantalla y devuelve `{ ctx, w, h }`, o `null` si la vista está oculta |
| `M.tok('--accent')` | Lee un color o fuente del tema actual (`--bg`, `--ink`, `--muted`, `--line`, `--accent`, `--hot`, `--ok`, `--bad`, `--f-mono`…) |
| `M.fmt(x, d)` / `M.pct(x, d)` | Números y porcentajes con coma decimal |
| `M.randn()` | Número aleatorio normal estándar |
| `M.npdf(x, m, s)`, `M.Phi(z)`, `M.erf(x)`, `M.tq(z, df)` | Densidad normal, distribución acumulada, función error y cuantil t aproximado |
| `M.segBind(id, fn)` | Conecta un grupo de botones `.seg` |
| `M.axisTicks(ctx, X, desde, hasta, paso, y, color)` | Dibuja las etiquetas de un eje |

## Publicar cambios

GitHub Pages publica el sitio desde la rama configurada en **Settings → Pages**. Al hacer `git push` a esa rama, el sitio se actualiza en uno o dos minutos.

```bash
git add .
git commit -m "Describe tu cambio"
git push
```
