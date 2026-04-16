const fs = require('fs');
const filepath = 'src/components/LandingPaqueteDynamic.jsx';
let code = fs.readFileSync(filepath, 'utf8');
code = code.replace(
  'className="w-full bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] min-h-[250px] md:min-h-[300px] lg:min-h-[350px]">',
  'className="w-full bg-[#1c1c1c] border border-gray-800 rounded-[2.5rem] min-h-[250px] md:min-h-[300px] lg:min-h-[350px] flex items-center justify-center">\n<span className="text-gray-700 font-medium select-none text-sm border border-gray-800 px-4 py-2 rounded-full">Recurso audiovisual pendiente</span>'
);
fs.writeFileSync(filepath, code);
console.log('Fixed background.');
