import ytSearch from 'yt-search';

async function test() {
    const queries = [
        'no copyright lofi chill background',
        'NCS release',
        'royalty free background music upbeat 3 minutes',
        'lofi beats no copyright track'
    ];
    for (const q of queries) {
        console.log("\n--- Searching for:", q);
        try {
            const r = await ytSearch(q);
            console.log("Found videos:", r.videos.length);
            r.videos.slice(0, 5).forEach((v, idx) => {
                console.log(`${idx+1}. Title: ${v.title} | Duration: ${v.timestamp} (${v.seconds}s)`);
            });
        } catch (err) {
            console.error(err);
        }
    }
}
test();
