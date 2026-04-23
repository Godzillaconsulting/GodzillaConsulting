const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage();
  page.on('pageerror', err => {
      console.log('CRITICAL PAGE ERROR:', err.toString());
  });
  page.on('console', msg => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  await page.goto('https://godzillaconsulting.ai/admin', {waitUntil: 'networkidle2'});
  
  console.log('Page loaded. Clicking all buttons...');
  const buttons = await page.$$('button');
  for (let btn of buttons) {
      try {
        await btn.click();
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {}
  }
  console.log('Done testing buttons.');
  await browser.close();
})();
