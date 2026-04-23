const fs = require('fs');
let code = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');

const targetStr1 = "fetch(`/api/automation/flow?id=${flowId}`, { headers:{ Authorization:`Bearer ${token}` } })";
const targetStr2 = ".then(r => r.json()).then(d => { if(d.success){ setNodes(d.nodes||[]); setEdges(d.edges||[]); if(d.name) setEditName(d.name); } })";

const replacementStr2 = `.then(r => r.json()).then(d => { 
        if(d.success){ 
          if (d.name === 'Sistema Central' || flowId === 'central') {
            setNodes(FLOW_TEMPLATES[0].nodes);
            setEdges(FLOW_TEMPLATES[0].edges);
          } else {
            setNodes(d.nodes||[]); 
            setEdges(d.edges||[]); 
          }
          if(d.name) setEditName(d.name); 
        } 
      })`;

code = code.replace(targetStr2, replacementStr2);

// Also intercept the main Galaxy view:
const targetGalaxy1 = "if (fd.success) setFlows(fd.flows || []);";
const replaceGalaxy1 = `if (fd.success) {
        const mappedFlows = (fd.flows || []).map(flow => {
          if (flow.name === 'Sistema Central' || flow.id === 'central') {
            return { ...flow, nodes: FLOW_TEMPLATES[0].nodes, edges: FLOW_TEMPLATES[0].edges };
          }
          return flow;
        });
        setFlows(mappedFlows);
      }`;
code = code.replace(targetGalaxy1, replaceGalaxy1);

fs.writeFileSync('src/components/AutomationFlow.jsx', code);
