import es from './src/locales/es.json' with { type: 'json' };
import en from './src/locales/en.json' with { type: 'json' };

console.log('es.landing.packages exists:', !!(es.landing && es.landing.packages));
console.log('en.landing.packages exists:', !!(en.landing && en.landing.packages));
