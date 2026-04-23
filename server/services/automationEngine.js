import pool from '../config/db.js';
import fetch from 'node-fetch';

class AutomationEngine {
    /**
     * Dispara la ejecución de un flujo a partir de un nodo de origen.
     * @param {string} sourceTitle El nombre exacto de la caja de origen (ej. 'Planificador IA')
     * @param {object} payload Los datos JSON que se pasarán a través de la tubería
     */
    static async triggerFlow(sourceTitle, payload) {
        try {
            console.log(`[AutomationEngine] Buscando rutas activas para: ${sourceTitle}`);
            
            // 1. Cargar el grafo guardado
            const result = await pool.query('SELECT nodes, edges FROM automation_flow WHERE id = 1');
            if (result.rows.length === 0) {
                console.log('[AutomationEngine] Grafo vacío. No hay automatizaciones.');
                return;
            }
            
            const nodes = result.rows[0].nodes || [];
            const edges = result.rows[0].edges || [];

            // 2. Encontrar el/los nodos de origen que coincidan con el Título
            const sourceNodes = nodes.filter(n => n.title === sourceTitle);
            if (sourceNodes.length === 0) {
                console.log(`[AutomationEngine] Ningún nodo de origen encontrado con título: ${sourceTitle}`);
                return;
            }

            // 3. Rastrear conexiones (Caminos hacia adelante)
            // Para cada nodo origen, buscar a dónde están conectados
            for (const sNode of sourceNodes) {
                const outEdges = edges.filter(e => e.source === sNode.id);
                for (const edge of outEdges) {
                    const targetNode = nodes.find(n => n.id === edge.target);
                    if (targetNode) {
                        await this.executeNodeAction(targetNode, payload);
                    }
                }
            }

        } catch (err) {
            console.error('[AutomationEngine] Error crítico durante la ejecución:', err.message);
        }
    }

    /**
     * Ejecuta la acción dictada por la configuración del nodo de destino.
     */
    static async executeNodeAction(node, payload) {
        console.log(`[AutomationEngine] ⚡ Ejecutando Nodo Destino: ${node.title} (${node.type})`);

        try {
            // Caso 1: Webhook Externo (Make, n8n, Zapier)
            if (node.webhook_url) {
                console.log(`[AutomationEngine] 🌐 Lanzando POST a Webhook Externo: ${node.webhook_url}`);
                const response = await fetch(node.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    console.log(`[AutomationEngine] ✅ POST Exitoso a ${node.title}`);
                } else {
                    console.error(`[AutomationEngine] ❌ Fallo al hacer POST a ${node.title}: ${response.statusText}`);
                }
            } 
            // Caso 2: Acción interna (Aquí se pueden agregar llamadas a PM2 o a otras rutinas internas de Godzilla)
            else if (node.pm2_process) {
                 console.log(`[AutomationEngine] 🤖 Señal interna detectada para PM2 Process: ${node.pm2_process}`);
                 // Podríamos enviar un Webhook local a otro puerto, etc.
                 // Por ahora solo lo registramos, ya que PM2 es monitoreado pasivamente.
            } else {
                console.log(`[AutomationEngine] ⚠️ Nodo ${node.title} no tiene webhook_url ni configuración accionable.`);
            }
        } catch (err) {
            console.error(`[AutomationEngine] Error ejecutando acción de nodo ${node.title}:`, err.message);
        }
    }
}

export default AutomationEngine;
