import fs from 'fs';
const file = 'src/components/Recursos.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/let slug = '';\s+if \(activeItem\?\.orden === 1 \|\| activeItem\?\.id === 1\) slug = 'prompts-ia-marketing';\s+else if \(activeItem\?\.orden === 2 \|\| activeItem\?\.id === 2\) slug = 'leads-whatsapp';\s+else if \(activeItem\?\.orden === 3 \|\| activeItem\?\.id === 3\) slug = 'crm-template';/,
`let slug = \`recurso\${activeItem?.id || activeItem?.orden || 1}\`;`);

c = c.replace(/let fileName = '';\s+if \(activeItem\?\.orden === 1 \|\| activeItem\?\.id === 1\) fileName = 'prompts-ia\.pdf';\s+else if \(activeItem\?\.orden === 2 \|\| activeItem\?\.id === 2\) fileName = 'whatsapp-guia\.pdf';\s+else if \(activeItem\?\.orden === 3 \|\| activeItem\?\.id === 3\) fileName = 'crm-template\.xlsx';/,
`let fileName = nodeData[\`\${slug}FileUrl\`] || '';`);

c = c.replace(/if \(fileName\) \{\s+const link = document\.createElement\('a'\);\s+link\.href = `\/lead-magnets\/\$\{fileName\}`;\s+link\.download = fileName;\s+document\.body\.appendChild\(link\);\s+link\.click\(\);\s+document\.body\.removeChild\(link\);\s+\}/,
`if (fileName) {
                                        if (fileName.startsWith('http')) {
                                            window.open(fileName, '_blank');
                                        } else {
                                            const link = document.createElement('a');
                                            link.href = fileName.startsWith('/') ? fileName : \`/lead-magnets/\${fileName}\`;
                                            link.download = fileName.split('/').pop() || 'recurso.pdf';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }
                                    }`);

fs.writeFileSync(file, c);
console.log("Recursos.jsx patched successfully!");
