const fs = require('fs');

const target = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/LandingPaqueteDynamic.jsx';
let content = fs.readFileSync(target, 'utf8');

// 1. Fix imports
content = content.replace("import React, { useEffect } from'react';", "import React, { useEffect, useState, useRef } from'react';");
content = content.replace("import { Check } from'lucide-react';", "import { Check, Play, Pause, Volume2, VolumeX } from'lucide-react';");

// 2. Add state and functions
content = content.replace(
    /const contentData = getNodeData\(nodeId\);\n\s+const content = contentData\?\.heroTitle \? contentData : null;\n\n\s+useEffect\(\(\) => \{/g,
    `const contentData = getNodeData(nodeId);
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

// 3. Replace video element
const oldVideoRegex = /\{content\.videoFileUrl \|\| content\.videoUrl \? \(\s*<video\s*src=\{content\.videoFileUrl \|\| content\.videoUrl\}\s*autoPlay\s*muted\s*loop\s*playsInline\s*controls\s*className="w-full h-auto bg-black rounded-\[2\.5rem\] shadow-\[0_0_50px_rgba\(255,255,255,0\.1\)\] aspect-video object-contain"\s*\/>/gs;

const newVideoBlock = `{content.videoFileUrl || content.videoUrl ? (
    <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] group bg-black">
        {(() => {
            const vSrc = content.videoFileUrl || content.videoUrl;
            const ytMatch = vSrc.match(/^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=|shorts\\/)([^#&?]*).*/);
            const ytId = (ytMatch && ytMatch[2].length === 11) ? ytMatch[2] : null;
            if (ytId) {
                return (
                    <iframe 
                        ref={videoRef}
                        src={\`https://www.youtube.com/embed/\${ytId}?autoplay=1&mute=1&loop=1&playlist=\${ytId}&controls=0&enablejsapi=1\`}
                        className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                        style={{ pointerEvents: 'none' }}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                    ></iframe>
                );
            }
            return (
                <video
                    ref={videoRef}
                    src={vSrc}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                    onClick={togglePlay}
                />
            );
        })()}
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-black/60 hover:bg-[#CC0000] border border-white/30 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg text-white"
            >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
            </button>
            <button
                onClick={toggleMute}
                className="w-12 h-12 rounded-full bg-black/60 hover:bg-[#CC0000] border border-white/30 backdrop-blur-sm flex items-center justify-center transition-all shadow-lg text-white"
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
        </div>
    </div>`;

content = content.replace(oldVideoRegex, newVideoBlock);

fs.writeFileSync(target, content);
console.log('Update finished');
