import React, { createContext, useContext, useState, useEffect } from 'react';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all nodes
  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await fetch(import.meta.env.DEV ? 'http://localhost:3000/api/nodes' : '/api/nodes'); // Adaptativo para no crashear en Vercel
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

  // Helper to get published data for a specific node ID
  const getNodeData = (id) => {
    const node = nodes.find(n => n.id === id);
    return node ? node.published_data : null;
  };

  return (
    <SiteContext.Provider value={{ nodes, loading, getNodeData, fetchNodes }}>
      {children}
    </SiteContext.Provider>
  );
}

export const useSiteData = () => useContext(SiteContext);
