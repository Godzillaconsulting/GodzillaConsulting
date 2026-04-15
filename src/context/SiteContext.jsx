import React, { createContext, useContext, useState, useEffect } from 'react';
import { injectSectionDefaults } from '../utils/studioConfig';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preview override: permite al AdminStudio inyectar draftData en tiempo real
  // { nodeId: string, data: object } | null
  const [previewOverride, setPreviewOverrideState] = useState(null);

  // Load all nodes with retry logic for Neon DB cold starts
  const fetchNodes = async (retries = 3) => {
    try {
      if (retries === 3) setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s límite máximo absoluto

      const res = await fetch(import.meta.env.DEV ? 'http://localhost:3000/api/nodes' : '/api/nodes?t=' + new Date().getTime(), {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
          throw new Error('Servidor retornó ' + res.status);
      }
      
      const data = await res.json();
      setNodes(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching nodes:', err);
      setLoading(false); // FAILSAFE: Si el túnel de Vercel/PM2 cae, abortar la pantalla de carga para mostrar valores por defecto
      
      if (retries > 0) {
          console.warn(`Reintentando conexión a base de datos... quedan ${retries} intentos`);
          setTimeout(() => fetchNodes(retries - 1), 1500); // Darle tiempo a Neon DB de despertar (silencioso)
      }
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // Devuelve datos del nodo. Si hay un previewOverride activo para ese ID,
  // devuelve el draft (en tiempo real) en lugar del published_data.
  const getNodeData = (id) => {
    if (previewOverride && previewOverride.nodeId === id) {
      return previewOverride.data;
    }
    const nodesArray = Array.isArray(nodes) ? nodes : [];
    const node = nodesArray.find(n => n.id === id);
    if (!node || !node.published_data) return null;
    return injectSectionDefaults(id, node.published_data);
  };

  // Llamado por AdminStudio al seleccionar un nodo y editar el draft
  const setPreviewOverride = (nodeId, data) => {
    setPreviewOverrideState(nodeId && data ? { nodeId, data } : null);
  };

  return (
    <SiteContext.Provider value={{ nodes, loading, getNodeData, fetchNodes, setPreviewOverride }}>
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteData = () => useContext(SiteContext);
