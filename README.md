# StatEdx

Clases de estadística y ciencia de datos en español. Doce bloques y 61 sesiones, de la estadística descriptiva al deep learning. Cada sesión empieza con un simulador interactivo, sigue con la teoría y las fórmulas, y termina con código en R y en Python, un quiz y ejercicios propuestos con solución.

Sitio publicado: https://lbautistab.github.io/StatEdx/

## Trabajar en VS Code

1. Clona el repositorio y abre la carpeta en VS Code:
   ```bash
   git clone https://github.com/lbautistab/StatEdx.git
   code StatEdx
   ```
2. Instala la extensión recomendada **Live Server** (VS Code te la sugiere al abrir la carpeta).
3. Clic derecho en `index.html` → **Open with Live Server**. Se abre en `http://127.0.0.1:5500` y se recarga cada vez que guardas.

No hay dependencias ni paso de compilación. **Importante:** cada sesión se carga desde su propio archivo al abrirla, así que el sitio necesita un servidor (Live Server, GitHub Pages o `python3 -m http.server`). Si abres `index.html` con doble clic, la portada funciona pero las sesiones no cargan.

## Estructura

```
StatEdx/
├── index.html              Encabezado, portada, catálogo y pie de página
├── lessons/                Una página por sesión: lessons/<slug>.html (61 sesiones)
├── assets/                 Logo de StatEdx (fondo blanco y fondo negro) e íconos
├── css/
│   └── styles.css          Estilos, colores del tema claro y oscuro, tipografía
├── js/
│   ├── catalog.js          Los 12 bloques y sus sesiones (título, nivel, minutos, descripción)
│   ├── core.js             Navegación, carga de sesiones, catálogo, quizzes, pestañas R/Python y utilidades (window.M)
│   ├── home.js             Tablero de Galton animado de la portada
│   ├── theme.js            Fondo negro (por defecto) o blanco, con el botón del encabezado
│   ├── mathjax-config.js   Configuración de las fórmulas (MathJax)
│   └── lessons/            Simuladores de cada sesión: js/lessons/<slug>.js
├── .vscode/                Extensiones y ajustes recomendados
└── .nojekyll               Le dice a GitHub Pages que publique los archivos tal cual
```

Al abrir `#<slug>`, `js/core.js` descarga `lessons/<slug>.html`, lo inserta en la página, carga `js/lessons/<slug>.js` y tipografía las fórmulas. Las migas ("Clases / Bloque / Sesión k de n") y los enlaces Anterior / Siguiente se generan solos a partir de `js/catalog.js`. La dirección `#bloque-<id>` abre el catálogo filtrado por ese bloque.

## Bloques y sesiones

Cada sesión tiene un identificador corto (slug). Se usa en la dirección (`#reg`), en sus dos archivos (`lessons/reg.html`, `js/lessons/reg.js`), en el `id` de su vista (`view-reg`) y como prefijo de todos sus `id` internos (`reg-lab`, `reg-n`…).

**1. Estadística Descriptiva**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Tipos de variables y escalas de medición | `tipos` | Básico |
| 2 | Tablas de frecuencia e histogramas | `frecuencias` | Básico |
| 3 | Medidas de tendencia central y dispersión | `desc` | Básico |
| 4 | Medidas de forma: asimetría y curtosis | `forma` | Básico |
| 5 | Descriptiva bivariada: correlación y tablas cruzadas | `bivar` | Intermedio |

**2. Análisis Exploratorio**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Análisis exploratorio de datos | `eda` | Básico |
| 2 | Visualización de datos | `viz` | Básico |
| 3 | Detección y tratamiento de valores atípicos | `atipicos` | Intermedio |
| 4 | Transformación y escalamiento de variables | `transform` | Intermedio |
| 5 | Exploración multivariada | `multivar` | Intermedio |

**3. Teoría de Probabilidades**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Probabilidad y variables aleatorias | `prob` | Básico |
| 2 | Probabilidad condicional y teorema de Bayes | `condicional` | Básico |
| 3 | Distribuciones discretas | `discretas` | Intermedio |
| 4 | Distribuciones continuas | `continuas` | Intermedio |
| 5 | Distribución normal | `normal` | Básico |
| 6 | El Teorema del Límite Central | `tlc` | Intermedio |

**4. Estadística Inferencial**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Intervalos de confianza | `ic` | Intermedio |
| 2 | Pruebas de hipótesis y valor p | `ph` | Intermedio |
| 3 | Pruebas t para una y dos medias | `ttest` | Intermedio |
| 4 | Análisis de varianza (ANOVA) | `anova` | Intermedio |
| 5 | Pruebas chi-cuadrado | `chi2` | Intermedio |

**5. Muestreo Estadístico**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Fundamentos del muestreo | `muestreo` | Básico |
| 2 | Muestreo aleatorio simple | `mas` | Intermedio |
| 3 | Muestreo estratificado | `estrat` | Intermedio |
| 4 | Muestreo por conglomerados y por etapas | `conglo` | Intermedio |
| 5 | Tamaño de muestra y diseño de encuestas | `tamano` | Intermedio |

**6. Modelos de Regresión**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Regresión lineal simple | `reg` | Intermedio |
| 2 | Regresión lineal múltiple | `regmult` | Intermedio |
| 3 | Diagnóstico de regresión | `diag` | Avanzado |
| 4 | Regresión logística | `logit` | Avanzado |
| 5 | Modelos lineales generalizados: regresión de Poisson | `glm` | Avanzado |

