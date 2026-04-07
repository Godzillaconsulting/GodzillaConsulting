const fs = require('fs');
const path = require('path');

const filesToPatch = [
    'Bots.jsx', 'ProduccionAudiovisual.jsx', 'OptimizacionWebSeo.jsx',
    'GestionRedesSociales.jsx', 'EmbudosDeVenta.jsx', 'CrmSaas.jsx',
];

const basePath = path.join(__dirname, '..', 'src', 'components');

for (const file of filesToPatch) {
    const fullPath = path.join(basePath, file);
    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping ${file}`);
        continue;
    }
    
    let source = fs.readFileSync(fullPath, 'utf8');

    // Usaremos replace para ubicar exactamente el bloque de <video que falla con YouTube
    const searchTarget = /\{\(content\.videoFileUrl \|\| content\.videoUrl\) \? \(\s*<video\s*ref=\{videoRef\}\s*src=\{content\.videoFileUrl \|\| content\.videoUrl\}\s*autoPlay\s*muted\s*playsInline\s*className="([^"]+)"\s*onClick=\{togglePlay\}\s*\/>/g;
    
    const targetReplacement = `{(content.videoFileUrl || content.videoUrl) ? (
                            (() => {
                                const vSrc = content.videoFileUrl || content.videoUrl;
                                const ytMatch = vSrc.match(/^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/);
                                const ytId = (ytMatch && ytMatch[2].length === 11) ? ytMatch[2] : null;
                                if (ytId) {
                                    return (
                                        <iframe 
                                            src={\`https://www.youtube.com/embed/\${ytId}?autoplay=1&mute=\${isMuted ? '1' : '0'}&loop=1&playlist=\${ytId}&controls=0\`}
                                            className="$1"
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
                                        muted
                                        playsInline
                                        className="$1"
                                        onClick={togglePlay}
                                    />
                                );
                            })()
                        `;

    const newSource = source.replace(searchTarget, targetReplacement);
    if (newSource !== source) {
        fs.writeFileSync(fullPath, newSource, 'utf8');
        console.log(`Patched: ${file}`);
    } else {
        console.log(`Already patched or not matched: ${file}`);
    }
}
