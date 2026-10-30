/* StatEdx · catálogo de bloques y sesiones
 * Para agregar una sesión: añádela a SESSIONS, ponla en la lista `sessions` de su bloque,
 * crea lessons/<slug>.html y js/lessons/<slug>.js, y marca ready: true cuando esté lista.
 * Campos: t = título, l = nivel (1 básico, 2 intermedio, 3 avanzado), m = minutos, d = descripción.
 */
window.CATALOG = (() => {
  const BLOCKS = [
    { id: 'descriptiva', name: 'Estadística Descriptiva', fam: 'fund', glyph: 'hist', desc: 'Resumir y describir datos con tablas, gráficos y medidas numéricas.',
      sessions: ['tipos', 'frecuencias', 'desc', 'forma', 'bivar'] },
    { id: 'exploratorio', name: 'Análisis Exploratorio', fam: 'ds', glyph: 'scatter', desc: 'Inspeccionar, limpiar, transformar y visualizar un conjunto de datos real.',
      sessions: ['eda', 'viz', 'atipicos', 'transform', 'multivar'] },
    { id: 'probabilidad', name: 'Teoría de Probabilidades', fam: 'fund', glyph: 'bell', desc: 'Azar, variables aleatorias, distribuciones y teoremas límite.',
      sessions: ['prob', 'condicional', 'discretas', 'continuas', 'normal', 'tlc'] },
    { id: 'inferencial', name: 'Estadística Inferencial', fam: 'inf', glyph: 'ci', desc: 'Estimar parámetros y contrastar hipótesis a partir de una muestra.',
      sessions: ['ic', 'ph', 'ttest', 'anova', 'chi2'] },
    { id: 'muestreo', name: 'Muestreo Estadístico', fam: 'inf', glyph: 'grid', desc: 'Diseñar muestras que representen a la población y medir su precisión.',
      sessions: ['muestreo', 'mas', 'estrat', 'conglo', 'tamano'] },
    { id: 'regresion', name: 'Modelos de Regresión', fam: 'mod', glyph: 'reg', desc: 'Explicar y predecir una respuesta a partir de una o varias variables.',
      sessions: ['reg', 'regmult', 'diag', 'logit', 'glm'] },
    { id: 'bayesiana', name: 'Estadística Bayesiana', fam: 'inf', glyph: 'bell', desc: 'Actualizar creencias con datos: priors, posteriores y simulación MCMC.',
      sessions: ['bayes', 'priors', 'mcmc', 'jerarq', 'bayesreg'] },
    { id: 'espacial', name: 'Estadística Espacial', fam: 'mod', glyph: 'map', desc: 'Datos con ubicación: autocorrelación, patrones de puntos y kriging.',
      sessions: ['espacial', 'moran', 'puntos', 'variograma', 'kriging'] },
    { id: 'supervivencia', name: 'Modelos de Supervivencia', fam: 'mod', glyph: 'surv', desc: 'Tiempo hasta un evento con censura: Kaplan-Meier, log-rank y Cox.',
      sessions: ['superv', 'km', 'logrank', 'cox', 'weibull'] },
    { id: 'series', name: 'Series de Tiempo', fam: 'mod', glyph: 'wave', desc: 'Tendencia, estacionalidad y pronóstico de datos ordenados en el tiempo.',
      sessions: ['ts', 'holt', 'arima', 'sarima', 'pronost'] },
    { id: 'ml', name: 'Machine Learning', fam: 'ds', glyph: 'tree', desc: 'Aprender de los datos para predecir y agrupar, validando de forma honesta.',
      sessions: ['knn', 'cv', 'trees', 'kmeans', 'pca'] },
    { id: 'dl', name: 'Deep Learning', fam: 'ds', glyph: 'net', desc: 'Redes neuronales: del perceptrón a las convolucionales, recurrentes y transformers.',
      sessions: ['perceptron', 'backprop', 'cnn', 'rnn', 'transformers'] },
  ];

  const SESSIONS = {
    // Estadística Descriptiva
    tipos: { t: 'Tipos de variables y escalas de medición', l: 1, m: 80, d: 'Variables cualitativas y cuantitativas, escalas nominal, ordinal, de intervalo y de razón, y qué resumen usar en cada una.', ready: true },
    frecuencias: { t: 'Tablas de frecuencia e histogramas', l: 1, m: 85, d: 'Frecuencias absolutas, relativas y acumuladas, y cómo elegir los intervalos de un histograma.', ready: true },
    desc: { t: 'Medidas de tendencia central y dispersión', l: 1, m: 90, d: 'Media, mediana, varianza y por qué la mediana resiste a los valores atípicos.', ready: true },
    forma: { t: 'Medidas de forma: asimetría y curtosis', l: 1, m: 85, d: 'Describir la forma de una distribución y qué dicen la asimetría y la curtosis.', ready: true },
    bivar: { t: 'Descriptiva bivariada: correlación y tablas cruzadas', l: 2, m: 95, d: 'Covarianza, correlación de Pearson y de Spearman, y tablas de contingencia.', ready: true },
    // Análisis Exploratorio
    eda: { t: 'Análisis exploratorio de datos', l: 1, m: 100, d: 'Cargar, limpiar y resumir un conjunto de datos real con pandas y dplyr.', ready: true },
    viz: { t: 'Visualización de datos', l: 1, m: 85, d: 'Elegir el gráfico correcto y contar una historia con ggplot2 y seaborn.', ready: true },
    atipicos: { t: 'Detección y tratamiento de valores atípicos', l: 2, m: 90, d: 'Reglas del RIC y de z, métodos robustos y cuándo un atípico es un error o un hallazgo.', ready: true },
    transform: { t: 'Transformación y escalamiento de variables', l: 2, m: 90, d: 'Logaritmos, Box-Cox, estandarización, normalización y codificación de categorías.', ready: true },
    multivar: { t: 'Exploración multivariada', l: 2, m: 90, d: 'Matrices de correlación, gráficos de pares, mapas de calor y coordenadas paralelas.', ready: true },
    // Teoría de Probabilidades
    prob: { t: 'Probabilidad y variables aleatorias', l: 1, m: 95, d: 'Espacios muestrales, eventos, esperanza y varianza de una variable aleatoria.', ready: true },
    condicional: { t: 'Probabilidad condicional y teorema de Bayes', l: 1, m: 85, d: 'Condicionar, independencia, probabilidad total y por qué una prueba positiva no siempre significa enfermedad.', ready: true },
    discretas: { t: 'Distribuciones discretas', l: 2, m: 90, d: 'Bernoulli, binomial, geométrica, hipergeométrica y Poisson, y cuándo usar cada una.', ready: true },
    continuas: { t: 'Distribuciones continuas', l: 2, m: 90, d: 'Uniforme, exponencial, gamma y beta: densidades, acumuladas y relaciones entre ellas.', ready: true },
    normal: { t: 'Distribución normal', l: 1, m: 85, d: 'La campana, la regla 68-95-99,7 y cómo estandarizar con puntuaciones z.', ready: true },
    tlc: { t: 'El Teorema del Límite Central', l: 2, m: 95, d: 'Por qué las medias muestrales forman una campana y cuánto se estrecha.', ready: true },
    // Estadística Inferencial
    ic: { t: 'Intervalos de confianza', l: 2, m: 90, d: 'Qué significa realmente “95 % de confianza” y cómo calcular el margen de error.', ready: true },
    ph: { t: 'Pruebas de hipótesis y valor p', l: 2, m: 100, d: 'Hipótesis nula, errores tipo I y II, potencia y los malentendidos más comunes del valor p.', ready: true },
    ttest: { t: 'Pruebas t para una y dos medias', l: 2, m: 90, d: 'Una muestra, muestras independientes (Student y Welch) y muestras pareadas, con tamaño del efecto.', ready: true },
    anova: { t: 'Análisis de varianza (ANOVA)', l: 2, m: 95, d: 'Comparar tres o más medias, la tabla ANOVA, el estadístico F y las comparaciones múltiples.', ready: true },
    chi2: { t: 'Pruebas chi-cuadrado', l: 2, m: 90, d: 'Bondad de ajuste, independencia en tablas de contingencia y la V de Cramér.', ready: true },
    // Muestreo Estadístico
    muestreo: { t: 'Fundamentos del muestreo', l: 1, m: 80, d: 'Población, marco muestral, sesgo de selección y error de muestreo frente a errores ajenos al muestreo.', ready: true },
    mas: { t: 'Muestreo aleatorio simple', l: 2, m: 85, d: 'Estimar medias, totales y proporciones, con y sin reemplazo, y la corrección por población finita.', ready: true },
    estrat: { t: 'Muestreo estratificado', l: 2, m: 90, d: 'Asignación proporcional y de Neyman, y cuánta precisión se gana al estratificar.', ready: true },
    conglo: { t: 'Muestreo por conglomerados y por etapas', l: 2, m: 90, d: 'Efecto de diseño, correlación intraclase y muestreo bietápico.', ready: true },
    tamano: { t: 'Tamaño de muestra y diseño de encuestas', l: 2, m: 85, d: 'Calcular n para medias y proporciones, márgenes de error, no respuesta y redacción de preguntas.', ready: true },
    // Modelos de Regresión
    reg: { t: 'Regresión lineal simple', l: 2, m: 95, d: 'Mínimos cuadrados, interpretación de coeficientes y análisis de residuos.', ready: true },
    regmult: { t: 'Regresión lineal múltiple', l: 2, m: 100, d: 'Varios predictores, interpretación ceteris paribus, variables categóricas, interacciones y multicolinealidad.', ready: true },
    diag: { t: 'Diagnóstico de regresión', l: 3, m: 95, d: 'Residuos, apalancamiento, distancia de Cook, heterocedasticidad y transformaciones.', ready: true },
    logit: { t: 'Regresión logística', l: 3, m: 100, d: 'Modelar probabilidades, razones de momios y curvas ROC.', ready: true },
    glm: { t: 'Modelos lineales generalizados: regresión de Poisson', l: 3, m: 95, d: 'Datos de conteo, función de enlace, exposición, sobredispersión y binomial negativa.', ready: true },
    // Estadística Bayesiana
    bayes: { t: 'Inferencia bayesiana', l: 3, m: 95, d: 'Priors, verosimilitud y posteriores con un ejemplo de pruebas A/B.', ready: true },
    priors: { t: 'Priors conjugados y elección del prior', l: 3, m: 90, d: 'Familias conjugadas, priors informativos y débiles, análisis de sensibilidad y predictiva previa.', ready: true },
    mcmc: { t: 'Métodos MCMC: Metropolis-Hastings y Gibbs', l: 3, m: 100, d: 'Cadenas de Markov para muestrear posteriores, ajuste de la propuesta y diagnóstico de convergencia.', ready: true },
    jerarq: { t: 'Modelos jerárquicos', l: 3, m: 95, d: 'Agrupamiento parcial, encogimiento hacia la media y el ejemplo de las ocho escuelas.', ready: true },
    bayesreg: { t: 'Regresión bayesiana', l: 3, m: 95, d: 'Priors sobre coeficientes, posteriores, predicción con incertidumbre y su relación con ridge.', ready: true },
    // Estadística Espacial
    espacial: { t: 'Introducción a los datos espaciales', l: 2, m: 80, d: 'Tipos de datos espaciales, coordenadas y proyecciones, y la primera ley de la geografía.', ready: true },
    moran: { t: 'Autocorrelación espacial: I de Moran', l: 3, m: 90, d: 'Matrices de vecindad, I de Moran global y local (LISA) y mapas de agrupamientos.', ready: true },
    puntos: { t: 'Análisis de patrones de puntos', l: 3, m: 85, d: 'Aleatoriedad espacial completa, intensidad, función K de Ripley y agrupamiento.', ready: true },
    variograma: { t: 'Geoestadística: el variograma', l: 3, m: 90, d: 'Semivarianza, pepita, meseta y rango, y ajuste de modelos de variograma.', ready: true },
    kriging: { t: 'Interpolación espacial y kriging', l: 3, m: 95, d: 'Distancia inversa frente a kriging ordinario, varianza de predicción y validación cruzada espacial.', ready: true },
    // Modelos de Supervivencia
    superv: { t: 'Conceptos de análisis de supervivencia', l: 2, m: 80, d: 'Tiempo hasta el evento, censura, función de supervivencia y función de riesgo.', ready: true },
    km: { t: 'Estimador de Kaplan-Meier', l: 2, m: 90, d: 'Construir la curva de supervivencia paso a paso, mediana de supervivencia e intervalos.', ready: true },
    logrank: { t: 'Comparar grupos: prueba log-rank', l: 2, m: 85, d: 'Esperados frente a observados en cada tiempo de evento y cuándo la prueba pierde potencia.', ready: true },
    cox: { t: 'Regresión de riesgos proporcionales de Cox', l: 3, m: 100, d: 'Razones de riesgo, interpretación y verificación del supuesto de riesgos proporcionales.', ready: true },
    weibull: { t: 'Modelos paramétricos: exponencial y Weibull', l: 3, m: 90, d: 'Forma del riesgo, modelos de tiempo de falla acelerado y comparación con Cox.', ready: true },
    // Series de Tiempo
    ts: { t: 'Introducción a las series de tiempo', l: 2, m: 100, d: 'Tendencia, estacionalidad, autocorrelación y un primer modelo ARIMA.', ready: true },
    holt: { t: 'Suavizamiento exponencial y Holt-Winters', l: 2, m: 90, d: 'Suavizamiento simple, tendencia de Holt y estacionalidad aditiva y multiplicativa.', ready: true },
    arima: { t: 'Modelos ARIMA', l: 3, m: 95, d: 'Identificación con ACF y PACF, estimación, diagnóstico de residuos y pronóstico.', ready: true },
    sarima: { t: 'Estacionalidad y modelos SARIMA', l: 3, m: 90, d: 'Diferenciación estacional, notación (p,d,q)(P,D,Q)s y selección de modelos.', ready: true },
    pronost: { t: 'Evaluación de pronósticos', l: 2, m: 85, d: 'MAE, RMSE, MAPE y MASE, validación con origen móvil y comparación con modelos ingenuos.', ready: true },
    // Machine Learning
    knn: { t: 'k vecinos más cercanos', l: 2, m: 85, d: 'Distancias, elección de k, escalamiento y la maldición de la dimensionalidad.', ready: true },
    cv: { t: 'Validación cruzada y sobreajuste', l: 2, m: 90, d: 'Separar entrenamiento y prueba, k-fold y el equilibrio sesgo-varianza.', ready: true },
    trees: { t: 'Árboles de decisión y random forest', l: 3, m: 95, d: 'Cómo decide un árbol, por qué un bosque generaliza mejor y qué variables importan.', ready: true },
    kmeans: { t: 'Clustering: k-means y jerárquico', l: 2, m: 85, d: 'Agrupar sin etiquetas, elegir k con el codo y la silueta, y leer un dendrograma.', ready: true },
    pca: { t: 'Análisis de componentes principales (PCA)', l: 3, m: 90, d: 'Varianza explicada, cargas, biplots y cuándo conviene reducir dimensiones.', ready: true },
    // Deep Learning
    perceptron: { t: 'El perceptrón y las redes neuronales', l: 2, m: 80, d: 'Neuronas artificiales, funciones de activación, capas y por qué una red puede aproximar casi cualquier función.', ready: true },
    backprop: { t: 'Descenso de gradiente y retropropagación', l: 3, m: 100, d: 'Funciones de pérdida, regla de la cadena, tasa de aprendizaje, minilotes y optimizadores.', ready: true },
    cnn: { t: 'Redes neuronales convolucionales', l: 3, m: 95, d: 'Filtros, convolución, pooling y arquitecturas para clasificar imágenes.', ready: true },
    rnn: { t: 'Redes recurrentes y LSTM', l: 3, m: 90, d: 'Secuencias, estado oculto, desvanecimiento del gradiente y celdas LSTM y GRU.', ready: true },
    transformers: { t: 'Atención y transformers', l: 3, m: 100, d: 'Mecanismo de atención, autoatención, codificación posicional y modelos de lenguaje.', ready: true },
  };

  const FAMILIES = { fund: '--r-fund', inf: '--r-inf', mod: '--r-mod', ds: '--r-ds' };
  const LEVELS = ['', 'Básico', 'Intermedio', 'Avanzado'];
  return { BLOCKS, SESSIONS, FAMILIES, LEVELS };
})();
