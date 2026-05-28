async function testTranslate() {
    const text = "¡La Máquina hace historia! El Cruz Azul es el nuevo campeón.";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    
    console.log(`Testing translation fetch to: ${url}...`);
    try {
        const res = await fetch(url);
        console.log(`Responded status: ${res.status}`);
        if (res.ok) {
            const json = await res.json();
            const translation = json[0].map(x => x[0]).join('');
            console.log("Translation result:", translation);
        } else {
            const errText = await res.text();
            console.log("Error response:", errText);
        }
    } catch (e) {
        console.error("Failed:", e.message);
    }
}
testTranslate();
