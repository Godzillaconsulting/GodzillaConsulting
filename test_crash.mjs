import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://godzillaconsulting.ai/?lng=en', { waitUntil: 'networkidle2' });
        
        const errorText = await page.evaluate(() => {
            const el = document.querySelector('div[style*=\"background: red\"]');
            return el ? el.innerText : null;
        });
        
        console.log('CLIENT ERROR:', errorText);
        
        const content = await page.content();
        console.log('PAGE HAS REACT ROOT?', content.includes('id=\"root\"') && !content.includes('data-reactroot')); // simplified check
        
        await browser.close();
    } catch(e) {
        console.error('Fatal', e);
    }
})();
