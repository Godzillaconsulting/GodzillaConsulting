import fs from 'fs';

// 1. studioConfig.js
const file1 = 'src/utils/studioConfig.js';
let c1 = fs.readFileSync(file1, 'utf8');

const injection = `
  // Always enforce email defaults for recursos if they don't exist yet
  if (nodeId === 'recursos') {
      if (combinedData.recurso1EmailSubject === undefined) {
          combinedData.recurso1EmailSubject = "📂 Acceso a tu Bóveda de Scripts de IA";
          combinedData.recurso1EmailBody = "Hola,\\n\\nAquí tienes acceso a los 7 pasos estructurales que te permitán automatizar tus respuestas y gestionar la atención de tus prospectos en segundos.\\n\\nDentro del documento encontrarás pautas fundamentales, tales como las reglas de oro para preservar la naturalidad en la comunicación generada por IA y la técnica de \\"Doble Opción\\" para incrementar considerablemente tus tasas de agendamiento.\\n\\nDelegar tareas repetitivas a un sistema inteligente es el paso fundamental para la verdadera escalabilidad. Si requieres que implementemos tu infraestructura técnica y tu clon digital en 48 horas, no dudes en responder a este correo.\\n\\nAtentamente,\\nEl equipo de Godzilla Consulting";
          combinedData.recurso1FileUrl = "https://godzillaconsulting.ai/scripts.pdf";
      }
      if (combinedData.recurso2EmailSubject === undefined) {
          combinedData.recurso2EmailSubject = "📂 Tu descarga: El Protocolo Lázaro";
          combinedData.recurso2EmailBody = "Hola,\\n\\nTu recurso está listo. A continuación, puedes acceder a los 7 guiones estratégicos diseñados para reactivar prospectos inactivos en menos de 7 días.\\n\\nComo paso inicial, te sugerimos implementar de inmediato el **Guion #4** con una lista de 20 contactos enfriados recientemente. Estos mensajes aplican una psicología de riesgo nulo que facilita retomar conversaciones de manera natural y sin fricciones.\\n\\nLa ejecución manual de este protocolo puede consumir tiempo valioso. Si buscas escalar tus resultados, podemos integrar un agente de Inteligencia Artificial que aplique esta estrategia de forma automatizada las 24 horas del día.\\n\\nMucho éxito en la recuperación de tu base de contactos.\\n\\nAtentamente,\\nEl equipo de Godzilla Consulting";
          combinedData.recurso2FileUrl = "https://godzillaconsulting.ai/lazaro.pdf";
      }
      if (combinedData.recurso3EmailSubject === undefined) {
          combinedData.recurso3EmailSubject = "📂 Acceso inmediato: Tu Tablero de Control de Ventas";
          combinedData.recurso3EmailBody = "Hola,\\n\\nGracias por solicitar el Tablero de Control de Ventas. Accede inmediatamente al recurso en el siguiente enlace:\\n\\nEste documento ha sido estructurado para ayudarte a detectar fugas operativas en tu embudo y recuperar hasta el 30% de tus ventas perdidas. Sugerimos prestar especial atención a la pestaña *Semáforo de Leads* para gestionar contactos de manera oportuna.\\n\\nTen en cuenta que este tablero te proporciona el diagnóstico y el mapa. Si requieres infraestructura tecnológica para automatizar el seguimiento y el cierre, en Godzilla Consulting nos especializamos en instalar motores de IA para acelerar tus procesos.\\n\\nQuedamos a tu disposición para cualquier consulta.\\n\\nAtentamente,\\nEl equipo de Godzilla Consulting";
          combinedData.recurso3FileUrl = "https://godzillaconsulting.ai/tablero.pdf";
      }
  }

  // Inject defaults for Paquetes
`;

if (!c1.includes("Always enforce email defaults")) {
    c1 = c1.replace(/\/\/ Inject defaults for Paquetes/g, injection);
    fs.writeFileSync(file1, c1);
}

// 2. CorreosInbox.jsx
const file2 = 'src/components/CorreosInbox.jsx';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(/const defaultTemplates = \{[\s\S]*?    \};\n/m, 'const defaultTemplates = {};\n');
fs.writeFileSync(file2, c2);

console.log("Corrections applied.");
