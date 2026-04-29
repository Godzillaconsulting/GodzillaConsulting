import { runTrendsScraper } from './server/trendsBot.js';
console.log('Forcing Trends Scraper execution for today...');
runTrendsScraper().then(() => {
    console.log('Finished executing trends scraper.');
    setTimeout(() => process.exit(0), 5000);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
