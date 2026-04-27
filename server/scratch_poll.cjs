const fs = require('fs');
const path = 'C:/Users/GODZILLA.IA/.gemini/antigravity/brain/72771236-5c86-4686-a346-64f11e40adb4/';
const basePrompt = 'a yellow banana taped to a white wall with silver duct tape, modern art masterpiece';
const styles = [
  {name:'poll_flux', model:'flux', aug:''},
  {name:'poll_realism', model:'flux-realism', aug:', ultra-realistic photography, 8k resolution, highly detailed, 85mm lens, photorealistic'},
  {name:'poll_turbo', model:'turbo', aug:', vibrant vivid colors, digital art, highly creative, dramatic lighting, masterpiece'},
  {name:'poll_dark', model:'any-dark', aug:', dark fantasy style, gloomy, studio ghibli 2d illustration, cinematic dark lighting'}
];
const delay = ms => new Promise(res => setTimeout(res, ms));

async function downloadAll() {
  for (const s of styles) {
    const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(basePrompt + s.aug) + '?width=1024&height=1024&nologo=true&model=' + s.model;
    console.log('Fetching ' + s.name + '...');
    try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(path + s.name + '.jpg', buffer);
        console.log('Saved ' + s.name + ' (' + buffer.length + ' bytes)');
    } catch(e) {
        console.error(e);
    }
    console.log('Waiting 12 seconds...');
    await delay(12000);
  }
}
downloadAll();
