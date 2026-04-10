import fetch from 'node-fetch';

async function run() {
    console.log("Scraping TikTok...");
    try {
        const res = await fetch('https://www.tiktok.com/@godzillaconsulting', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            }
        });
        const text = await res.text();
        
        // TikTok has changed its state injection over time. We can try to regex the item list or SIGI_STATE
        const sigiMatch = text.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
        const uniMatch = text.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([^<]+)<\/script>/);
        
        if (uniMatch) {
            console.log("Found UNIVERSAL_DATA");
            const data = JSON.parse(uniMatch[1]);
            const userDetail = data.__DEFAULT_SCOPE__['webapp.user-detail'];
            if(userDetail && userDetail.userInfo) {
                console.log("Found User!", userDetail.userInfo.user.nickname);
            }
        } else if (sigiMatch) {
            console.log("Found SIGI_STATE");
        } else {
            console.log("No state script found, tiktok blocked fetch.");
            // check if there's any hint of videos
            const videoLinks = text.match(/https:\/\/www\.tiktok\.com\/@[^/]+\/video\/\d+/g);
            console.log("Video links:", videoLinks ? [...new Set(videoLinks)] : null);
        }
    } catch(e) {
        console.error(e);
    }
}
run();
