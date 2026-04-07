import React, { useState, useEffect } from 'react';
import './GodzillaSora.css';

export default function GodzillaSora() {
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("low quality, distorted, bad physics");
    
    // Parámetros Avanzados
    const [cfgScale, setCfgScale] = useState(7.5);
    const [diffusionSteps, setDiffusionSteps] = useState(50);
    const [sampler, setSampler] = useState('DPM++ 2M SDE Karras');
    const [seed, setSeed] = useState(-1);
    const [upscale, setUpscale] = useState(false);
    const [resolution, setResolution] = useState("1080p");
    
    // Estado UI
    const [status, setStatus] = useState("IDLE"); // IDLE, CONNECTING, RENDERING, DONE, ERROR
    const [logs, setLogs] = useState(["[SYSTEM] Godzilla In-House Cluster Iniciado.", "[SYSTEM] GPU A100 Detectadas: 4", "[SYSTEM] Esperando Prompts..."]);
    const [progress, setProgress] = useState(0);

    const appendLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleGenerate = async () => {
        if (!prompt) {
            appendLog("[ERROR] El prompt en blanco no es válido.");
            return;
        }
        setStatus("CONNECTING");
        appendLog(`[NETWORK] Evaluando conexión cifrada al clúster de Godzilla...`);
        
        try {
            const token = localStorage.getItem('adminToken');
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/studio/sora-generate`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    negative_prompt: negativePrompt,
                    resolution: resolution,
                    diffusion_steps: parseInt(diffusionSteps),
                    cfg_scale: parseFloat(cfgScale),
                    sampler: sampler,
                    seed: parseInt(seed),
                    upscale: upscale
                })
            });

            if (!response.ok) {
                const dataError = await response.json().catch(()=>({error: "Server Error"}));
                throw new Error(dataError.error || "El Master Cluster no respondió.");
            }

            const data = await response.json();
            
            setStatus("RENDERING");
            appendLog(`[CLUSTER MASTER] Órdenes recibidas. Tensor Cores activados.`);
            appendLog(`[TASK INFO] ID Seguro: ${data.task_id}`);
            appendLog(`[PARAMS] Slicing Spacetime Patches... CFG: ${cfgScale} | Pasos: ${diffusionSteps}`);
            
            let currentStep = 0;
            const renderInterval = setInterval(() => {
                currentStep += 2;
                setProgress(currentStep);
                if (currentStep % 10 === 0) {
                    appendLog(`[RENDER] Sampling step ${currentStep}/${diffusionSteps}... Denoising...`);
                }

                if (currentStep >= diffusionSteps) {
                    clearInterval(renderInterval);
                    appendLog(`[DECODE] VAE Video Output Decodificado Exitosamente.`);
                    if(upscale) appendLog(`[UPSCALE] Multiplicador Tensor activado. Subiendo a 4K...`);
                    setTimeout(() => {
                        setStatus("DONE");
                        appendLog(`[SYSTEM] Render Completado.`);
                    }, 1000);
                }
            }, 100);

        } catch (error) {
            setStatus("ERROR");
            appendLog(`[NETWORK ERROR] Conexión Fallida: ${error.message}`);
        }
    };

    return (
        <div className="sora-platform">
            {/* Background Animations */}
            <div className="sora-bg-blob blob-1"></div>
            <div className="sora-bg-blob blob-2"></div>
            <div className="sora-bg-blob blob-3"></div>

            {/* Topbar */}
            <header className="sora-topbar">
                <div className="sora-brand">
                    <span className="brand-logo">G</span>
                    <div className="brand-text">
                        <h1>GODZILLA AI</h1>
                        <span className="brand-subtitle">In-House Spacetime Diffusion Cluster</span>
                    </div>
                </div>
                <div className="sora-nav-actions">
                    <div className={`status-indicator ${status.toLowerCase()}`}>
                        <div className="status-dot"></div>
                        <span>{status === 'IDLE' ? 'CLUSTER ONLINE' : status}</span>
                    </div>
                    <button className="btn-close-app" onClick={() => window.close()}>VOLVER AL STUDIO</button>
                </div>
            </header>

            <main className="sora-workspace">
                
                {/* Panel Izquierdo: Controles */}
                <aside className="sora-sidebar panel-glass">
                    <div className="panel-header">
                        <h2>Configuración DiT</h2>
                        <span className="badge">Modo Avanzado</span>
                    </div>

                    <div className="control-group">
                        <label>Resolución Base</label>
                        <select value={resolution} onChange={(e)=>setResolution(e.target.value)}>
                            <option value="480p">480p (Rápido - Slicing Táctico)</option>
                            <option value="720p">720p (Estándar)</option>
                            <option value="1080p">1080p (Alta Demanda)</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <div className="label-flex">
                            <label>Diffusion Steps</label>
                            <span>{diffusionSteps}</span>
                        </div>
                        <input className="sora-slider" type="range" min="10" max="150" value={diffusionSteps} onChange={(e)=>setDiffusionSteps(e.target.value)} />
                        <small>A mayor número, más refinado y costoso.</small>
                    </div>

                    <div className="control-group">
                        <div className="label-flex">
                            <label>CFG Scale</label>
                            <span>{cfgScale}</span>
                        </div>
                        <input className="sora-slider" type="range" min="1" max="20" step="0.5" value={cfgScale} onChange={(e)=>setCfgScale(e.target.value)} />
                        <small>Adherencia al texto (Recomendado 7.5)</small>
                    </div>
                    
                    <div className="control-group">
                        <label>Agendador de Muestreo (Sampler)</label>
                        <select value={sampler} onChange={(e)=>setSampler(e.target.value)}>
                            <option>DPM++ 2M SDE Karras</option>
                            <option>Euler a</option>
                            <option>DDIM</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Semilla (Seed)</label>
                        <div className="seed-input-wrapper">
                            <input type="number" className="sora-input" value={seed} onChange={(e)=>setSeed(e.target.value)} />
                            <button className="btn-icon" onClick={()=>setSeed(-1)}>🎲</button>
                        </div>
                        <small>-1 para aleatorio.</small>
                    </div>
                    
                    <div className="control-group switch-group">
                        <div className="switch-text">
                            <label>Upscaler Automático</label>
                            <small>Multipase a 4K (Post-Proceso)</small>
                        </div>
                        <label className="sora-switch">
                            <input type="checkbox" checked={upscale} onChange={(e)=>setUpscale(e.target.checked)} />
                            <span className="sora-slider-toggle"></span>
                        </label>
                    </div>
                </aside>

                {/* Centro: Canva y Prompts */}
                <section className="sora-canvas">
                    <div className="canvas-header">
                        <h2>Workspace de Generación</h2>
                        <div className="hardware-metrics">
                            <span>VRAM: <strong className="vram-green">24 / 96 GB</strong></span>
                            <span>TEMP: <strong>55°C</strong></span>
                        </div>
                    </div>

                    <div className="prompt-container panel-glass">
                        <label className="sora-label green-label">Comando de Directrices (Prompt)</label>
                        <textarea 
                            className="sora-textarea" 
                            placeholder="Ej. Cinematic shot of Godzilla drinking coffee in neon Tokyo..."
                            value={prompt}
                            onChange={(e)=>setPrompt(e.target.value)}
                        />
                    </div>

                    <div className="prompt-container panel-glass negative">
                        <label className="sora-label red-label">Contexto Excluido (Negative Prompt)</label>
                        <textarea 
                            className="sora-textarea" 
                            value={negativePrompt}
                            onChange={(e)=>setNegativePrompt(e.target.value)}
                        />
                    </div>

                    <div className="action-bar">
                        <button 
                            className={`sora-main-btn ${status === 'RENDERING' || status === 'CONNECTING' ? 'disabled' : ''}`}
                            onClick={handleGenerate}
                            disabled={status === 'RENDERING' || status === 'CONNECTING'}
                        >
                            {status === 'RENDERING' ? 'PROCESANDO TENSORES...' : 'INICIALIZAR RENDER SECUENCIAL'}
                        </button>
                    </div>

                   {/* Terminal Log */}
                   <div className="sora-terminal panel-glass">
                        <div className="terminal-header">
                            <div className="term-dots"><i></i><i></i><i></i></div>
                            <span>CLUSTER CONSOLE</span>
                        </div>
                        <div className="terminal-body" id="term-body">
                            {logs.map((L, i) => <div key={i} className="term-line">{L}</div>)}
                            {status === 'RENDERING' && (
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{width: `${(progress/diffusionSteps)*100}%`}}></div>
                                </div>
                            )}
                        </div>
                    </div>

                </section>
                
                {/* Derecha: Media Salida (Próximamente) */}
                <aside className="sora-preview panel-glass">
                    <div className="panel-header">
                        <h2>Monitor de Salida</h2>
                        <div className="preview-tools">
                            <button className="btn-icon">⬇</button>
                            <button className="btn-icon">⤢</button>
                        </div>
                    </div>
                    
                    <div className="video-player-mock">
                        {status === 'DONE' ? (
                            <>
                                <video 
                                    className="video-player-placeholder" 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline
                                    src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                                />
                                <div className="fake-video-overlay">
                                    <h3>Render Completado</h3>
                                    <p>Este es un render simulado de demostración. La conexión al GPU físico está preparada.</p>
                                </div>
                            </>
                        ) : status === 'RENDERING' ? (
                            <div className="loader-container">
                                <div className="spinner-glow"></div>
                                <p>Sintetizando Parches de Espacio-Tiempo...</p>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span>Esperando Comando...</span>
                            </div>
                        )}
                    </div>
                </aside>

            </main>
        </div>
    );
}
