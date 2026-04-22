import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { injectSectionDefaults } from '../utils/studioConfig';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preview override: permite al AdminStudio inyectar draftData en tiempo real
  // { nodeId: string, data: object } | null
  const [previewOverride, setPreviewOverrideState] = useState(null);

  // Load all nodes with retry logic for API cold starts
  const fetchNodes = useCallback(async (retries = 3, silent = false) => {
    try {
      if (retries === 3 && !silent) setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s límite máximo absoluto

      const lng = i18n.resolvedLanguage ? i18n.resolvedLanguage.split('-')[0].toLowerCase() : 'es';
      const devUrl = `http://localhost:3000/api/nodes?lng=${lng}`;
      const prodUrl = `/api/nodes?t=${new Date().getTime()}&lng=${lng}`;
      const res = await fetch(import.meta.env.DEV ? devUrl : prodUrl, {
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
          setTimeout(() => fetchNodes(retries - 1), 1500); // Darle tiempo a la DB de despertar (silencioso)
      }
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    // Refresh nodes silently when language changes so we don't trigger the global Loading screen
    const handleLngChange = () => fetchNodes(3, true);
    i18n.on('languageChanged', handleLngChange);
    return () => i18n.off('languageChanged', handleLngChange);
  }, [fetchNodes]);

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

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteData = () => useContext(SiteContext);
