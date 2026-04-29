const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src/components/VideoEditorModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Añadir el estado
const stateTarget = "  const [captionLanguage, setCaptionLanguage] = useState('spanish');\n  const [isDraggingOver, setIsDraggingOver] = useState(false);\n  const [iaScope, setIaScope] = useState('clip');";
const stateNew = `  const [captionLanguage, setCaptionLanguage] = useState('spanish');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [iaScope, setIaScope] = useState('clip');
  const [captionStyle, setCaptionStyle] = useState('hormozi');

  const CAPTION_STYLES = {
    hormozi: { fontSize: 52, fontColor: '#ffffff', posY: 0.80, bold: true, align: 'center', karaoke: true },
    classic: { fontSize: 40, fontColor: '#ffffff', posY: 0.90, bold: false, align: 'center', karaoke: false },
    yellowBox: { fontSize: 44, fontColor: '#000000', bgColor: '#facc15', posY: 0.80, bold: true, align: 'center', karaoke: false }
  };`;
content = content.replace(stateTarget, stateNew);

// 2. Snap magnético
const snapTarget = `  const handleTimelineChange = useCallback((data) => {
    data.forEach(row => {
      const layer = editor.project.layers.find(l => l.id === row.id);
      if (!layer) return;
      row.actions.forEach(action => {
        const clip = layer.clips.find(c => c.id === action.id);
        if (clip && (Math.abs(clip.start - action.start) > 0.01 || Math.abs(clip.end - action.end) > 0.01)) {
          editor.updateClip(clip.id, { start: action.start, end: action.end });
        }
      });
    });
  }, [editor]);`;

const snapNew = `  const handleTimelineChange = useCallback((data) => {
    const SNAP_THRESHOLD = 0.3; // 0.3 segundos de magnetismo

    data.forEach(row => {
      const layer = editor.project.layers.find(l => l.id === row.id);
      if (!layer) return;
      row.actions.forEach(action => {
        const clip = layer.clips.find(c => c.id === action.id);
        if (clip && (Math.abs(clip.start - action.start) > 0.01 || Math.abs(clip.end - action.end) > 0.01)) {
          let newStart = action.start;
          let newEnd = action.end;
          const dur = newEnd - newStart;

          const otherClips = layer.clips.filter(c => c.id !== clip.id);
          for (const other of otherClips) {
             if (Math.abs(newStart - other.end) < SNAP_THRESHOLD) {
                 newStart = other.end;
                 newEnd = newStart + dur;
                 break;
             }
             if (Math.abs(newEnd - other.start) < SNAP_THRESHOLD) {
                 newEnd = other.start;
                 newStart = newEnd - dur;
                 break;
             }
          }
          if (newStart < SNAP_THRESHOLD) {
              newStart = 0;
              newEnd = dur;
          }

          editor.updateClip(clip.id, { start: newStart, end: newEnd });
        }
      });
    });
  }, [editor]);`;
content = content.replace(snapTarget, snapNew);

// 3. UI del selector de estilos en el dropdown IA
const uiTarget = `              <div className="flex bg-[#27272a] rounded p-1">
                <button onClick={() => setIaScope('clip')} className={\`flex-1 text-[10px] py-1 rounded transition-colors \${iaScope === 'clip' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Clip Sel.</button>
                <button onClick={() => setIaScope('all')} className={\`flex-1 text-[10px] py-1 rounded transition-colors \${iaScope === 'all' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Todo el Video</button>
              </div>
            </div>`;

const uiNew = `              <div className="flex bg-[#27272a] rounded p-1">
                <button onClick={() => setIaScope('clip')} className={\`flex-1 text-[10px] py-1 rounded transition-colors \${iaScope === 'clip' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Clip Sel.</button>
                <button onClick={() => setIaScope('all')} className={\`flex-1 text-[10px] py-1 rounded transition-colors \${iaScope === 'all' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Todo el Video</button>
              </div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide block mt-3 mb-2">Estilo de Subtítulos</label>
              <select value={captionStyle} onChange={e => setCaptionStyle(e.target.value)} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-[10px] rounded p-1.5 outline-none focus:border-purple-500">
                 <option value="hormozi">Hormozi (Karaoke Bold)</option>
                 <option value="classic">Clásico (Cine)</option>
                 <option value="yellowBox">Caja Amarilla</option>
              </select>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wide block mt-3 mb-2">Idioma Transcripción</label>
              <select value={captionLanguage} onChange={e => setCaptionLanguage(e.target.value)} className="w-full bg-[#27272a] border border-[#3f3f46] text-white text-[10px] rounded p-1.5 outline-none focus:border-purple-500 mb-2">
                 <option value="spanish">Español</option>
                 <option value="english">Inglés</option>
              </select>
            </div>`;
content = content.replace(uiTarget, uiNew);

// 4. Update Auto-Captions to use style
const autoCapTarget = `        editor.addClip(textLayer.id, makeTextClip(currentSentenceText.trim().toUpperCase(), clipStart, clipEnd, {
          fontSize: 52,
          fontColor: '#ffffff',
          posY: 0.80,
          bold: true,
          align: 'center',
          words: wordsArr,
          karaoke: true
        }));`;

const autoCapNew = `        const selectedStyle = CAPTION_STYLES[captionStyle];
        editor.addClip(textLayer.id, makeTextClip(currentSentenceText.trim().toUpperCase(), clipStart, clipEnd, {
          fontSize: selectedStyle.fontSize,
          fontColor: selectedStyle.fontColor,
          bgColor: selectedStyle.bgColor || 'rgba(0,0,0,0.5)',
          posY: selectedStyle.posY,
          bold: selectedStyle.bold,
          align: selectedStyle.align,
          words: wordsArr,
          karaoke: selectedStyle.karaoke
        }));`;
content = content.replace(autoCapTarget, autoCapNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Parche 3 aplicado!');
