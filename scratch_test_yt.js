import ytSearch from 'yt-search';

async function test() {
    const query = 'no copyright lofi chill background';
    console.log("Searching for:", query);
    try {
        const r = await ytSearch(query);
        console.log("Total videos found:", r.videos.length);
        if (r.videos.length > 0) {
            const v = r.videos[0];
            console.log("Keys in video object:", Object.keys(v));
            console.log("First video:", {
                title: v.title,
                url: v.url,
                seconds: v.seconds,
                duration: v.duration,
                timestamp: v.timestamp
            });
        }
    } catch (err) {
        console.error(err);
    }
}
test();
