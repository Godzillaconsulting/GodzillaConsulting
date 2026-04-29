const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/VideoEditorModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newFunction = `  const handleHormoziBot = useCallback(async () => {
    if (!selectedClipId) return alert('Selecciona un clip de video para aplicar el Bot Hormozi.');
    const targetClip = editor.project.layers.flatMap(l => l.clips).find(c => c.id === selectedClipId);
    if (!targetClip || targetClip.type !== 'video') return alert('El Bot Hormozi solo funciona en clips de video.');

    setIsBotRunning(true);
    try {
      // 1. OBTENER BLOB PARA EL BACKEND
      const response = await fetch(targetClip.sourceUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('mediaFile', blob, 'clip.mp4');
      formData.append('language', captionLanguage);

      // 2. PEDIR SILENCIOS Y TRANSCRIPCIÓN AL BACKEND (Paralelo)
      const [cutRes, capRes] = await Promise.all([
          fetch('/api/studio/smart-cut', { method: 'POST', body: formData }),
          fetch('/api/studio/auto-captions', { method: 'POST', body: formData })
      ]);

      if (!cutRes.ok || !capRes.ok) throw new Error('Error en los servicios de IA de backend.');
      
      const cutData = await cutRes.json();
      const capData = await capRes.json();

      const keepRegions = cutData.keepRegions || [];
      const result = { chunks: capData.captions || [] };

      // Si no hubo cortes porque era corto, usar todo el clip
      if (keepRegions.length === 0) {
          keepRegions.push({ start: targetClip.sourceStart || 0, end: (targetClip.sourceStart || 0) + (targetClip.end - targetClip.start) });
      }

      // 3. ASSEMBLE CLIPS, TEXT & MOTION GRAPHICS
      const layer = editor.project.layers.find(l => l.clips.some(c => c.id === targetClip.id));
      const textLayer = editor.project.layers.find(l => l.type === 'text');
      
      // Asegurarnos de tener una capa de video secundaria para los motion graphics
      let overlayLayer = editor.project.layers.find(l => l.type === 'video' && l.id !== layer.id);
      if (!overlayLayer) {
          overlayLayer = makeLayer('video');
          editor.addLayer(overlayLayer);
      }
      
      let sfxLayer = editor.project.layers.find(l => l.type === 'audio');
      if (!sfxLayer) {
          sfxLayer = makeLayer('audio');
          editor.addLayer(sfxLayer);
      }

      let currentTimelineStart = targetClip.start;
      let punchIn = false;

      keepRegions.forEach((region, idx) => {
        const duration = region.end - region.start;

        // Add Video Clip (Alternating Zoom)
        const newClip = makeVideoClip(targetClip.sourceUrl, \`\${targetClip.sourceName} p\${idx + 1}\`, currentTimelineStart, currentTimelineStart + duration);
        newClip.sourceStart = region.start;
        newClip.speed = targetClip.speed || 1;
        newClip.volume = targetClip.volume !== undefined ? targetClip.volume : 1;

        if (punchIn) newClip.transform = { scale: 1.15, x: 0, y: 0 };
        punchIn = !punchIn; // Toggle zoom for next clip

        editor.addClip(layer.id, newClip);

        // Add Subtitles matching this region
        if (result.chunks) {
          const regionChunks = result.chunks.filter(c => {
             const [start, end] = c.timestamp;
             return start !== null && end !== null && start >= region.start && start < region.end;
          });

          let currentSentence = [];
          let currentSentenceText = '';

          const flushSentence = () => {
            if (currentSentence.length === 0) return;
            const start = currentSentence[0].timestamp[0];
            const end = currentSentence[currentSentence.length - 1].timestamp[1];

            const relativeStart = start - region.start;
            const relativeEnd = Math.min(end, region.end) - region.start;

            const clipStart = currentTimelineStart + relativeStart;
            const clipEnd = currentTimelineStart + relativeEnd;

            const wordsArr = currentSentence.map(w => ({
              text: w.text.trim().toUpperCase(),
              start: currentTimelineStart + (w.timestamp[0] - region.start),
              end: currentTimelineStart + (Math.min(w.timestamp[1], region.end) - region.start)
            }));

            // VERIFICAR PALABRAS CLAVE PARA MOTION GRAPHICS
            const textUpper = currentSentenceText.toUpperCase();
            if (textUpper.match(/SUSCRIB|CAMPANITA|LIKE/)) {
                const mg = MOTION_GRAPHICS_LIBRARY[1]; // Like & bell
                const mgClip = makeVideoClip(mg.url, mg.caption, clipStart, clipStart + 3);
                mgClip.chromaKey = mg.chromaKey;
                mgClip.transform = { scale: 0.5, x: 0, y: -0.3 };
                editor.addClip(overlayLayer.id, mgClip);
                
                const sfx = SFX_LIBRARY[1]; // Pop
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 1));
            } else if (textUpper.match(/DINERO|DÓLAR|VENTA|COMPRA/)) {
                const sfx = SFX_LIBRARY[3]; // Caja registradora
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 1.5));
            } else if (textUpper.match(/ALERTA|CUIDADO|PELIGRO|IMPORTANTE/)) {
                const sfx = SFX_LIBRARY[4]; // Riser
                editor.addClip(sfxLayer.id, makeAudioClip(sfx.url, sfx.caption, clipStart, clipStart + 2));
            }

            const selectedStyle = CAPTION_STYLES[captionStyle];

            editor.addClip(textLayer.id, makeTextClip(currentSentenceText.trim().toUpperCase(), clipStart, clipEnd, {
              fontSize: selectedStyle.fontSize,
              fontColor: selectedStyle.fontColor,
              bgColor: selectedStyle.bgColor || 'rgba(0,0,0,0.5)',
              posY: selectedStyle.posY,
              bold: selectedStyle.bold,
              align: selectedStyle.align,
              words: wordsArr,
              karaoke: selectedStyle.karaoke
            }));

            currentSentence = [];
            currentSentenceText = '';
          };

          regionChunks.forEach(chunk => {
            currentSentence.push(chunk);
            currentSentenceText += chunk.text + ' ';
            if (chunk.text.match(/[.!?]$/) || currentSentence.length >= 4) flushSentence();
          });
          flushSentence();
        }

        currentTimelineStart += duration;
      });

      editor.deleteClip(targetClip.id);
      setLeftTab('text');
      alert('¡Bot Hormozi completado! Se eliminaron silencios, inyectaron gráficos, y generaron subtítulos.');

    } catch (e) {
      console.error(e);
      alert('Error ejecutando Bot Hormozi: ' + e.message);
    } finally {
      setIsBotRunning(false);
    }
  }, [selectedClipId, editor, engine, captionLanguage, captionStyle, CAPTION_STYLES]);`;

const oldStart = "  const handleHormoziBot = useCallback(async () => {";
const oldEnd = "  }, [selectedClipId, editor, engine]);";

const startIndex = content.indexOf(oldStart);
if (startIndex !== -1) {
    const endIndex = content.indexOf(oldEnd, startIndex) + oldEnd.length;
    content = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Parche aplicado exitosamente.");
} else {
    console.error("No se encontró la función oldStart.");
}
