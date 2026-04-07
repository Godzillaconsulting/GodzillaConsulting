import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './GodzillaSora.css';

export default function GodzillaSora() {
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("low quality, distorted, bad physics");
    const [mode, setMode] = useState("photo"); // 'photo' | 'video'
    
    // Parámetros Avanzados
    const [cfgScale, setCfgScale] = useState(7.5);
    const [diffusionSteps, setDiffusionSteps] = useState(50);
    const [sampler, setSampler] = useState('DPM++ 2M SDE Karras');
    const [seed, setSeed] = useState(-1);
    const [upscale, setUpscale] = useState(false);
    const [resolution, setResolution] = useState(mode === 'photo' ? "Ultra HDR 8K" : "1080p");
    
    // Efecto cuando cambia el modo
    useEffect(() => {
        if(mode === 'photo') setResolution("Ultra HDR 8K");
        else setResolution("1080p");
    }, [mode]);
    
    // Estado UI
    const [status, setStatus] = useState("IDLE"); // IDLE, CONNECTING, RENDERING, DONE, ERROR
    const [logs, setLogs] = useState(["[SYSTEM] Godzilla In-House Cluster Iniciado.", "[SYSTEM] GPU A100 Detectadas: 4", "[SYSTEM] Esperando Prompts..."]);
    const [progress, setProgress] = useState(0);
    const [finalMediaUrl, setFinalMediaUrl] = useState(null);
    const [recipeHistory, setRecipeHistory] = useState([]);
    const terminalEndRef = useRef(null);
    
    // Función para obtener el Diario del Master Cluster
    const fetchHistory = async () => {
        try {
            const res = await fetch("http://127.0.0.1:5000/sora-history");
            const data = await res.json();
            if (data.success) setRecipeHistory(data.history);
        } catch (e) {
            console.error("Master Node no responde al historial local.");
        }
    };

    // Refrescar historial cuando un render termine exitoso
    useEffect(() => {
        if (status === 'DONE') fetchHistory();
    }, [status]);

    // ==========================================
    // INTEGRACIÓN WEBSOCKET LOCAL HPC
    // ==========================================
    const socketRef = useRef(null);

    // Función segura para inyectar logs
    const appendLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    useEffect(() => {
        fetchHistory(); // Jalamos Diario al inicio
        // Inicializar socket al montar
        socketRef.current = io('http://127.0.0.1:5000');

        socketRef.current.on('connect', () => {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [NETWORK] Enlace WS con GPU Node establecido.`]);
        });

        socketRef.current.on('render_progress', (data) => {
            if (data.msg) {
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.msg}`]);
            }
            if (data.status) setStatus(data.status);
            if (data.step) setProgress(data.step);
            if (data.media_url) setFinalMediaUrl(data.media_url);
            if (data.error) {
                setStatus("ERROR");
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [CRITICAL] ${data.error}`]);
            }
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const handleGenerate = async () => {
        if (!prompt) {
            appendLog("[ERROR] El prompt en blanco no es válido.");
            return;
        }
        setLogs([`[${new Date().toLocaleTimeString()}] [SYSTEM] Ejecutando nueva secuencia de renderizado...`]);
        setStatus("CONNECTING");
        setFinalMediaUrl(null); // Reinicio
        appendLog(`[HTTP] Disparando Trigger de Inicialización al Python Master Node...`);
        setProgress(0); // Reinicia barra progreso
        
        try {
            // Pegar directamente al endpoint de Python Local
            const response = await fetch(`http://127.0.0.1:5000/sora-start`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: prompt,
                    negative_prompt: negativePrompt,
                    mode: mode,
                    resolution: resolution,
                    diffusion_steps: parseInt(diffusionSteps),
                    cfg_scale: parseFloat(cfgScale),
                    sampler: sampler,
                    seed: parseInt(seed),
                    upscale: upscale
                })
            });

            if (!response.ok) {
                throw new Error("El Master Cluster de Python no respondió. ¿Está corriendo godzilla_inference_bridge.py?");
            }
            
            // La respuesta POST no simula el progreso, los Sockets (render_progress) asumen la telemetría viva.
            const data = await response.json();
            appendLog(`[TASK INFO] Señal asíncrona lanzada. TASK ID: ${data.task_id}`);
            if (data.queue_position > 0) {
                appendLog(`[QUEUE] Nodo GPU ocupado. Agregado a la fila de espera. Posición: #${data.queue_position}`);
                appendLog(`[QUEUE] El render iniciará automáticamente cuando la VRAM se libere...`);
            }

        } catch (error) {
            setStatus("ERROR");
            appendLog(`[CRÍTICO] Fallo en disparo HTTP (Master Node No Responde): ${error.message}`);
        }
    };
    
    // Función de rito de Recreación
    const handleRestoreRecipe = async (taskId) => {
        if (status === 'RENDERING' || status === 'CONNECTING') return;
        setLogs([`[${new Date().toLocaleTimeString()}] [SYSTEM] Invocando Recreación de Semilla...`]);
        setStatus("CONNECTING");
        setFinalMediaUrl(null);
        setProgress(0);
        
        try {
            const response = await fetch("http://127.0.0.1:5000/sora-restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task_id: taskId })
            });
            const data = await response.json();
            if (data.queue_position > 0) {
                appendLog(`[QUEUE] Nodo GPU ocupado. Agregado a la fila de espera. Posición: #${data.queue_position}`);
            }
        } catch (e) {
            setStatus("ERROR");
            appendLog(`[CRÍTICO] Fallo en disparo de Recreación.`);
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
                        <h1>GODZILLA DIFFUSION</h1>
                        <span className="brand-subtitle">Industrial AI Asset Pipeline</span>
                    </div>
                </div>

                <div className="mode-selector" style={{display: 'flex', gap: '10px', background: '#111', padding: '5px', borderRadius: '8px', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.4)', border: '1px solid #333'}}>
                    <button 
                        onClick={() => setMode('photo')} 
                        style={{padding: '8px 20px', borderRadius: '4px', border: 'none', fontWeight: '900', cursor: 'pointer', background: mode === 'photo' ? 'linear-gradient(180deg, #ffaa00 0%, #d68700 100%)' : 'transparent', color: mode === 'photo' ? '#111' : '#888', boxShadow: mode === 'photo' ? '0 0 10px rgba(255,170,0,0.5)' : 'none', transition: '0.3s'}}
                    >
                        📸 MODO FOTO
                    </button>
                    <button 
                        onClick={() => setMode('video')} 
                        style={{padding: '8px 20px', borderRadius: '4px', border: 'none', fontWeight: '900', cursor: 'pointer', background: mode === 'video' ? 'linear-gradient(180deg, #ffaa00 0%, #d68700 100%)' : 'transparent', color: mode === 'video' ? '#111' : '#888', boxShadow: mode === 'video' ? '0 0 10px rgba(255,170,0,0.5)' : 'none', transition: '0.3s'}}
                    >
                        🎥 MODO VIDEO
                    </button>
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
                            <div ref={terminalEndRef} />
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
                        {status === 'DONE' && finalMediaUrl ? (
                            <>
                                {mode === 'photo' ? (
                                    <img 
                                        src={finalMediaUrl} 
                                        alt="Render Result" 
                                    />
                                ) : (
                                    <video 
                                        className="video-player-placeholder" 
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline
                                        src={finalMediaUrl}
                                    />
                                )}
                                <div className="fake-video-overlay">
                                    <h3>RENDER {mode === 'photo' ? 'FÓTOGRAFICO' : 'DE VIDEO'} COMPLETADO</h3>
                                    <p>Seed original y metadatos preservados.</p>
                                </div>
                            </>
                        ) : status === 'RENDERING' || status === 'CONNECTING' ? (
                            <div className="loader-container">
                                <div className="spinner-glow"></div>
                                <p>{status === 'CONNECTING' ? 'Estableciendo Enlace con Master Node...' : 'Sintetizando Matrices C++...'}</p>
                            </div>
                        ) : (
                            <div className="empty-state">EN ESPERA DE TRIGGERS</div>
                        )}
                    </div>
                    
                    {/* Caja de Recetas / Historial */}
                    <div className="recipe-history-container panel-glass">
                        <div className="panel-header">
                            <h2>LIBRETA DE RECETAS (LOCAL)</h2>
                            <span className="recipe-count">{recipeHistory.length} Registros</span>
                        </div>
                        <div className="recipe-list">
                            {recipeHistory.map((rec, i) => (
                                <div className={`recipe-card ${rec.alive ? 'alive' : 'purged'}`} key={i}>
                                    <div className="recipe-header">
                                        <span className="recipe-id">{rec.task_id}</span>
                                        <span className={`recipe-badge ${rec.alive ? 'bg-green' : 'bg-red'}`}>
                                            {rec.alive ? "ACTIVO" : "PURGADO"}
                                        </span>
                                    </div>
                                    <div className="recipe-body">
                                        <div className="recipe-stat"><strong>SEED:</strong> {rec.seed}</div>
                                        <div className="recipe-stat"><strong>MODO:</strong> {rec.mode} ({rec.steps} steps)</div>
                                        <div className="recipe-stat"><strong>FECHA:</strong> {new Date(rec.timestamp * 1000).toLocaleTimeString()}</div>
                                    </div>
                                    <div className="recipe-actions">
                                        {rec.alive && rec.url ? (
                                            <a href={rec.url} target="_blank" rel="noreferrer" className="btn-small success">VER MEDIA</a>
                                        ) : (
                                            <button 
                                                className="btn-small warning" 
                                                onClick={() => handleRestoreRecipe(rec.task_id)}
                                                disabled={status === 'RENDERING' || status === 'CONNECTING'}
                                            >
                                                RESTAURAR (RE-RENDER)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

            </main>
        </div>
    );
}
