const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  let filepath = ws + 'Bots.jsx';
  let lines = fs.readFileSync(filepath, 'utf8').split('\n');
  
  // 1. imports
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes("import { Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';")) {
         lines[i] = "import { Play, Pause, Volume2, VolumeX, ArrowRight, Filter, Calendar, MessageSquare, RefreshCw, Database, ChevronDown } from 'lucide-react';";
         break;
     }
  }

  // 2. state & accordion data
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes('const [content, setContent] = useState(defaultContent);')) {
         lines.splice(i+1, 0,
            "    const [openAccordion, setOpenAccordion] = useState(0);",
            "",
            "    const accordionItems = [",
            "        { icon: <Filter size={20} className=\"shrink-0\" />, title: \"Cualificación de leads en tiempo real\", desc: \"Filtra curiosos de clientes con presupuesto real automáticamente.\" },",
            "        { icon: <Calendar size={20} className=\"shrink-0\" />, title: \"Agendamiento directo sin intervención\", desc: \"Sincronización total con tu calendario para llenar tu agenda de citas.\" },",
            "        { icon: <MessageSquare size={20} className=\"shrink-0\" />, title: \"Soporte de IA multicanal\", desc: \"Atención en WhatsApp, Instagram y Web de forma simultánea.\" },",
            "        { icon: <RefreshCw size={20} className=\"shrink-0\" />, title: \"Nurturing automatizado\", desc: \"Seguimiento inteligente a prospectos que no compraron al primer contacto.\" },",
            "        { icon: <Database size={20} className=\"shrink-0\" />, title: \"Integración nativa con tu CRM\", desc: \"Los datos de cada conversación van directo a tu base de datos.\" },",
            "    ];"
         );
         break;
     }
  }

  // 3. UI
  for(let i=0; i<lines.length; i++) {
     if(lines[i].includes('<p className="text-white text-lg md:text-xl mb-10 leading-relaxed font-medium">') && lines[i+1].includes('{content.subtitle}')) {
         
         lines[i] = '                            {/* SUBTITLE REPLACED BY ACCORDION */}';
         lines[i+1] = '                            <p className="hidden">{content.subtitle}</p>';
         lines[i+2] = '                            <div className="w-full text-left bg-black/20 rounded-2xl p-3 md:p-5 mb-8 space-y-1 md:space-y-2 border border-white/10 shadow-lg relative z-20">\n' +
                      '                                {accordionItems.map((item, index) => {\n' +
                      '                                    const isOpen = openAccordion === index;\n' +
                      '                                    return (\n' +
                      '                                        <div key={index} className="border-b border-white/10 last:border-0 pb-1.5 pt-1.5 first:pt-0 last:pb-0">\n' +
                      '                                            <button\n' +
                      '                                                onClick={() => setOpenAccordion(isOpen ? -1 : index)}\n' +
                      '                                                className="w-full flex items-center justify-between py-2 text-white hover:text-white/80 transition-colors gap-3"\n' +
                      '                                            >\n' +
                      '                                                <div className="flex items-center gap-3 font-bold text-sm md:text-base leading-tight">\n' +
                      '                                                    <span className="text-[#FACC15] shrink-0">{item.icon}</span>\n' +
                      '                                                    <span className="text-left">{item.title}</span>\n' +
                      '                                                </div>\n' +
                      '                                                <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isOpen ? \'rotate-180 text-[#FACC15]\' : \'text-gray-400\'}`} />\n' +
                      '                                            </button>\n' +
                      '                                            <div\n' +
                      '                                                className={`overflow-hidden transition-all duration-300 ${isOpen ? \'max-h-40 opacity-100 mt-2\' : \'max-h-0 opacity-0\'}`}\n' +
                      '                                            >\n' +
                      '                                                <p className="text-gray-200 text-xs md:text-sm leading-relaxed pl-8 pb-3 text-left">\n' +
                      '                                                    {item.desc}\n' +
                      '                                                </p>\n' +
                      '                                            </div>\n' +
                      '                                        </div>\n' +
                      '                                    )\n' +
                      '                                })}\n' +
                      '                            </div>';
         break;
     }
  }

  fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
});
console.log('Successfully injected accordion layout to Bots.jsx natively via lines!');
