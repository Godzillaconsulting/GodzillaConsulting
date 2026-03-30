const fs = require('fs');
const path = require('path');

function removeTransforms(dir) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
    let changedFiles = 0;
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('uppercase') || content.includes('capitalize') || content.includes('lowercase')) {
            // Reemplaza las clases de className="..." o className={'...'} 
            // Esto es básico, reemplazaremos las palabras 'uppercase', 'capitalize', 'lowercase' directamente.
            
            const newContent = content
                .replace(/\buppercase\b/g, '')
                .replace(/\bcapitalize\b/g, '')
                .replace(/\blowercase\b/g, '')
                .replace(/ {2,}/g, ' ') // limpiar espacios extra generados
                .replace(/className=(['"])\s+/g, 'className=$1')
                .replace(/\s+(['"])/g, '$1');
                
            if (content !== newContent) {
                fs.writeFileSync(filePath, newContent, 'utf8');
                changedFiles++;
                console.log('Updated ' + file);
            }
        }
    });
    console.log('Changed ' + changedFiles + ' files in ' + dir);
}

// Apply to local clone
removeTransforms('c:/Users/jesus/GodzillaConsulting/src/components');
// Apply to origin repo
removeTransforms('d:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components');
