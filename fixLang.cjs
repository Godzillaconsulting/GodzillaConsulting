const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/components');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Sustituir isEng por isSpanish
  content = content.replace(
      /const isEng = i18n\.resolvedLanguage\?\.startsWith\('en'\);/g,
      "const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;"
  );

  // 2. Sustituir el operador ternario
  // Regex original a remplazar: isEng ? t('ALGO') : (nodeData.ALGO || 'DEFECTO')
  // Nuevo: isSpanish ? (nodeData.ALGO || 'DEFECTO') : t('ALGO')
  
  content = content.replace(/isEng\s*\?\s*t\(([^)]+)\)\s*:\s*\((nodeData\.[^|]+\|\|\s*[^)]+)\)/g, 'isSpanish ? ($2) : t($1)');
  content = content.replace(/isEng\s*\?\s*t\(([^)]+)\)\s*:\s*(nodeData\.[^\s]+)\s*\|\|\s*('[^']+'|"[^"]+")/g, 'isSpanish ? ($2 || $3) : t($1)');
  content = content.replace(/isEng\s*\?\s*t\(([^)]+)\)\s*:\s*\(([^)]+)\)/g, 'isSpanish ? ($2) : t($1)');
  content = content.replace(/isEng\s*\?\s*\(([^)]+)\)\s*:\s*([^>]+)/g, 'isSpanish ? $2 : ($1)');
  content = content.replace(/isEng\s*\?\s*t\(([^)]+)\)\s*:\s*('[^']+'|"[^"]+")/g, 'isSpanish ? $2 : t($1)');
  
  // Custom case for Hero
  content = content.replace(/const title = isEng \? t\('hero\.title'\) : data\.title \|\| t\('hero\.title'\);/g, "const title = isSpanish ? (data.title || t('hero.title')) : t('hero.title');");
  content = content.replace(/const subtitle = isEng \? t\('hero\.subtitle'\) : data\.subtitle \|\| t\('hero\.subtitle'\);/g, "const subtitle = isSpanish ? (data.subtitle || t('hero.subtitle')) : t('hero.subtitle');");
  content = content.replace(/const ctaText = isEng \? t\('hero\.ctaText'\) : data\.ctaText \|\| t\('hero\.ctaText'\);/g, "const ctaText = isSpanish ? (data.ctaText || t('hero.ctaText')) : t('hero.ctaText');");

  // Custom case for Chat
  content = content.replace(/isEng \? 'Sorry, an error occurred while connecting to Zilla. Please try reloading the page.' : 'Lo siento, ha ocurrido un error al conectar con Zilla. Intenta recargar la página.'/g, "isSpanish ? 'Lo siento, ha ocurrido un error al conectar con Zilla. Intenta recargar la página.' : 'Sorry, an error occurred while connecting to Zilla. Please try reloading the page.'");
  content = content.replace(/isEng \? t\('chat\.greeting'\) : '¡Hola! Soy Zilla[^']+'/g, "isSpanish ? '¡Hola! Soy Zilla, Especialista en Performance Marketing de Godzilla Consulting. ¿Estás listo para optimizar tu embudo y llevar tu ROAS al siguiente nivel? ¿Cómo puedo ayudarte hoy?' : t('chat.greeting')");

  // Custom for Cultura
  content = content.replace(/isEng \? (\([^)]+\)) : (item\.title)/g, "isSpanish ? $2 : $1");
  content = content.replace(/isEng \? t\('culture\.missionText'\) : \(nodeData\.missionText \|\| '[^']+'\)/g, "isSpanish ? (nodeData.missionText || 'Ayudar a empresas mexicanas a crecer usando tecnología y estrategias digitales. Creemos que todos los negocios merecen las herramientas para competir y prosperar en el mundo actual.') : t('culture.missionText')");
  content = content.replace(/isEng \? t\('culture\.visionText'\) : \(nodeData\.visionText \|\| '[^']+'\)/g, "isSpanish ? (nodeData.visionText || 'Multiplicar el 15% de negocios digitalizados en México y elevar ese 4% de éxito, convirtiéndonos en el motor del crecimiento digital del país.') : t('culture.visionText')");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + f);
  }
});
