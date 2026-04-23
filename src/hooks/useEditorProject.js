import { useReducer, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ─── Aspect ratio canvas sizes ──────────────────────────────────────────────
export const ASPECT_RATIOS = {
  '9:16':  { w: 1080, h: 1920, label: '9:16 Vertical' },
  '16:9':  { w: 1920, h: 1080, label: '16:9 Horizontal' },
  '1:1':   { w: 1080, h: 1080, label: '1:1 Cuadrado' },
  '4:3':   { w: 1440, h: 1080, label: '4:3 Clásico' },
};

// ─── Default clip properties ──────────────────────────────────────────────────
const defaultTransform = () => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
const defaultColor     = () => ({ brightness: 0, contrast: 1, saturation: 1, gamma: 1 });

export const makeVideoClip = (sourceUrl, sourceName, start, end, sourceStart = 0) => ({
  id: uuidv4(),
  type: 'video',
  sourceUrl,
  sourceName: sourceName || 'Clip',
  start,
  end,
  sourceStart,
  speed: 1,
  transform: defaultTransform(),
  color: defaultColor(),
  transitionIn:  null,
  transitionOut: null,
  waveformCache: null,   // ImageData para el canvas de waveform
});

export const makeAudioClip = (sourceUrl, sourceName, start, end) => ({
  id: uuidv4(),
  type: 'audio',
  sourceUrl,
  sourceName: sourceName || 'Audio',
  start,
  end,
  sourceStart: 0,
  speed: 1,
  volume: 1,
  fadeIn:  0,
  fadeOut: 0,
  waveformCache: null,
});

export const makeTextClip = (text, start, end, style = {}) => ({
  id: uuidv4(),
  type: 'text',
  text,
  start,
  end,
  style: {
    fontSize: 48,
    fontColor: '#ffffff',
    bgColor: 'rgba(0,0,0,0.5)',
    bold: false,
    italic: false,
    align: 'center',
    posY: 0.85,   // fracción de la altura del canvas (0=top, 1=bottom)
    ...style,
  },
});

// ─── Initial project factory ──────────────────────────────────────────────────
const createProject = (initialVideoUrl) => {
  const videoLayer = { id: 'layer-v-0', type: 'video', locked: false, muted: false, clips: [] };
  const audioLayer = { id: 'layer-a-0', type: 'audio', locked: false, muted: false, volume: 1, clips: [] };
  const textLayer  = { id: 'layer-t-0', type: 'text',  locked: false, muted: false, clips: [] };

  if (initialVideoUrl) {
    videoLayer.clips.push(makeVideoClip(initialVideoUrl, 'Video Inicial', 0, 10, 0));
  }

  return {
    aspectRatio: '9:16',
    layers: [videoLayer, audioLayer, textLayer],
  };
};

// ─── Pure layer mutators (no side-effects) ────────────────────────────────────
const addClipToLayer = (layers, layerId, clip) =>
  layers.map(l => l.id !== layerId ? l : { ...l, clips: [...l.clips, clip] });

const deleteClipFromLayer = (layers, clipId) =>
  layers.map(l => ({ ...l, clips: l.clips.filter(c => c.id !== clipId) }));

const updateClipInLayer = (layers, clipId, patch) =>
  layers.map(l => ({
    ...l,
    clips: l.clips.map(c => c.id !== clipId ? c : { ...c, ...patch }),
  }));

const splitClipInLayer = (layers, clipId, splitTime) => {
  return layers.map(layer => {
    const idx = layer.clips.findIndex(c => c.id === clipId);
    if (idx === -1) return layer;
    const clip = layer.clips[idx];
    if (splitTime <= clip.start || splitTime >= clip.end) return layer;

    const durationA = splitTime - clip.start;
    const clipA = { ...clip, id: uuidv4(), end: splitTime };
    const clipB = {
      ...clip,
      id: uuidv4(),
      start: splitTime,
      sourceStart: clip.sourceStart + durationA / clip.speed,
    };

    const newClips = [...layer.clips];
    newClips.splice(idx, 1, clipA, clipB);
    return { ...layer, clips: newClips };
  });
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
const MAX_HISTORY = 30;

function buildInitialState(initialVideoUrl) {
  const project = createProject(initialVideoUrl);
  return {
    project,
    history: [project.layers],
    historyIndex: 0,
  };
}

function pushHistory(state, newLayers) {
  // Trim future history when a new action branches
  const trimmed = state.history.slice(0, state.historyIndex + 1);
  const history = trimmed.length >= MAX_HISTORY
    ? [...trimmed.slice(1), newLayers]
    : [...trimmed, newLayers];
  return {
    project: { ...state.project, layers: newLayers },
    history,
    historyIndex: history.length - 1,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_CLIP': {
      const newLayers = addClipToLayer(state.project.layers, action.layerId, action.clip);
      return pushHistory(state, newLayers);
    }
    case 'DELETE_CLIP': {
      // Revoke blob URL to free RAM
      const allClips = state.project.layers.flatMap(l => l.clips);
      const target = allClips.find(c => c.id === action.clipId);
      if (target?.sourceUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.sourceUrl);
      }
      const newLayers = deleteClipFromLayer(state.project.layers, action.clipId);
      return pushHistory(state, newLayers);
    }
    case 'SPLIT_CLIP': {
      const newLayers = splitClipInLayer(state.project.layers, action.clipId, action.splitTime);
      return pushHistory(state, newLayers);
    }
    case 'UPDATE_CLIP': {
      const newLayers = updateClipInLayer(state.project.layers, action.clipId, action.patch);
      // Update clip properties without pushing to history (frequent slider changes)
      if (action.noHistory) {
        return { ...state, project: { ...state.project, layers: newLayers } };
      }
      return pushHistory(state, newLayers);
    }
    case 'ADD_LAYER': {
      const newLayers = [...state.project.layers, action.layer];
      return pushHistory(state, newLayers);
    }
    case 'SET_ASPECT_RATIO':
      return { ...state, project: { ...state.project, aspectRatio: action.ratio } };
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      return { ...state, project: { ...state.project, layers: state.history[idx] }, historyIndex: idx };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      return { ...state, project: { ...state.project, layers: state.history[idx] }, historyIndex: idx };
    }
    case 'RESET': {
      const project = createProject(action.initialVideoUrl);
      return { project, history: [project.layers], historyIndex: 0 };
    }
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useEditorProject(initialVideoUrl) {
  const [state, dispatch] = useReducer(reducer, initialVideoUrl, buildInitialState);

  const addClip    = useCallback((layerId, clip) => dispatch({ type: 'ADD_CLIP', layerId, clip }), []);
  const deleteClip = useCallback((clipId) => dispatch({ type: 'DELETE_CLIP', clipId }), []);
  const splitClip  = useCallback((clipId, splitTime) => dispatch({ type: 'SPLIT_CLIP', clipId, splitTime }), []);
  const updateClip = useCallback((clipId, patch, noHistory = false) =>
    dispatch({ type: 'UPDATE_CLIP', clipId, patch, noHistory }), []);
  const addLayer      = useCallback((layer) => dispatch({ type: 'ADD_LAYER', layer }), []);
  const setAspectRatio = useCallback((ratio) => dispatch({ type: 'SET_ASPECT_RATIO', ratio }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const reset = useCallback((url) => dispatch({ type: 'RESET', initialVideoUrl: url }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Compute total project duration from all layer clips
  const totalDuration = useMemo(() => {
    let max = 0;
    for (const layer of state.project.layers) {
      for (const clip of layer.clips) {
        if (clip.end > max) max = clip.end;
      }
    }
    return max || 10;
  }, [state.project.layers]);

  return {
    project: state.project,
    totalDuration,
    addClip,
    deleteClip,
    splitClip,
    updateClip,
    addLayer,
    setAspectRatio,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
