const fs = require('fs');
const path = require('path');
const components = [
    'Bots.jsx', 'CrmSaas.jsx', 'EmbudosDeVenta.jsx', 
    'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'ProduccionAudiovisual.jsx'
];
const dir = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components';

components.forEach(c => {
    let file = path.join(dir, c);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // 1. Update togglePlay
    content = content.replace(
        /const togglePlay = \(\) => \{\s*if \(videoRef\.current\) \{\s*if \(isPlaying\) \{\s*videoRef\.current\.pause\(\);\s*\} else \{\s*videoRef\.current\.play\(\);\s*\}\s*\}\s*setIsPlaying\(!isPlaying\);\s*\};/g,
        `const togglePlay = () => {
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
    };`
    );

    // 2. Update toggleMute
    content = content.replace(
        /const toggleMute = \(\) => \{\s*if \(videoRef\.current\) \{\s*videoRef\.current\.muted = !isMuted;\s*\}\s*setIsMuted\(!isMuted\);\s*\};/g,
        `const toggleMute = () => {
        if (videoRef.current) {
            if (videoRef.current.tagName === 'IFRAME') {
                const func = isMuted ? 'unMute' : 'mute';
                videoRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
            } else {
                videoRef.current.muted = !isMuted;
            }
        }
        setIsMuted(!isMuted);
    };`
    );

    // 3. Update the iframe definition
    const iframeRegex = /<iframe[\s\S]*?src=\{`https:\/\/www\.youtube\.com\/embed\/\$\{ytId\}\?autoplay=1&mute=\$\{isMuted \? '1' : '0'\}&loop=1&playlist=\$\{ytId\}&controls=0`\}[\s\S]*?className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"[\s\S]*?style=\{\{ pointerEvents: 'none' \}\}[\s\S]*?frameBorder="0"[\s\S]*?allow="autoplay; encrypted-media"[\s\S]*?><\/iframe>/g;
    
    content = content.replace(
        iframeRegex,
        `<iframe 
                                            ref={videoRef}
                                            src={\`https://www.youtube.com/embed/\${ytId}?autoplay=1&mute=1&loop=1&playlist=\${ytId}&controls=0&enablejsapi=1\`}
                                            className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
                                            style={{ pointerEvents: 'none' }}
                                            frameBorder="0"
                                            allow="autoplay; encrypted-media"
                                        ></iframe>`
    );

    fs.writeFileSync(file, content);
});
console.log('Patch V2 completed');
