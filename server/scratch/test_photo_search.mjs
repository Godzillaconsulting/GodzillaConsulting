import fetch from 'node-fetch';

async function searchRealPhoto(query) {
    try {
        console.log(`🔎 Buscando imagen relevante para: "${query}"...`);
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|size&format=json`;
        const res = await fetch(searchUrl, { timeout: 10000 });
        const data = await res.json();
        const pages = data?.query?.pages;
        if (pages) {
            for (const key of Object.keys(pages)) {
                const imgInfo = pages[key]?.imageinfo?.[0];
                if (imgInfo && imgInfo.url && (imgInfo.url.endsWith('.jpg') || imgInfo.url.endsWith('.png') || imgInfo.url.endsWith('.jpeg'))) {
                    console.log(`   ✅ Encontrada imagen Wikimedia real: ${imgInfo.url}`);
                    return imgInfo.url;
                }
            }
        }
    } catch(e) {
        console.log(`   ⚠️ Wikimedia search error: ${e.message}`);
    }
    
    // Fallback: Unsplash Curated por temática específica
    const kwMap = {
        nvidia: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&h=1350&q=80',
        apple: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1080&h=1350&q=80',
        openai: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1080&h=1350&q=80',
        cybersecurity: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1080&h=1350&q=80',
        cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1080&h=1350&q=80'
    };

    const qLower = query.toLowerCase();
    for (const [key, url] of Object.entries(kwMap)) {
        if (qLower.includes(key)) {
            console.log(`   🎯 Foto de alta relevancia encontrada para [${key}]: ${url}`);
            return url;
        }
    }

    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1080&h=1350&q=80';
}

searchRealPhoto('NVIDIA Alpamayo 2 Super Robotaxi');
searchRealPhoto('Apple vs OpenAI Lawsuit');
searchRealPhoto('Cybersecurity AI West Florida University');
