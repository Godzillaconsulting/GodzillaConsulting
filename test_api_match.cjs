async function compare() {
    try {
        const resLocal = await fetch('http://localhost:3000/api/nodes');
        const nodesLocal = await resLocal.json();
        
        const resRemote = await fetch('https://godzillaconsulting.ai/api/nodes');
        const nodesRemote = await resRemote.json();
        
        const strLocal = JSON.stringify(nodesLocal);
        const strRemote = JSON.stringify(nodesRemote);
        
        console.log("Local API Hash (Length): ", strLocal.length);
        console.log("Remote API Hash (Length): ", strRemote.length);
        
        if (strLocal === strRemote) {
            console.log("✅ THE TWO APIS MATCH EXACTLY. NO CACHE OR DATABASE MISMATCH.");
        } else {
            console.log("❌ APIS DO NOT MATCH. REMOTE HAS CACHED OR DIFFERENT DATA!");
            console.log("Does remote contain Vercel Blob URLs? ", strRemote.includes('vercel-storage.com'));
        }
    } catch (e) {
        console.error("Error connecting to APIs", e.message);
    }
}
compare();
