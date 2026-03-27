import fs from 'fs';

let c = fs.readFileSync('src/components/AdminStudio.jsx', 'utf8');

c = c.replace(/import AnalyticsDashboard from '\.\/AnalyticsDashboard';/,
  `import AnalyticsDashboard from './AnalyticsDashboard';\nimport CorreosInbox from './CorreosInbox';`);

const regex = /\{\/\* ══ TAB CORREOS \(RECURSOS\) ══ \*\/\}[\s\S]*?\{\/\* ══ TAB COLORES ══ \*\/\}/;
const replacement = `{/* ══ TAB CORREOS (RECURSOS) ══ */}
 {activeTab === 'correos' && selectedNodeId === 'recursos' && (
    <CorreosInbox draftData={draftData} change={change} />
 )}

 {/* ══ TAB COLORES ══ */}`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/components/AdminStudio.jsx', c);
console.log('AdminStudio patched!');
