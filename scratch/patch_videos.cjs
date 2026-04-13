const fs = require('fs');
const path = require('path');
const components = ['Bots.jsx', 'CrmSaas.jsx', 'EmbudosDeVenta.jsx', 'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'ProduccionAudiovisual.jsx'];
const dir = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components';
components.forEach(c => {
    let file = path.join(dir, c);
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Fix togglePlay
    let newContent = content.replace(
        /const togglePlay \= \(\) \=\> \{\s*if \(videoRef\.current\) \{\s*if \(isPlaying\) \{\s*videoRef\.current\.pause\(\);\s*\} else \{\s*videoRef\.current\.play\(\);\s*\}\s*setIsPlaying\(!isPlaying\);\s*\}\s*\};/g,
        `const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
        setIsPlaying(!isPlaying);
    };`
    );
    
    // Fix toggleMute
    newContent = newContent.replace(
        /const toggleMute \= \(\) \=\> \{\s*if \(videoRef\.current\) \{\s*videoRef\.current\.muted \= \!isMuted;\s*setIsMuted\(\!isMuted\);\s*\}\s*\};/g,
        `const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
        }
        setIsMuted(!isMuted);
    };`
    );

    newContent = newContent.replace(
        /autoPlay(\r?\n)\s+muted(\r?\n)/g,
        'autoPlay$1                                        muted={isMuted}$2'
    );

    fs.writeFileSync(file, newContent);
});
console.log('Done');
