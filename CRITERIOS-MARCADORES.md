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

## Composición actual de impresión: QR integrado

La decisión adoptada para el editor es un **solo cuadrado limpio de 15 × 15 cm** por marcador.

- Cada recorrido obtiene un ID estable al crearse, y con ese ID se reserva una URL pública: `recorrido.html?id=<ID>`.
- El QR es el mismo para todos los marcadores de ese recorrido y se compone automáticamente; no hay selector de posición ni tamaño.
- Cada marcador recibe su propia imagen validada. El QR ocupa la **esquina inferior derecha del área de imagen interior**, con fondo blanco de seguridad; no se tapa el borde negro que AR.js necesita reconocer.
- La composición impresa usa un margen blanco exterior y un borde negro; el `patternRatio` de los nuevos patrones es **0.88**. El reproductor público deberá inicializar AR.js con ese mismo valor: no debe mezclarse con marcadores .patt anteriores hechos a ratio 0.5 sin adaptación.
- La banda blanca exterior ocupa un **4,5 % de lado** (6,75 mm de margen por lado), y el marco negro ocupa unos **8,2 mm por lado**. La imagen interior resultante mide aproximadamente **12 × 12 cm**.
- El editor detecta márgenes uniformes de la imagen subida y autoencuadra la forma principal hasta aproximadamente el 96 % del área interior; preserva el color del fondo estimado en las esquinas.
- El QR lleva una zona blanca de seguridad para que el teléfono pueda leerlo, incluso cuando su recuadro queda muy cerca de la esquina inferior derecha del patrón interior.
- El generador reduce la **imagen interior ya combinada con QR** para codificar su archivo `.patt`. El borde negro se añade únicamente a la versión para impresión, siguiendo el esquema de AR.js Marker-Creator.
- La imagen imprimible se exporta en PNG de 1800 × 1800 px; el botón de impresión usa CSS físico de **150 × 150 mm**.
- El PNG y el archivo `.patt` se incluyen juntos en la descarga ZIP; el guardado local también conserva ambos.
- Los marcadores antiguos generados con `patternRatio: 0.72` **no deben mezclarse** con la nueva geometría. Deben volver a generarse para utilizarse con un detector configurado a `0.88`.
- **Hasta que se publique el recorrido**, ese QR abrirá una página que avisa que la experiencia aún no está disponible. La URL y el QR no cambian al publicar.
- Una vez publicado, se deberán probar escaneo del QR, reconocimiento del .patt, estabilidad de seguimiento, legibilidad a distintas distancias y combinaciones de varios marcadores. La validación previa de una imagen no garantiza su comportamiento con el QR superpuesto.

Este diseño tiene un compromiso: el QR ocupa parte del contenido entrenado, por lo que algunos diseños podrán perder precisión de seguimiento. **No se considerarán listos para exposición sin una prueba en el celular sobre la impresión final.**

## Patrón .patt y publicación

- Para cada imagen personalizada se genera el patrón .patt de la composición interior final, con un QR fijo por recorrido.
- Si se sustituye la imagen, se invalida el .patt y el PNG generados.
- No reutilizar un mismo patrón en marcadores distintos del mismo recorrido.
- Publicar la URL reservada exige subir al hosting todos los GLB, .patt, imágenes y el manifiesto del recorrido.
- En esta etapa se genera la composición imprimible en el editor, pero aún no está implementada la publicación completa del recorrido.

Referencias:
- https://ar-js-org.github.io/AR.js-Docs/marker-based/
- https://github.com/AR-js-org/Marker-Creator
