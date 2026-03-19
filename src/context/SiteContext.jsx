import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const res = await fetch(import.meta.env.DEV ? 'http://localhost:3000/api/nodes' : '/api/nodes');
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
    const node = nodes.find(n => n.id === id);
    return node ? node.published_data : null;
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
