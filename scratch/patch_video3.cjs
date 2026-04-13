const fs = require('fs');
const target = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/LandingPaqueteDynamic.jsx';
let c = fs.readFileSync(target, 'utf8');

c = c.replace(
/ const contentData = getNodeData\(nodeId\);\n const content = contentData\?\.heroTitle \? contentData : null;\n\n useEffect\(\(\) => \{/g,
` const contentData = getNodeData(nodeId);
 const content = contentData?.heroTitle ? contentData : null;

 const videoRef = useRef(null);
 const [isPlaying, setIsPlaying] = useState(true);
 const [isMuted, setIsMuted] = useState(true);

 const togglePlay = () => {
     if (videoRef.current) {
         if (videoRef.current.tagName === 'IFRAME') {
             const func = isPlaying ? 'pauseVideo' : 'playVideo';
             videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
         } else {
             if (isPlaying) {
                 videoRef.current.pause();
             } else {
                 videoRef.current.play();
             }
         }
     }
     setIsPlaying(!isPlaying);
 };

 const toggleMute = () => {
     if (videoRef.current) {
         if (videoRef.current.tagName === 'IFRAME') {
             const func = isMuted ? 'unMute' : 'mute';
             videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
         } else {
             videoRef.current.muted = !isMuted;
         }
     }
     setIsMuted(!isMuted);
 };

 useEffect(() => {`
);

fs.writeFileSync(target, c);
console.log('done');
