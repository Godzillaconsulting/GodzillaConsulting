import { useRef, useState, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { ASPECT_RATIOS } from './useEditorProject';

// Lazy-loaded singleton
let ffmpegInstance = null;

async function getFFmpeg(onProgress) {
  if (!ffmpegInstance) ffmpegInstance = new FFmpeg();
  if (!ffmpegInstance.loaded) {
    ffmpegInstance.on('progress', ({ progress }) => onProgress(Math.min(Math.round(progress * 100), 99)));
    await ffmpegInstance.load({
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasmURL:  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    });
  }
  return ffmpegInstance;
}

// ─── Filter builders ──────────────────────────────────────────────────────────

const buildColorF = c => {
  let f = `eq=brightness=${c.brightness}:contrast=${c.contrast}:saturation=${c.saturation}:gamma=${c.gamma}`;
  if (c.temperature) {
     if (c.temperature > 0) {
        f += `,colorbalance=rs=${c.temperature * 0.3}:rm=${c.temperature * 0.3}:bs=${-c.temperature * 0.2}`;
     } else {
        f += `,colorbalance=bs=${-c.temperature * 0.3}:bm=${-c.temperature * 0.3}:rs=${c.temperature * 0.2}`;
     }
  }
  return f;
};

const buildScaleF = (w, h) =>
  `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

const buildTextOverlay = (textClips, w, h) =>
  textClips
    .filter(c => c.text)
    .map(c => {
      const posX   = c.style?.posX ?? 0.5;
      const posY   = c.style?.posY ?? 0.85;
      const fcolor = (c.style?.fontColor ?? '#ffffff').replace('#', '0x');
      const fsize  = c.style?.fontSize ?? 48;
      const safe   = (c.text ?? '').replace(/'/g, "\\'").replace(/:/g, '\\:');
      
      let xExp = `(${posX}*w)-(tw/2)`;
      let yExp = `(${posY}*h)-(th/2)`;
      let alphaExp = '1';
      
      if (c.style?.animation === 'fade') {
         alphaExp = `if(lt(t\\,${c.start}+1)\\,(t-${c.start})/1\\,1)`;
      } else if (c.style?.animation === 'slideup') {
         yExp = `if(lt(t\\,${c.start}+1)\\,(1-(t-${c.start}))*h+${posY}\\,(t-${c.start})*0+${posY})`;
      } else if (c.style?.animation === 'typewriter') {
         // Fallback to fast fade since text length animation is complex in basic drawtext
         alphaExp = `if(lt(t\\,${c.start}+0.5)\\,(t-${c.start})/0.5\\,1)`;
      }

      return `drawtext=text='${safe}':fontcolor=${fcolor}:fontsize=${fsize}:x=${xExp}:y=${yExp}:alpha=${alphaExp}:box=1:boxcolor=black@0.5:boxborderw=10:enable='between(t\\,${c.start}\\,${c.end})'`;
    })
    .join(',');

// ─── Build render command ─────────────────────────────────────────────────────

async function buildCommand(ffmpeg, project, exportSettings = {}) {
  const { w, h } = ASPECT_RATIOS[project.aspectRatio] || ASPECT_RATIOS['9:16'];
  const videoLayers = project.layers.filter(l => l.type === 'video');
  const audioLayers = project.layers.filter(l => l.type === 'audio');
  const textLayers  = project.layers.filter(l => l.type === 'text');

  const baseVClips = videoLayers[0]?.clips ?? [];
  const overlayVClips = videoLayers.slice(1).flatMap(l => l.clips) ?? [];
  const aClips = audioLayers.flatMap(l => l.clips) ?? [];
  const tClips = textLayers.flatMap(l => l.clips) ?? [];

  if (baseVClips.length === 0 && overlayVClips.length === 0) throw new Error('Agrega al menos un clip de video');

  // Write unique sources
  const written  = new Map();
  let fi = 0;
  const write = async (url) => {
    if (written.has(url)) return;
    const name = `src${fi++}.mp4`;
    await ffmpeg.writeFile(name, await fetchFile(url));
    written.set(url, name);
  };
  for (const c of baseVClips) if (c.sourceUrl) await write(c.sourceUrl);
  for (const c of overlayVClips) if (c.sourceUrl) await write(c.sourceUrl);
  for (const c of aClips) if (c.sourceUrl) await write(c.sourceUrl);

  const inputs  = [...written.values()].flatMap(f => ['-i', f]);
  const sidx    = url => [...written.keys()].indexOf(url);
  const scaleF  = buildScaleF(w, h);

  let fc = '';
  
  // ─── Base Video Layer ──────────────────────────────────────────────────────────
  const vParts = [];
  const aParts = [];
  
  if (baseVClips.length > 0) {
    baseVClips.forEach((clip, i) => {
      const idx  = sidx(clip.sourceUrl);
      const dur  = clip.end - clip.start;
      const ss   = clip.sourceStart ?? 0;
      const spd  = clip.speed ?? 1;

      // Aplicar filtros adicionales de efectos de video si existen
      const fxFilters = [];
      if (clip.effects?.includes('blur')) fxFilters.push('boxblur=5:1');
      if (clip.effects?.includes('vhs')) fxFilters.push('noise=alls=20:allf=t+u,eq=saturation=1.5:gamma=1.2');
      if (clip.effects?.includes('bw')) fxFilters.push('colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3');
      if (clip.effects?.includes('vignette')) fxFilters.push('vignette=PI/4');

      if (clip.fadeIn > 0) fxFilters.push(`fade=t=in:st=0:d=${clip.fadeIn}`);
      if (clip.fadeOut > 0) fxFilters.push(`fade=t=out:st=${dur/spd - clip.fadeOut}:d=${clip.fadeOut}`);

      const vFilters = [
        `trim=start=${ss}:duration=${dur / spd}`,
        'setpts=PTS-STARTPTS',
        spd !== 1 ? `setpts=PTS/${spd}` : '',
        scaleF,
        buildColorF(clip.color ?? { brightness: 0, contrast: 1, saturation: 1, gamma: 1 }),
        ...fxFilters
      ].filter(Boolean).join(',');

      const aFilters = [
        `atrim=start=${ss}:duration=${dur / spd}`,
        'asetpts=PTS-STARTPTS',
        spd !== 1 ? `atempo=${Math.min(Math.max(spd, 0.5), 100)}` : '',
      ].filter(Boolean).join(',');

      fc += `[${idx}:v]${vFilters}[vc${i}]; `;
      fc += `[${idx}:a]${aFilters}[ac${i}]; `;
      vParts.push(`[vc${i}]`);
      aParts.push(`[ac${i}]`);
    });

    if (baseVClips.length === 1) {
      fc += `${vParts[0]}copy[vconcat]; ${aParts[0]}acopy[aconcat]; `;
    } else {
      let lastV = vParts[0];
      let lastA = aParts[0];
      let accDur = baseVClips[0].end - baseVClips[0].start;

      for (let i = 1; i < baseVClips.length; i++) {
        const clip     = baseVClips[i];
        const tIn      = clip.transitionIn;
        const xfadeTag = `xf${i}`;
        const afadeTag = `af${i}`;

        if (tIn && tIn.type !== 'cut' && tIn.duration > 0) {
          const tDur   = Math.min(tIn.duration, (baseVClips[i-1].end - baseVClips[i-1].start) * 0.8);
          const offset = Math.max(0, accDur - tDur);
          const xtype  = tIn.type === 'fade'     ? 'fade'
                       : tIn.type === 'wipeleft'  ? 'wipeleft'
                       : tIn.type === 'slideleft' ? 'slideleft'
                       : tIn.type === 'zoom'      ? 'zoom'
                       : 'fade';
          fc += `${lastV}${vParts[i]}xfade=transition=${xtype}:duration=${tDur}:offset=${offset}[${xfadeTag}]; `;
          fc += `${lastA}${aParts[i]}acrossfade=d=${tDur}[${afadeTag}]; `;
          accDur = offset + (clip.end - clip.start);
          lastV  = `[${xfadeTag}]`;
          lastA  = `[${afadeTag}]`;
        } else {
          const cutTag = `concat${i}`;
          const acutTag = `aconcat${i}`;
          fc += `${lastV}${vParts[i]}concat=n=2:v=1:a=0[${cutTag}]; `;
          fc += `${lastA}${aParts[i]}concat=n=2:v=0:a=1[${acutTag}]; `;
          accDur += clip.end - clip.start;
          lastV = `[${cutTag}]`;
          lastA = `[${acutTag}]`;
        }
      }
      fc += `${lastV}copy[vconcat]; ${lastA}acopy[aconcat]; `;
    }
  } else {
    // Si no hay video base, generar fondo negro
    fc += `color=c=black:s=${w}x${h}:d=10[vconcat]; aevalsrc=0:d=10[aconcat]; `;
  }

  // ─── Overlay Video Layers (PiP) ────────────────────────────────────────────────
  let currentBg = '[vconcat]';
  overlayVClips.forEach((clip, i) => {
    const idx  = sidx(clip.sourceUrl);
    const dur  = clip.end - clip.start;
    const ss   = clip.sourceStart ?? 0;
    const spd  = clip.speed ?? 1;
    const tf   = clip.transform ?? { x: 0, y: 0, scale: 1 };
    
    const scaleW = Math.round(w * tf.scale);
    const scaleH = Math.round(h * tf.scale);
    // Calcular X e Y para centrar 0,0 y aplicar offset
    const posX = `(W-w)/2+${tf.x || 0}`;
    const posY = `(H-h)/2+${tf.y || 0}`;

    const fxFilters = [];
    if (clip.effects?.includes('blur')) fxFilters.push('boxblur=5:1');
    if (clip.effects?.includes('vhs')) fxFilters.push('noise=alls=20:allf=t+u,eq=saturation=1.5:gamma=1.2');
    if (clip.effects?.includes('bw')) fxFilters.push('colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3');
    if (clip.effects?.includes('vignette')) fxFilters.push('vignette=PI/4');
    
    if (clip.chromaKey) {
      const hex = clip.chromaKey.color.replace('#', '0x');
      fxFilters.push(`colorkey=color=${hex}:similarity=${clip.chromaKey.similarity}:blend=0.1`);
    }
    
    if (clip.fadeIn > 0) fxFilters.push(`fade=t=in:st=0:d=${clip.fadeIn}`);
    if (clip.fadeOut > 0) fxFilters.push(`fade=t=out:st=${dur/spd - clip.fadeOut}:d=${clip.fadeOut}`);

    const vFilters = [
      `trim=start=${ss}:duration=${dur / spd}`,
      'setpts=PTS-STARTPTS',
      spd !== 1 ? `setpts=PTS/${spd}` : '',
      `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=decrease`,
      `pad=${scaleW}:${scaleH}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
      buildColorF(clip.color ?? { brightness: 0, contrast: 1, saturation: 1, gamma: 1 }),
      ...fxFilters
    ].filter(Boolean).join(',');

    fc += `[${idx}:v]${vFilters}[ov${i}]; `;
    const nextBg = `[bgov${i}]`;
    fc += `${currentBg}[ov${i}]overlay=x='${posX}':y='${posY}':enable='between(t,${clip.start},${clip.end})'${nextBg}; `;
    currentBg = nextBg;
    
    // Si el overlay tiene audio, lo mezclaremos después
    if (clip.volume > 0) {
      aClips.push(clip);
    }
  });

  let finalV = currentBg;

  // ─── Mix Audio Layers ──────────────────────────────────────────────────
  let finalA = '[aconcat]';
  if (aClips.length > 0) {
    let mix = '[aconcat]';
    aClips.forEach((clip, i) => {
      // clip podría ser de un overlay video o de una capa de audio
      const isVideoWithAudio = clip.type === 'video';
      const idx   = sidx(clip.sourceUrl);
      const dur   = clip.end - clip.start;
      const ss    = clip.sourceStart ?? 0;
      const delay = Math.round(clip.start * 1000);
      const vol   = clip.volume ?? 1;
      
      const fxFilters = [];
      if (clip.voiceFx === 'deep') fxFilters.push('asetrate=44100*0.8,aresample=44100,atempo=1.25');
      if (clip.voiceFx === 'chipmunk') fxFilters.push('asetrate=44100*1.3,aresample=44100,atempo=0.76');
      if (clip.voiceFx === 'echo') fxFilters.push('aecho=0.8:0.9:1000:0.3');
      if (clip.voiceFx === 'radio') fxFilters.push('highpass=f=200,lowpass=f=3000');
      if (clip.noiseReduction) fxFilters.push('afftdn');
      
      if (clip.fadeIn > 0) fxFilters.push(`afade=t=in:st=0:d=${clip.fadeIn}`);
      if (clip.fadeOut > 0) fxFilters.push(`afade=t=out:st=${dur - clip.fadeOut}:d=${clip.fadeOut}`);

      const aFilt = [
        `atrim=start=${ss}:duration=${dur}`,
        'asetpts=PTS-STARTPTS',
        ...fxFilters,
        `adelay=${delay}|${delay}`,
        `volume=${vol}`
      ].filter(Boolean).join(',');

      fc += `[${idx}:a]${aFilt}[amix${i}]; `;
      mix += `[amix${i}]`;
    });
    fc += `${mix}amix=inputs=${aClips.length + 1}:normalize=0[afinal]; `;
    finalA = '[afinal]';
  }

  // ─── Text overlay ───────────────────────────────────────────────────────────
  const textF = buildTextOverlay(tClips, w, h);
  if (textF) {
    fc += `${finalV}${textF}[vfinaltext]; `;
    finalV = '[vfinaltext]';
  }

  return { inputs, filterComplex: fc.trim(), finalV, finalA, exportSettings };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFFmpegRenderer() {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress]       = useState(0);

  const render = useCallback(async (project, exportSettings = {}) => {
    setIsRendering(true);
    setProgress(0);
    
    // Default settings
    const fps = exportSettings.fps || 30;
    const crf = exportSettings.quality === 'high' ? '18' : exportSettings.quality === 'low' ? '28' : '23';
    const preset = 'ultrafast'; // Mantener ultrafast para web, o cambiar a fast si se desea mejor compresión pero más lento

    
    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    try {
      const ffmpeg = await getFFmpeg(setProgress);
      const { inputs, filterComplex, finalV, finalA } = await buildCommand(ffmpeg, project, exportSettings);

      await ffmpeg.exec([
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', finalV, '-map', finalA,
        '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-r', `${fps}`,
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        'output.mp4',
      ]);

      setProgress(100);
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const a    = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: `godzilla_edit_${Date.now()}.mp4`,
      });
      a.click();
      await ffmpeg.deleteFile('output.mp4');
      
      // Notify user
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
         new Notification('Godzilla Editor Pro', {
           body: '¡Tu render de video ha terminado con éxito! Revisa tus descargas.',
           icon: '/favicon.png'
         });
      }

      return true;
    } catch (err) {
      console.error('[FFmpegRenderer]', err);
      throw err;
    } finally {
      setIsRendering(false);
    }
  }, []);

  return { render, isRendering, progress };
}
