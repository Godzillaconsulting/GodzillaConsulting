import dotenv from 'dotenv';
dotenv.config({ path: '../server/.env' });

async function testFB() {
    const token = process.env.PAGE_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v19.0/me/feed?fields=id,message,permalink_url,created_time,likes.summary(true),comments.summary(true)&limit=5&access_token=${token}`;
    console.log("Testing FB...");
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}

async function testIG() {
    // Para sacar posts de IG desde Graph API, necesitamos el instagram_business_account del Page
    const token = process.env.PAGE_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account{media{id,caption,media_url,permalink,like_count,comments_count}}&access_token=${token}`;
    console.log("\nTesting IG via Facebook Account...");
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}

async function testTikTok() {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    const url = `https://open.tiktokapis.com/v2/video/list/?fields=id,title,share_url,like_count,comment_count,view_count`;
    console.log("\nTesting TikTok...");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ max_count: 5 })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}

async function run() {
    await testFB();
    await testIG();
    await testTikTok();
}

run();
