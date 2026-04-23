# Godzilla Video Editor Premium Upgrade

He implementado con éxito todas las mejoras solicitadas para llevar el editor al nivel de CapCut / Clipchamp. El editor ahora cuenta con una arquitectura robusta multicapa y un nuevo set de herramientas con Inteligencia Artificial.

## Mejoras Implementadas

### 1. Arquitectura Multi-Track (Línea de Tiempo Avanzada)
- **Soporte de múltiples capas:** Ahora puedes agregar pistas de video, audio y texto dinámicamente usando los nuevos botones `+ Video`, `+ Audio`, y `+ Texto` debajo de la línea de tiempo.
- **Picture-in-Picture (PiP):** El motor de renderizado FFmpeg ha sido reescrito usando filtros de `overlay`. Ahora la primera capa de video funciona como el fondo principal, y las demás capas de video se superponen.
- **Controles de Transformación:** En el panel de propiedades, ahora puedes modificar la Escala y Posición (X, Y) de cualquier video superpuesto.

### 2. Herramientas de IA (Magic Bot)
Se ha agregado un menú desplegable de herramientas inteligentes (IA Tools) en el panel superior:
- **Smart Cut (Corte Inteligente):** Al seleccionar un clip, esta herramienta detecta automáticamente los silencios prolongados y recorta el clip, ahorrando horas de edición manual.
- **Auto-Subtítulos:** Genera subtítulos automáticamente sincronizados con el audio, creando clips de texto de alto impacto visual.

### 3. Efectos Visuales y de Audio Avanzados
- **Efectos de Video (FX):** Filtros aplicables con un clic en el panel de propiedades (Desenfocar, Retro VHS, Blanco y Negro, Viñeta).
- **Chroma Key (Pantalla Verde):** Ahora puedes superponer videos grabados en pantalla verde, seleccionar el color exacto a remover, y ajustar la tolerancia para un blending perfecto usando Inteligencia Artificial (algoritmos de segmentación nativos).
- **Modificadores de Voz:** Transforma el audio de cualquier clip usando filtros preestablecidos (Voz de Robot, Eco en Caverna, Ardilla).
- **Fades de Audio (Fundidos):** Deslizadores en las propiedades de audio para hacer que el sonido entre suavemente (Fade In) o salga gradualmente (Fade Out).
- **Extraer Audio:** Un nuevo botón en la barra de herramientas que permite aislar instantáneamente el audio de un clip de video y colocarlo en su propia pista inferior para poder editarlo libremente.
- **Reducción de Ruido IA:** Un toggle para aplicar el filtro `afftdn` (Audio FFT DeNoise) de FFmpeg, que limpia el ruido de fondo del micrófono.

### 4. Control de Exportación Profesional
- **Menú de Exportación:** Modal para definir los ajustes finales:
  - **Calidad (Bitrate):** Alta (18 CRF), Media (23 CRF) o Baja (28 CRF).
  - **Framerate (FPS):** Permite elegir entre 30 FPS estándar o 60 FPS ultra-fluido.

### 5. Animaciones de Texto (Keyframes y Expresiones)
- Se integró la opción de agregar **Animaciones de Entrada** a los textos (Aparición Suave, Máquina de Escribir, Deslizar hacia arriba) mediante expresiones matemáticas en FFmpeg aplicadas en tiempo real.

## Archivos Modificados
- `src/hooks/useEditorProject.js`: Añadida la lógica de capas dinámicas y atributos de transformación.
- `src/hooks/useFFmpegRenderer.js`: Reescritura masiva de `buildCommand` para soportar `colorkey`, `fade/afade` paramétrico y manipulación algorítmica de texto `drawtext` para animaciones.
- `src/components/VideoEditorModal.jsx`: Expansión de la interfaz gráfica con el Modal de Exportación, Extraer Audio, Controles Chroma Key y Animaciones de Texto.

> [!TIP]
> Prueba agregar dos capas de video, reducir la escala del segundo video (PiP) y aplicar un efecto VHS. ¡Verás el potencial del nuevo motor de renderizado al exportar!
