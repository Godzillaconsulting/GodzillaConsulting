import fs from 'fs';
import path from 'path';
import pool from './config/db.js';

async function syncCentral() {
    try {
        const filePath = path.join(process.cwd(), '../src/components/AutomationFlow.jsx');
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Very basic extraction using regex, since it's a JS object array
        // We know it starts with "const FLOW_TEMPLATES = ["
        // We'll extract everything between that and "];" before "const CurvedConnector"
        
        const match = content.match(/const FLOW_TEMPLATES = \[([\s\S]*?)\];\s*\n\/\/ ─── Curved SVG/);
        if (!match) {
            console.error("Could not find FLOW_TEMPLATES.");
            process.exit(1);
        }
        
        const templatesCode = "[" + match[1] + "]";
        
        // We need to parse this JS object into JSON.
        // It has comments and unquoted keys. Let's evaluate it in a safe context.
        const sandbox = { templates: null };
        const vm = await import('vm');
        vm.createContext(sandbox);
        vm.runInContext(`templates = ${templatesCode}`, sandbox);
        
        const centralTemplate = sandbox.templates[0];
        
        console.log(`Extracted template "${centralTemplate.name}" with ${centralTemplate.nodes.length} nodes and ${centralTemplate.edges.length} edges.`);
        
        await pool.query(
            `UPDATE automation_flow SET nodes = $1, edges = $2, updated_at = NOW() WHERE id = 1`,
            [JSON.stringify(centralTemplate.nodes), JSON.stringify(centralTemplate.edges)]
        );
        
        console.log("Sistema Central successfully synchronized to database.");
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

syncCentral();
