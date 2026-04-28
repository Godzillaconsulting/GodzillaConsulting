import React, { useEffect, useRef } from 'react';

/**
 * WaveformCanvas — dibuja la forma de onda de un audio URL.
 * Usa Web Audio API offline. Solo calcula una vez y caches el resultado.
 * NO genera re-renders en el padre.
 */
const waveformCache = new Map(); // url → Float32Array de picos

async function computeWaveform(url, bars = 120) {
  if (waveformCache.has(url)) return waveformCache.get(url);
  try {
    const res  = await fetch(url);
    const buf  = await res.arrayBuffer();
    const ctx  = new OfflineAudioContext(1, 1, 44100);
    const decoded = await ctx.decodeAudioData(buf);
    const raw  = decoded.getChannelData(0);
    const step = Math.floor(raw.length / bars);
    const peaks = new Float32Array(bars);
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(raw[i * step + j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }
    waveformCache.set(url, peaks);
    return peaks;
  } catch {
    return null;
  }
}

export default function WaveformCanvas({ url, color = '#10b981', width = 300, height = 36, className, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    let cancelled = false;

    computeWaveform(url).then(peaks => {
      if (cancelled || !peaks || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      const dpr    = window.devicePixelRatio || 1;
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const barW = width / peaks.length;
      const mid  = height / 2;

      ctx.fillStyle = color + 'cc';
      for (let i = 0; i < peaks.length; i++) {
        const barH = Math.max(1, peaks[i] * height * 0.9);
        ctx.fillRect(i * barW, mid - barH / 2, barW - 1, barH);
      }
    });

    return () => { cancelled = true; };
  }, [url, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, opacity: 0.85, pointerEvents: 'none', ...style }}
    />
  );
}