**7. Estadística Bayesiana**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Inferencia bayesiana | `bayes` | Avanzado |
| 2 | Priors conjugados y elección del prior | `priors` | Avanzado |
| 3 | Métodos MCMC: Metropolis-Hastings y Gibbs | `mcmc` | Avanzado |
| 4 | Modelos jerárquicos | `jerarq` | Avanzado |
| 5 | Regresión bayesiana | `bayesreg` | Avanzado |

**8. Estadística Espacial**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Introducción a los datos espaciales | `espacial` | Intermedio |
| 2 | Autocorrelación espacial: I de Moran | `moran` | Avanzado |
| 3 | Análisis de patrones de puntos | `puntos` | Avanzado |
| 4 | Geoestadística: el variograma | `variograma` | Avanzado |
| 5 | Interpolación espacial y kriging | `kriging` | Avanzado |

**9. Modelos de Supervivencia**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Conceptos de análisis de supervivencia | `superv` | Intermedio |
| 2 | Estimador de Kaplan-Meier | `km` | Intermedio |
| 3 | Comparar grupos: prueba log-rank | `logrank` | Intermedio |
| 4 | Regresión de riesgos proporcionales de Cox | `cox` | Avanzado |
| 5 | Modelos paramétricos: exponencial y Weibull | `weibull` | Avanzado |

**10. Series de Tiempo**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | Introducción a las series de tiempo | `ts` | Intermedio |
| 2 | Suavizamiento exponencial y Holt-Winters | `holt` | Intermedio |
| 3 | Modelos ARIMA | `arima` | Avanzado |
| 4 | Estacionalidad y modelos SARIMA | `sarima` | Avanzado |
| 5 | Evaluación de pronósticos | `pronost` | Intermedio |

**11. Machine Learning**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | k vecinos más cercanos | `knn` | Intermedio |
| 2 | Validación cruzada y sobreajuste | `cv` | Intermedio |
| 3 | Árboles de decisión y random forest | `trees` | Avanzado |
| 4 | Clustering: k-means y jerárquico | `kmeans` | Intermedio |
| 5 | Análisis de componentes principales (PCA) | `pca` | Avanzado |

**12. Deep Learning**

| # | Sesión | Slug | Nivel |
|---|---|---|---|
| 1 | El perceptrón y las redes neuronales | `perceptron` | Intermedio |
| 2 | Descenso de gradiente y retropropagación | `backprop` | Avanzado |
| 3 | Redes neuronales convolucionales | `cnn` | Avanzado |
| 4 | Redes recurrentes y LSTM | `rnn` | Avanzado |
| 5 | Atención y transformers | `transformers` | Avanzado |

## Cómo editar

- **Texto de una sesión:** `lessons/<slug>.html`. Las fórmulas van entre `\( ... \)` (en línea) y `\[ ... \]` (en bloque), con sintaxis LaTeX.
- **Bloques y tarjetas del catálogo** (nombre, descripción, orden de sesiones, título, nivel, minutos): `js/catalog.js`.
- **Colores y tipografía:** variables en `:root` al inicio de `css/styles.css`. Hay un bloque para el modo claro y dos para el modo oscuro; si cambias un color, cámbialo en los tres.
- **Logo:** está en `assets/`. Los archivos `*-dark.png` son la versión con letras claras para el fondo negro.
- **Fondo por defecto:** negro. Para cambiarlo, edita `let theme = 'dark'` en `js/theme.js`.
- **Simuladores:** `js/lessons/<slug>.js`.

### Piezas reutilizables

Copia cualquiera de estos bloques de una sesión existente:

- **Simulador:** `<figure class="instrument lab">` con controles (`.controls`, `.seg`, `input[type=range]`), un `<canvas class="plot">` y un `.readout`.
- **Código en R y Python:** `<div class="codetabs">` con dos `<pre class="code" data-lang="py|r">`. Las pestañas se sincronizan en toda la página y el sitio recuerda el lenguaje elegido.
- **Quiz:** `<div class="quiz" data-right="…" data-wrong="…">` con cuatro `<button class="opt" data-ok="0|1">`.
- **Ejercicio:** `<div class="ex">` con un `<details>` que guarda la solución.
- **Fórmula destacada:** `<div class="eq">`; **idea clave:** `<div class="callout">`; **tabla:** `<div class="tablewrap"><table>…</table></div>`.

## Cómo agregar una sesión nueva

1. **Catálogo:** en `js/catalog.js`, agrega la sesión a `SESSIONS` (`t`, `l`, `m`, `d`, `ready: true`) y pon su slug en la lista `sessions` de su bloque, en el orden en que quieras que aparezca.
2. **Contenido:** copia `lessons/normal.html` como `lessons/<slug>.html`. Cambia el slug en el `id` de la vista, en `data-view` y en todos los `id` internos, que deben empezar por el slug. Cada `<h2 id>` debe tener su enlace en el índice (`<aside class="toc">`). Deja vacíos `<div class="crumbs"></div>` y `<div class="next"></div>`: se rellenan solos.
3. **Simulador:** crea `js/lessons/<slug>.js`. No hace falta agregarlo a `index.html`; se carga al abrir la sesión. El esqueleto mínimo:
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

     M.draw['<slug>'] = draw;               // se llama al abrir la sesión, al cambiar el tamaño y el tema
     M.init.push(() => { /* preparar datos y readouts */ });
   })();
   ```

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
