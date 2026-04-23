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

const buildColorF = c =>
  `eq=brightness=${c.brightness}:contrast=${c.contrast}:saturation=${c.saturation}:gamma=${c.gamma}`;

const buildScaleF = (w, h) =>
  `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

const buildTextOverlay = (textClips, h) =>
  textClips
    .filter(c => c.text)
    .map(c => {
      const posY   = Math.round((c.style?.posY ?? 0.85) * h);
      const fcolor = (c.style?.fontColor ?? '#ffffff').replace('#', '0x');
      const fsize  = c.style?.fontSize ?? 48;
      const safe   = (c.text ?? '').replace(/'/g, "\\'").replace(/:/g, '\\:');
      return `drawtext=text='${safe}':fontcolor=${fcolor}:fontsize=${fsize}:x=(w-tw)/2:y=${posY}:box=1:boxcolor=black@0.5:boxborderw=10:enable='between(t\\,${c.start}\\,${c.end})'`;
    })
    .join(',');

// ─── Build render command ─────────────────────────────────────────────────────

async function buildCommand(ffmpeg, project) {
  const { w, h } = ASPECT_RATIOS[project.aspectRatio] || ASPECT_RATIOS['9:16'];
  const videoLayer = project.layers.find(l => l.type === 'video');
  const audioLayer = project.layers.find(l => l.type === 'audio');
  const textLayer  = project.layers.find(l => l.type === 'text');

  const vClips = videoLayer?.clips ?? [];
  const aClips = audioLayer?.clips ?? [];
  const tClips = textLayer?.clips  ?? [];

  if (vClips.length === 0) throw new Error('Agrega al menos un clip de video');

  // Write unique sources
  const written  = new Map();
  let fi = 0;
  const write = async (url) => {
    if (written.has(url)) return;
    const name = `src${fi++}.mp4`;
    await ffmpeg.writeFile(name, await fetchFile(url));
    written.set(url, name);
  };
  for (const c of vClips) if (c.sourceUrl) await write(c.sourceUrl);
  for (const c of aClips) if (c.sourceUrl) await write(c.sourceUrl);

  const inputs  = [...written.values()].flatMap(f => ['-i', f]);
  const sidx    = url => [...written.keys()].indexOf(url);
  const scaleF  = buildScaleF(w, h);

  let fc = '';
  const vParts = [];
  const aParts = [];

  // Process each video clip
  vClips.forEach((clip, i) => {
    const idx  = sidx(clip.sourceUrl);
    const dur  = clip.end - clip.start;
    const ss   = clip.sourceStart ?? 0;
    const spd  = clip.speed ?? 1;

    const vFilters = [
      `trim=start=${ss}:duration=${dur / spd}`,
      'setpts=PTS-STARTPTS',
      spd !== 1 ? `setpts=PTS/${spd}` : '',
      scaleF,
      buildColorF(clip.color ?? { brightness: 0, contrast: 1, saturation: 1, gamma: 1 }),
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

  // ─ Transitions (xfade) between consecutive clips ──────────────────────────
  if (vClips.length === 1) {
    // Single clip — no concat needed
    fc += `${vParts[0]}copy[vconcat]; ${aParts[0]}acopy[aconcat]; `;
  } else {
    // Build xfade chain
    let lastV = vParts[0];
    let lastA = aParts[0];
    let accDur = vClips[0].end - vClips[0].start; // accumulated video duration so far

    for (let i = 1; i < vClips.length; i++) {
      const clip     = vClips[i];
      const tIn      = clip.transitionIn;
      const xfadeTag = `xf${i}`;
      const afadeTag = `af${i}`;

      if (tIn && tIn.type !== 'cut' && tIn.duration > 0) {
        const tDur   = Math.min(tIn.duration, (vClips[i-1].end - vClips[i-1].start) * 0.8);
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
        // Hard cut via concat
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

  // ─ Mix extra audio layer ──────────────────────────────────────────────────
  let finalA = '[aconcat]';
  if (aClips.length > 0) {
    let mix = '[aconcat]';
    aClips.forEach((clip, i) => {
      const idx   = sidx(clip.sourceUrl);
      const dur   = clip.end - clip.start;
      const delay = Math.round(clip.start * 1000);
      fc += `[${idx}:a]atrim=start=${clip.sourceStart ?? 0}:duration=${dur},asetpts=PTS-STARTPTS,adelay=${delay}|${delay},volume=${clip.volume ?? 1}[amix${i}]; `;
      mix += `[amix${i}]`;
    });
    fc += `${mix}amix=inputs=${aClips.length + 1}:normalize=0[afinal]; `;
    finalA = '[afinal]';
  }

  // ─ Text overlay ───────────────────────────────────────────────────────────
  let finalV = '[vconcat]';
  const textF = buildTextOverlay(tClips, h);
  if (textF) {
    fc += `[vconcat]${textF}[vfinal]; `;
    finalV = '[vfinal]';
  }

  return { inputs, filterComplex: fc.trim(), finalV, finalA };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFFmpegRenderer() {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress]       = useState(0);

  const render = useCallback(async (project) => {
    setIsRendering(true);
    setProgress(0);
    try {
      const ffmpeg = await getFFmpeg(setProgress);
      const { inputs, filterComplex, finalV, finalA } = await buildCommand(ffmpeg, project);

      await ffmpeg.exec([
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', finalV, '-map', finalA,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
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
