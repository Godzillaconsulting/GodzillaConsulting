import React, { useState, useEffect } from 'react';

export default function DBStudioPanel() {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [queryMode, setQueryMode] = useState(false);
    const [rawQuery, setRawQuery] = useState('SELECT * FROM admins\nLIMIT 50;');
    
    const [data, setData] = useState({ rows: [], fields: [], timeMs: null, command: null, rowCount: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const token = localStorage.getItem('adminToken');
    const API_BASE = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');

    // Cargar lista de tablas al inicio
    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/db-studio/tables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setTables(json.tables);
                if (json.tables.length > 0 && !selectedTable) {
                    loadTable(json.tables[0]);
                }
            } else {
                setError(json.error || 'Error cargando tablas');
            }
        } catch (err) {
            setError('Fallo de red al conectar al DB Studio');
        }
    };

    const loadTable = async (tableName) => {
        setQueryMode(false);
        setSelectedTable(tableName);
        setLoading(true);
        setError(null);
        setData({ rows: [], fields: [], timeMs: null });
        try {
            const res = await fetch(`${API_BASE}/api/db-studio/tables/${tableName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setData({ rows: json.rows, fields: json.fields, timeMs: json.timeMs });
            } else {
                setError(json.error);
            }
        } catch (err) {
            setError('Error de carga');
        } finally {
            setLoading(false);
        }
    };

    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        setData({ rows: [], fields: [], timeMs: null, command: null, rowCount: null });
        try {
            const res = await fetch(`${API_BASE}/api/db-studio/query`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ query: rawQuery })
            });
            const json = await res.json();
            if (json.success) {
                setData({ 
                    rows: json.rows || [], 
                    fields: json.fields || [], 
                    timeMs: json.timeMs,
                    command: json.command,
                    rowCount: json.rowCount
                });
            } else {
                setError(`[${json.position ? 'Pos: ' + json.position : 'SQL Error'}] ${json.error}`);
            }
        } catch (err) {
            setError('Network timeout o error de fetch');
        } finally {
            setLoading(false);
        }
    };

    const predefinedQueries = {
        'Ver Unified_Chats': "SELECT * FROM unified_chats ORDER BY updated_at DESC LIMIT 100;",
        'Agrupar Neuronas': "SELECT platform, COUNT(*) as count FROM neurons GROUP BY platform;",
        'Ver Admins': "SELECT id, username, role, is_superadmin, created_at FROM admins;",
        'Truncar (Peligro)': "TRUNCATE TABLE nombre_tabla RESTART IDENTITY CASCADE;"
    };

    return (
        <div className="flex w-full h-full bg-[#0a0a0a] text-neutral-300 font-mono text-sm border-l border-red-900/30 overflow-hidden">
            {/* PANEL LATERAL: Explorador de Tablas (Neon Style) */}
            <div className="w-64 flex flex-col bg-black border-r border-red-900/40 shrink-0">
                <div className="p-4 border-b border-red-900/40 bg-[#CC0000]/10 flex items-center gap-2">
                    <span className="text-xl">🗄️</span>
                    <h2 className="font-sans font-black text-white tracking-widest uppercase">Godzilla DB</h2>
                </div>
                
                <div className="p-3">
                    <button 
                        onClick={() => { setQueryMode(true); setSelectedTable(null); }}
                        className={`w-full py-2.5 rounded hover:bg-[#CC0000]/20 hover:text-white transition-all text-xs font-bold border border-transparent flex items-center justify-center gap-2 ${queryMode ? 'bg-[#CC0000]/20 text-[#CC0000] border-[#CC0000]/50' : 'bg-neutral-900 text-neutral-400'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        SQL Editor
                    </button>
                </div>

                <div className="px-3 pb-2 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2 px-1">Tablas Públicas</div>
                    <div className="space-y-0.5">
                        {tables.map(t => (
                            <button 
                                key={t} 
                                onClick={() => loadTable(t)}
                                className={`w-full text-left px-3 py-1.5 rounded transition-all text-sm flex items-center gap-2 truncate ${selectedTable === t && !queryMode ? 'bg-[#CC0000]/10 text-white font-bold border-l-2 border-[#CC0000]' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: Visor + Editor */}
            <div className="flex-1 flex flex-col min-w-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(204,0,0,0.05), transparent 40%)' }}>
                
                {queryMode && (
                    <div className="flex flex-col border-b border-red-900/30 p-4 bg-neutral-900/50 backdrop-blur shrink-0 z-10 transition-all shadow-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-neutral-400">⚡ Consola SQL Directa (Bypass)</span>
                            <div className="flex gap-2">
                                {Object.entries(predefinedQueries).map(([name, sql]) => (
                                    <button 
                                        key={name}
                                        onClick={() => setRawQuery(sql)}
                                        className="text-[10px] px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <textarea
                                value={rawQuery}
                                onChange={e => setRawQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.ctrlKey && e.key === 'Enter') executeQuery();
                                }}
                                spellCheck={false}
                                className="w-full h-32 bg-[#050505] text-[#CC0000] p-4 rounded-xl border border-red-900/50 focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] focus:outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder="Escribe tu consulta PostgreSQL aquí..."
                            />
                            <div className="absolute bottom-3 right-3 flex items-center gap-3">
                                <span className="text-[10px] text-neutral-600">Ctrl + Enter</span>
                                <button 
                                    onClick={executeQuery}
                                    disabled={loading}
                                    className="px-5 py-2 bg-[#CC0000] hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-[0_2px_10px_rgba(204,0,0,0.5)] transition"
                                >
                                    {loading ? 'Corriendo...' : '► Ejecutar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISOR DE TABLA (Grilla) */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-black/40 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-white">
                                {queryMode ? 'Resultados SQL' : selectedTable ? `Tabla: ${selectedTable}` : 'Esperando...'}
                            </span>
                            {data.timeMs && (
                                <span className="text-[10px] bg-neutral-800 text-green-400 px-2 py-0.5 rounded-full border border-neutral-700">
                                    {data.timeMs} ms
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-neutral-500">
                            {data.command ? `Comando: ${data.command} (${data.rowCount} afectadas)` : data.rows?.length !== undefined ? `${data.rows.length} Filas obtenidas` : ''}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4 relative custom-scrollbar">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur z-20">
                                <div className="text-[#CC0000] font-black tracking-widest animate-pulse">PROCESANDO...</div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="p-4 bg-red-900/20 border border-[#CC0000]/50 rounded-xl text-red-400 mb-4 font-mono text-sm whitespace-pre-wrap">
                                ❌ {error}
                            </div>
                        )}

                        {!error && data.command && data.command !== 'SELECT' && (
                            <div className="p-4 bg-green-900/10 border border-green-500/30 rounded-xl text-green-400 text-center font-bold">
                                ✅ Operación {data.command} ejecutada exitosamente. ({data.rowCount} filas afectadas)
                            </div>
                        )}

                        {!error && (!data.command || data.command === 'SELECT') && data.rows && data.rows.length > 0 && (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#CC0000]/5 backdrop-blur-md shadow-sm z-10">
                                    <tr>
                                        {data.fields.map((f, i) => (
                                            <th key={i} className="py-2 px-4 text-[10px] font-bold text-[#CC0000] uppercase tracking-wider border-b border-red-900/30 whitespace-nowrap">
                                                {f}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-neutral-900 hover:text-white transition-colors border-b border-neutral-900/50">
                                            {data.fields.map((f, cIdx) => {
                                                let cellData = row[f];
                                                if (typeof cellData === 'object' && cellData !== null) {
                                                    cellData = JSON.stringify(cellData);
                                                }
                                                return (
                                                    <td key={cIdx} className="py-2 px-4 whitespace-nowrap max-w-[200px] truncate text-xs" title={cellData}>
                                                        {cellData === null ? <span className="text-neutral-600 italic">null</span> : String(cellData)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {!error && (!data.command || data.command === 'SELECT') && data.rows && data.rows.length === 0 && !loading && (
                            <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
                                No se encontraron registros.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
