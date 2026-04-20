const { execSync } = require('child_process');

try {
    const output = execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine', { encoding: 'utf-8' });
    const lines = output.split('\n');
    let killed = 0;
    for (const line of lines) {
        if (line.includes('--headless') || line.includes('puppeteer') || line.includes('.wwebjs_auth') || line.includes('GodzillaConsulting')) {
            const match = line.match(/\s+(\d+)\s*$/);
            if (match) {
                const pid = match[1];
                try {
                    execSync(`taskkill /F /PID ${pid} /T`);
                    console.log(`Killed zombie Chrome PID: ${pid}`);
                    killed++;
                } catch(e) {}
            }
        }
    }
    console.log(`Total zombie process trees killed: ${killed}`);
} catch(e) {
    console.error(e);
}
