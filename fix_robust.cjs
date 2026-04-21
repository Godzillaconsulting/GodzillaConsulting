const fs = require('fs');

function fixFile(file, badStr, goodStr) {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + file;
    let t = fs.readFileSync(p, 'utf8');
    if (t.includes(badStr)) {
        t = t.replace(badStr, goodStr);
        fs.writeFileSync(p, t, 'utf8');
        console.log('Fixed ' + file);
    } else {
        console.log('Did not find badStr in ' + file);
        // Maybe it has two backslashes? let's try another
        let badStr2 = badStr.replace('")','\\\\"'); // try to match the broken \\" if it exists
        if (t.includes(badStr2)) {
             t = t.replace(badStr2, goodStr);
             fs.writeFileSync(p, t, 'utf8');
             console.log('Fixed Double-backslash in ' + file);
        }
    }
}

fixFile('ProduccionAudiovisual.jsx', 
        'content.accDesc1 || "Guiones diseñados con el \\")Epiphany Bridge\\" para conectar emocionalmente." },', 
        'content.accDesc1 || "Guiones diseñados con el \\"Epiphany Bridge\\" para conectar emocionalmente.") },');

// In case the file literally has `diseAados` due to earlier powershell saves or something (which it shouldn't because we restored from git)
// Let's do a more robust replace that just targets the end of the line:
function fixRobust(file, expectedQuoteKeyword) {
    let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + file;
    let t = fs.readFileSync(p, 'utf8');
    let lines = t.split('\n');
    let changed = false;
    for(let i=0; i<lines.length; i++) {
        if (lines[i].includes(expectedQuoteKeyword)) {
            // Find start of content.accDesc
            if (lines[i].includes('content.accDesc')) {
                // If it ends with `" },` or `.' },` or whatever but missing `)`
                if (lines[i].endsWith(' },') && !lines[i].endsWith(') },')) {
                    lines[i] = lines[i].replace(/ \},$/, ') },');
                }
                
                // Fix the quotes themselves
                // If it has \")Keyword
                lines[i] = lines[i].replace(/\\"\)/g, '\\"');
                // If it has \\"Keyword
                lines[i] = lines[i].replace(/\\\\"/g, '\\"');
                
                changed = true;
            }
        }
        
        // Also check if any other line is unexpectedly missing a closing parenthesis at the end for accDesc
        if (lines[i].includes('content.accDesc') && lines[i].endsWith(' },') && !lines[i].endsWith(') },')) {
           lines[i] = lines[i].replace(/ \},$/, ') },');
           changed = true;
        }
        // Also check if accTitle missing closing parenthesis
        if (lines[i].includes('content.accTitle') && lines[i].includes(', desc:')) {
           // Ensure title default value group is closed
           // We know it looks like `(content.accTitle1 || "Text", desc:` which is missing a `)` before `, desc:`
           if (lines[i].includes('", desc:') && !lines[i].includes('"), desc:')) {
               lines[i] = lines[i].replace(/", desc:/g, '"), desc:');
               changed = true;
           }
        }
    }
    if (changed) {
        fs.writeFileSync(p, lines.join('\n'), 'utf8');
        console.log('Robustly fixed ' + file);
    }
}

fixRobust('ProduccionAudiovisual.jsx', 'Epiphany');
fixRobust('EmbudosDeVenta.jsx', 'Soap Opera');
fixRobust('GestionRedesSociales.jsx', 'Dream 100');
fixRobust('Bots.jsx', 'xyz');
fixRobust('OptimizacionWebSeo.jsx', 'xyz');
fixRobust('CrmSaas.jsx', 'xyz');

console.log('All done');
