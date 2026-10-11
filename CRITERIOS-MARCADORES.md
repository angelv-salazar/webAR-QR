# Criterios de admisión de imágenes para marcadores (Estudio WebAR)

El propósito de este documento es establecer una **política de diseño y validación** para marcadores de patrón (.patt) utilizados con AR.js / ARToolKit. Estas reglas son criterios de nuestro editor, no requisitos universales de la biblioteca.

## Requisitos automáticos para la imagen central

- **Formatos admitidos:** PNG, JPEG o WebP. Desde Illustrator, exportar preferentemente PNG. SVG se podrá admitir más adelante mediante rasterización controlada.
- **Relación de aspecto:** cuadrada 1:1 (tolerancia máxima del 2 %). No se estira la imagen.
- **Resolución mínima admitida:** 512 × 512 px; **recomendada:** 1024 × 1024 px. La primera no es un mínimo técnico de AR.js: permite una fuente razonable para edición y preparación de la impresión.
- **Peso máximo:** 10 MB por imagen (límite de la interfaz, no de AR.js).
- **Dimensión máxima:** 8192 px por lado, para evitar imágenes excesivamente grandes al procesar en el navegador.
- **Patrones distintos:** el validador compara una versión de baja resolución de las imágenes del mismo recorrido; rechaza imágenes casi idénticas y advierte cuando se parecen demasiado.

## Comprobaciones orientativas (avisos, no garantías)

- Alto contraste entre las formas y su fondo.
- Siluetas simples y legibles; no confiar en líneas demasiado finas ni texturas densas.
- Asimetría al girar la imagen 90, 180 y 270 grados, para diferenciar la orientación.
- Buena distribución de zonas claras y oscuras.
- Si el archivo tiene transparencias, la composición deberá aplanarse sobre blanco.
- **Comprobación a 16 × 16 px:** como el sistema reduce los patrones, la imagen tiene que conservar sus rasgos principales al verse pequeña.

El validador realiza comprobaciones aproximadas sobre píxeles. No puede garantizar que un marcador vaya a seguirse de manera estable: cada patrón tiene que probarse en teléfono, con iluminación y distancia reales.

## Composición de impresión prevista

- **Tamaño físico del soporte:** 15 × 15 cm.
- Patrón cuadrado con marco negro continuo y margen exterior blanco de alto contraste.
- Se reservará espacio para un QR **fuera del patrón entrenado** cuando usemos un patrón .patt personalizado. Así, todos los QR de un recorrido podrán enlazar a una misma URL sin modificar la imagen usada para entrenar el reconocimiento.
- Exportación prevista: SVG o PDF vectorial cuando sea posible, y PNG de alta resolución para impresión (aproximadamente 1800 × 1800 px o más para el soporte completo a 300 ppp).
- Impresión mate, sin reflejos, con bordes nítidos y sin deformación de la forma cuadrada.

**Importante:** el ejemplo anterior QR + Hiro se validó con un QR *dentro* del área blanca de Hiro, pero no debemos asumir que un patrón .patt nuevo reconocerá correctamente un QR superpuesto. O entrenamos sobre el diseño combinado final inmutable, o colocamos el QR fuera del patrón; para el gestor elegimos la segunda opción por estabilidad.

## Uso del archivo .patt

- Para un marcador personalizado, además de la imagen hace falta generar un archivo .patt válido.
- Formato comprobable: 3072 valores enteros de 0 a 255 (4 orientaciones × 3 canales × 16 × 16).
- No reutilizar un mismo .patt en marcadores diferentes dentro del recorrido.
- Si se cambia la imagen, el patrón anterior se invalida y deberá generarse nuevamente.
- Una imagen admitida por el validador **no está publicada ni lista para imprimir automáticamente**. Quedan pendientes la generación del .patt, la composición del soporte final y las pruebas con cámara.

## Orden de desarrollo

1. Validación de imágenes en el editor: formatos, dimensiones, contrastes, asimetrías, duplicados.
2. Generación automática del .patt con AR.js Marker-Creator, conservando una única disposición de marco y margen.
3. Composición del QR vinculado al recorrido **fuera del patrón**, dentro de 15 × 15 cm, y exportación de archivos imprimibles.
4. Publicación del recorrido con sus GLB, .patt, metadatos de posición, tamaño y animaciones.
5. Pruebas en varios teléfonos y ajuste de rendimiento al aumentar el número de marcadores.

Referencias:
- https://ar-js-org.github.io/AR.js-Docs/marker-based/
- https://github.com/AR-js-org/Marker-Creator
- https://www.connected-environments.org/blog/2020-01-13-ar-playing-cards/
