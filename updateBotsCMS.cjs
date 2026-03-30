const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  // --- BOTS.JSX ---
  let botsPath = ws + 'Bots.jsx';
  let lines = fs.readFileSync(botsPath, 'utf8').split('\n');

  // restore hidden subtitle
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes('<p className="hidden">{content.subtitle}</p>')) {
         lines[i] = '                            <p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">\n                                {content.subtitle}\n                            </p>';
     }
  }

  // update accordion array
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes('const accordionItems = [')) {
         lines.splice(i+1, 5,
            "        { icon: content.accIcon1Url ? <img src={content.accIcon1Url} alt=\"Icon 1\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Filter size={20} className=\"shrink-0\" />, title: content.accTitle1 || \"Cualificación de leads en tiempo real\", desc: content.accDesc1 || \"Filtra curiosos de clientes con presupuesto real automáticamente.\" },",
            "        { icon: content.accIcon2Url ? <img src={content.accIcon2Url} alt=\"Icon 2\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Calendar size={20} className=\"shrink-0\" />, title: content.accTitle2 || \"Agendamiento directo sin intervención\", desc: content.accDesc2 || \"Sincronización total con tu calendario para llenar tu agenda de citas.\" },",
            "        { icon: content.accIcon3Url ? <img src={content.accIcon3Url} alt=\"Icon 3\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <MessageSquare size={20} className=\"shrink-0\" />, title: content.accTitle3 || \"Soporte de IA multicanal\", desc: content.accDesc3 || \"Atención en WhatsApp, Instagram y Web de forma simultánea.\" },",
            "        { icon: content.accIcon4Url ? <img src={content.accIcon4Url} alt=\"Icon 4\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <RefreshCw size={20} className=\"shrink-0\" />, title: content.accTitle4 || \"Nurturing automatizado\", desc: content.accDesc4 || \"Seguimiento inteligente a prospectos que no compraron al primer contacto.\" },",
            "        { icon: content.accIcon5Url ? <img src={content.accIcon5Url} alt=\"Icon 5\" className=\"w-5 h-5 object-contain shrink-0 rounded-full\" style={{ filter: 'brightness(0) invert(1) hue-rotate(60deg) saturate(1000%)' }} /> : <Database size={20} className=\"shrink-0\" />, title: content.accTitle5 || \"Integración nativa con tu CRM\", desc: content.accDesc5 || \"Los datos de cada conversación van directo a tu base de datos.\" },"
         );
         break;
     }
  }

  // add style attribute to the icon span if possible (yellow color by default on lucide icon instead of yellow on image)
  // But we have inline style on img to tint it yellow so it matches #FACC15!
  
  fs.writeFileSync(botsPath, lines.join('\n'), 'utf8');

  // --- ADMINSTUDIO.JSX ---
  let adminPath = ws + 'AdminStudio.jsx';
  let adminContent = fs.readFileSync(adminPath, 'utf8');
  
  let injectionTarget = `      if (node.id === 'servicio-bots') combinedData.title = 'Automatización de bots';`;
  let newInjection = `      if (node.id === 'servicio-bots') {
          combinedData.title = 'Automatización de bots';
          if(combinedData.accTitle1 === undefined) {
              combinedData.accTitle1 = 'Cualificación de leads en tiempo real';
              combinedData.accDesc1 = 'Filtra curiosos de clientes con presupuesto real automáticamente.';
              combinedData.accIcon1Url = '';

              combinedData.accTitle2 = 'Agendamiento directo sin intervención';
              combinedData.accDesc2 = 'Sincronización total con tu calendario para llenar tu agenda de citas.';
              combinedData.accIcon2Url = '';

              combinedData.accTitle3 = 'Soporte de IA multicanal';
              combinedData.accDesc3 = 'Atención en WhatsApp, Instagram y Web de forma simultánea.';
              combinedData.accIcon3Url = '';

              combinedData.accTitle4 = 'Nurturing automatizado';
              combinedData.accDesc4 = 'Seguimiento inteligente a prospectos que no compraron al primer contacto.';
              combinedData.accIcon4Url = '';

              combinedData.accTitle5 = 'Integración nativa con tu CRM';
              combinedData.accDesc5 = 'Los datos de cada conversación van directo a tu base de datos.';
              combinedData.accIcon5Url = '';
          }
      }`;
  
  adminContent = adminContent.replace(injectionTarget, newInjection);
  fs.writeFileSync(adminPath, adminContent, 'utf8');

});
console.log('Successfully added editable accordion fields!');
