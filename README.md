# Muestra Academia

Clases de estadística y ciencia de datos en español. Cada clase empieza con un simulador interactivo, sigue con la teoría y las fórmulas, y termina con código en R y en Python, un quiz y ejercicios propuestos con solución.

## Clases

| Ruta | Clases |
|---|---|
| Fundamentos | Medidas de tendencia central y dispersión · Probabilidad y variables aleatorias · Distribución normal |
| Inferencia | Teorema del Límite Central · Intervalos de confianza · Pruebas de hipótesis y valor p · Inferencia bayesiana |
| Modelos | Regresión lineal simple · Regresión logística · Series de tiempo |
| Ciencia de datos | Análisis exploratorio de datos · Visualización de datos · Validación cruzada y sobreajuste · Árboles de decisión y random forest |

## Cómo está hecho

Todo el sitio es un único `index.html` sin dependencias de compilación. Usa MathJax (desde jsDelivr) para las fórmulas y Google Fonts para la tipografía; los simuladores están dibujados en `<canvas>` con JavaScript propio.

Para verlo en local, abre `index.html` en el navegador o sirve la carpeta con `python3 -m http.server`.

## Publicación

El sitio se publica con GitHub Pages desde la raíz de la rama principal.
