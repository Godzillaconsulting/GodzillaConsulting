import React, { createContext, useContext, useState, useEffect } from 'react';
import { injectSectionDefaults } from '../utils/studioConfig';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preview override: permite al AdminStudio inyectar draftData en tiempo real
  // { nodeId: string, data: object } | null
  const [previewOverride, setPreviewOverrideState] = useState(null);

  // Load all nodes
  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await fetch(import.meta.env.DEV ? 'http://localhost:3000/api/nodes' : '/api/nodes', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await res.json();
      setNodes(data);
    } catch (err) {
      console.error('Error fetching nodes:', err);
    } finally {
      setLoading(false);
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
