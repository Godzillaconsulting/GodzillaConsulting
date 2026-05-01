import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';

const API_URL = import.meta.env ? (import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai') : 'https://bot.godzillaconsulting.ai';
const resolveMedia = (url) => {
    if (!url) return '';
    if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
        try {
            const urlObj = new URL(url);
            return `${API_URL}${urlObj.pathname}${urlObj.search}`;
        } catch(e) { /* ignore */ }
    }
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Manages the playback loop using requestAnimationFrame.
 * Uses refs exclusively inside the RAF loop to produce ZERO React re-renders per frame.
 * Only `currentTime` and `isPlaying` are React state (updated at most ~4fps for the display).
 */
export function usePlaybackEngine(project, videoRef) {
  const [isPlaying, setIsPlaying]     = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  // Internal mutable refs — not React state
  const globalTimeRef  = useRef(0);
  const lastTickRef    = useRef(0);
  const isPlayingRef   = useRef(false);
  const rafIdRef       = useRef(null);
  const rafLoopRef     = useRef(null); // ref to rafLoop to avoid hoisting issue
  const displayTickRef = useRef(0); // throttle display updates

  // Derived layer data as ref to avoid stale closures in RAF
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);

  const audioPlayersRef = useRef(new Map());

  const syncVideoToTime = useCallback((t) => {
    const proj = projectRef.current;
    const videoLayer = proj.layers.find(l => l.type === 'video');
    if (!videoLayer || !videoRef.current) return;

    const clip = videoLayer.clips.find(c => t >= c.start && t < c.end);
    if (clip) {
      const expectedSrc = resolveMedia(clip.sourceUrl);
      if (videoRef.current.getAttribute('data-clip-id') !== clip.id) {
        videoRef.current.setAttribute('data-clip-id', clip.id);
        videoRef.current.src = expectedSrc;
        videoRef.current.load();
      }
      const expectedSrcTime = clip.sourceStart + (t - clip.start) / clip.speed;
      if (Math.abs(videoRef.current.currentTime - expectedSrcTime) > 0.15) {
        videoRef.current.currentTime = expectedSrcTime;
      }
      if (videoRef.current.playbackRate !== clip.speed) videoRef.current.playbackRate = clip.speed;
      const expectedVol = clip.volume !== undefined ? clip.volume : 1;
      if (videoRef.current.volume !== expectedVol) videoRef.current.volume = expectedVol;
      
      // Visual Effects (CSS)
      let filterStr = '';
      if (clip.color) {
        if (clip.color.brightness !== undefined) filterStr += `brightness(${Math.max(0, 1 + clip.color.brightness)}) `;
        if (clip.color.contrast !== undefined) filterStr += `contrast(${clip.color.contrast}) `;
        if (clip.color.saturation !== undefined) filterStr += `saturate(${clip.color.saturation}) `;
        if (clip.color.temperature) {
           if (clip.color.temperature > 0) {
              // Warm (Orange/Red tint)
              filterStr += `sepia(${clip.color.temperature * 50}%) hue-rotate(-15deg) saturate(1.2) `;
           } else {
              // Cool (Blue tint)
              filterStr += `sepia(${Math.abs(clip.color.temperature) * 50}%) hue-rotate(180deg) saturate(1.2) `;
           }
        }
      }
      if (clip.effects) {
        if (clip.effects.includes('blur')) filterStr += `blur(4px) `;
        if (clip.effects.includes('bw')) filterStr += `grayscale(100%) `;
        if (clip.effects.includes('vignette')) filterStr += `drop-shadow(0 0 20px black) `; // Simple approx
        if (clip.effects.includes('vhs')) filterStr += `hue-rotate(-20deg) contrast(1.2) saturate(1.5) `; // Simple vhs approx
      }
      const finalFilter = filterStr.trim();
      if (videoRef.current.style.filter !== finalFilter) {
        videoRef.current.style.filter = finalFilter;
      }

      // PiP / Transform
      let transformStr = '';
      if (clip.keyframes && clip.keyframes.length > 0) {
        const relT = t - clip.start;
        const kfs = clip.keyframes;
        let activeK = kfs[0];
        let nextK = null;
        for (let i = 0; i < kfs.length; i++) {
           if (relT >= kfs[i].time) activeK = kfs[i];
           if (relT < kfs[i].time && !nextK) nextK = kfs[i];
        }
        
        let interpScale = activeK.scale || 1;
        let interpX = activeK.x || 0;
        let interpY = activeK.y || 0;
        
        if (nextK && activeK !== nextK) {
           const progress = (relT - activeK.time) / (nextK.time - activeK.time);
           interpScale = activeK.scale + (nextK.scale - activeK.scale) * progress;
           interpX = activeK.x + (nextK.x - activeK.x) * progress;
           interpY = activeK.y + (nextK.y - activeK.y) * progress;
        } else if (!nextK && kfs.length > 0 && relT < kfs[0].time) {
           // Before first keyframe, just use base transform
           interpScale = clip.transform?.scale || 1;
           interpX = clip.transform?.x || 0;
           interpY = clip.transform?.y || 0;
        }

        transformStr = `translate(${interpX}px, ${interpY}px) scale(${interpScale})`;
      } else if (clip.transform) {
        transformStr = `translate(${clip.transform.x || 0}px, ${clip.transform.y || 0}px) scale(${clip.transform.scale ?? 1})`;
      }
      if (videoRef.current.style.transform !== transformStr) {
        videoRef.current.style.transform = transformStr;
      }

      if (isPlayingRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (!videoRef.current.paused) videoRef.current.pause();
    }
  }, [videoRef]);

  const syncAudioToTime = useCallback((t) => {
    const proj = projectRef.current;
    const audioLayer = proj.layers.find(l => l.type === 'audio');
    if (!audioLayer) return;

    const activeClips = audioLayer.clips.filter(c => t >= c.start && t < c.end);
    
    // Cleanup inactive
    for (const [clipId, audio] of audioPlayersRef.current.entries()) {
       if (!activeClips.find(c => c.id === clipId)) {
          audio.pause();
          audioPlayersRef.current.delete(clipId);
       }
    }

    // Play active
    for (const clip of activeClips) {
       let audio = audioPlayersRef.current.get(clip.id);
       if (!audio) {
          audio = new Audio(resolveMedia(clip.sourceUrl));
          audioPlayersRef.current.set(clip.id, audio);
       }
       const expectedTime = clip.sourceStart + (t - clip.start) / (clip.speed || 1);
       if (Math.abs(audio.currentTime - expectedTime) > 0.15) {
          audio.currentTime = expectedTime;
       }
       const speed = clip.speed || 1;
       if (audio.playbackRate !== speed) audio.playbackRate = speed;
       const vol = clip.volume !== undefined ? clip.volume : 1;
       if (audio.volume !== vol) audio.volume = vol;

       if (isPlayingRef.current && audio.paused) {
          audio.play().catch(() => {});
       } else if (!isPlayingRef.current && !audio.paused) {
          audio.pause();
       }
    }
  }, []);

  const rafLoop = useCallback(() => {
    if (!isPlayingRef.current) return;

    const now = performance.now();
    const delta = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;
    globalTimeRef.current += delta;

    let maxEnd = 0;
    for (const layer of projectRef.current.layers) {
      for (const clip of layer.clips) {
        if (clip.end > maxEnd) maxEnd = clip.end;
      }
    }
    if (globalTimeRef.current >= maxEnd) {
      globalTimeRef.current = 0;
      isPlayingRef.current = false;
      setIsPlaying(false);
      setDisplayTime(0);
      if (videoRef.current) videoRef.current.pause();
      for (const audio of audioPlayersRef.current.values()) audio.pause();
      return;
    }

    syncVideoToTime(globalTimeRef.current);
    syncAudioToTime(globalTimeRef.current);

    displayTickRef.current += delta;
    if (displayTickRef.current >= 0.1) { // Reduces React re-renders from 60fps to 10fps
      displayTickRef.current = 0;
      setDisplayTime(globalTimeRef.current);
    }

    rafIdRef.current = requestAnimationFrame(rafLoopRef.current);
  }, [syncVideoToTime, syncAudioToTime, videoRef]);

  // Sync the ref so the loop can reference itself — must be in useLayoutEffect, not during render
  useLayoutEffect(() => {
    rafLoopRef.current = rafLoop;
  });

  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    lastTickRef.current  = performance.now();
    setIsPlaying(true);
    rafIdRef.current = requestAnimationFrame(rafLoopRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (videoRef.current) videoRef.current.pause();
    for (const audio of audioPlayersRef.current.values()) audio.pause();
  }, [videoRef]);

  const seek = useCallback((t) => {
    globalTimeRef.current = t;
    setDisplayTime(t);
    syncVideoToTime(t);
    syncAudioToTime(t);
  }, [syncVideoToTime, syncAudioToTime]);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [play, pause]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { isPlaying, displayTime, play, pause, seek, toggle, currentTimeRef: globalTimeRef };
}
