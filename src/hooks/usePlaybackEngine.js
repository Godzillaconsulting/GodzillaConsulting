import { useRef, useState, useCallback, useEffect } from 'react';

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
      const expectedSrc = clip.sourceUrl;
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
          audio = new Audio(clip.sourceUrl);
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
    if (displayTickRef.current >= 0.066) {
      displayTickRef.current = 0;
      setDisplayTime(globalTimeRef.current);
    }

    rafIdRef.current = requestAnimationFrame(rafLoop);
  }, [syncVideoToTime, syncAudioToTime, videoRef]);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    lastTickRef.current  = performance.now();
    setIsPlaying(true);
    rafIdRef.current = requestAnimationFrame(rafLoop);
  }, [rafLoop]);

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
