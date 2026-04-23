# Completando los Controles Pro en la Interfaz

Me has hecho la pregunta de oro. Como experto, revisé el motor interno (`FFmpeg`) y la interfaz visual y noté algo crítico: **El motor ya es capaz de procesar Velocidad, Volumen y Color (Brillo/Saturación), pero olvidé poner los "deslizadores" en la interfaz visual (UI).**

Si no ponemos los controles en la pantalla, el usuario no puede usar estas funciones avanzadas aunque el motor las soporte.

Para que no falte absolutamente nada y la herramienta sea un verdadero clon de CapCut, debemos agregar estos tres bloques al panel de propiedades cuando seleccionas un clip:

## Proposed Changes

### [MODIFY] `src/components/VideoEditorModal.jsx`

Voy a agregar los siguientes controles al panel de inspector de clips (columna derecha):

1. **Control de Audio Básico (Para Video y Audio):**
   - **Volumen:** Un deslizador del 0% al 200% (Permite mutear o amplificar el sonido nativo).

2. **Control de Velocidad (Para Video y Audio):**
   - **Velocidad de reproducción:** Un deslizador desde `0.5x` (Cámara lenta) hasta `3.0x` (Cámara rápida).

3. **Corrección de Color (Solo para Video):**
   - **Brillo:** Rango de -1 a 1.
   - **Contraste:** Rango de 0 a 2.
   - **Saturación:** Rango de 0 a 3 (permite blanco y negro manual o colores muy vivos).

## Verification Plan
1. **Volumen:** Mover el volumen a 0 y verificar que el clip se silencia.
2. **Velocidad:** Cambiar un clip a 2x y verificar que se reproduce el doble de rápido.
3. **Color:** Subir la saturación al máximo y verificar que los colores del video se vuelven hiper-vibrantes.

## User Review Required

> [!IMPORTANT]
> Esta es la pieza final del rompecabezas. ¿Me das luz verde para insertar estos sliders en la interfaz visual y conectar los cables finales?
