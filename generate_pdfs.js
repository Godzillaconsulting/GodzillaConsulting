import fs from 'fs';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'public', 'lead-magnets');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// ==========================================
// PDF 1: 7 Prompts de IA para marketing
// ==========================================
const doc1 = new PDFDocument({ margin: 50 });
doc1.pipe(fs.createWriteStream(path.join(dir, 'prompts-ia.pdf')));

doc1.fontSize(24).fillColor('#CC0000').text('7 Prompts de IA para Marketing que SÍ funcionan', { align: 'center' });
doc1.moveDown(2);
doc1.fontSize(12).fillColor('#111111').text('Gracias por descargar este recurso de Godzilla Consulting. Estos prompts están diseñados para ahorrarte horas de trabajo y maximizar las conversiones de tu negocio.', { align: 'justify' });
doc1.moveDown(2);

const prompts = [
    { title: '1. Creación de Copy Persuasivo (Fórmula AIDA)', text: 'Actúa como un copywriter Senior. Redacta 3 opciones de copys para Facebook Ads promocionando [TU PRODUCTO/SERVICIO] dirigidos a [TU AUDIENCIA]. Utiliza la fórmula AIDA (Atención, Interés, Deseo, Acción) y mantén un tono persuasivo pero no agresivo.' },
    { title: '2. Generación de Contenido por 1 Mes', text: 'Eres un estratega de contenido. Crea una tabla con 15 ideas de contenido (Reels, Carruseles, Stories) para una cuenta de Instagram sobre [TU NICHO]. Las ideas deben enfocarse en educar sobre [PROBLEMA DEL CLIENTE] y terminar en invitación a agendar cita.' },
    { title: '3. Guiones de Videos de Venta (VSL)', text: 'Escribe un guión de 60 segundos para un anuncio de video tipo TikTok/Reel. La estructura debe ser: [0-3s] Gancho visual e impactante, [3-15s] Presentación del problema, [15-45s] Solución con nuestro servicio, [45-60s] Llamado a la acción claro.' },
    { title: '4. Respuestas a Objeciones Comunes', text: 'Mi producto cuesta [PRECIO] y mis clientes suelen decir que "es muy caro". Escribe 5 guiones de respuesta empática y persuasiva que mi equipo de ventas puede usar en WhatsApp para rebatir esta objeción sin bajar el precio.' },
    { title: '5. Email de Recuperación de Carrito / Lead Frío', text: 'Escribe un correo electrónico corto y amigable para un prospecto que pidió información sobre [TU SERVICIO] hace una semana pero dejó de contestar. El objetivo es reactivar la conversación ofreciendo un valor adicional (un pequeño tip o una auditoría de 10 minutos).' },
    { title: '6. Creación de Buyer Personas', text: 'Desarrolla 2 perfiles detallados de "Buyer Persona" para un negocio que vende [TU PRODUCTO/SERVICIO]. Incluye: Nombre imaginario, edad, ingresos, dolores principales, miedos ocultos y qué objeciones tendrían antes de comprarme.' },
    { title: '7. Estructura de Landing Page (Direct Response)', text: 'Diseña la estructura de una Landing Page de Alta Conversión para [TU SERVICIO]. Detalla el Título Principal (H1), 3 beneficios clave (H2), una sección de prueba social y un texto magnético para el botón (CTA).' }
];

prompts.forEach(p => {
    doc1.fontSize(14).fillColor('#CC0000').text(p.title);
    doc1.moveDown(0.5);
    doc1.fontSize(12).fillColor('#333333').text(`Prompt: "${p.text}"`);
    doc1.moveDown(1.5);
});

doc1.end();

// ==========================================
// PDF 2: Generar Leads en WhatsApp
// ==========================================
const doc2 = new PDFDocument({ margin: 50 });
doc2.pipe(fs.createWriteStream(path.join(dir, 'whatsapp-guia.pdf')));

doc2.fontSize(24).fillColor('#CC0000').text('Cómo Generar Leads en WhatsApp (El método sin Spam)', { align: 'center' });
doc2.moveDown(2);
doc2.fontSize(12).fillColor('#111111').text('Un número de WhatsApp vale 10 veces más que un seguidor en Instagram si sabes cómo trabajarlo. Aquí tienes la metodología de Godzilla Consulting para construir relaciones comerciales sólidas:', { align: 'justify' });
doc2.moveDown(2);

const pasos = [
    { title: 'Paso 1: Nunca compres bases de datos (El principio del Inbound)', text: 'El mayor error es enviar mensajes masivos a números comprados. WhatsApp banea estas cuentas en cuestión de horas. En lugar de eso, ofrece un "Lead Magnet" (como el archivo que estás leyendo) a cambio del número.' },
    { title: 'Paso 2: Utiliza Enlaces Personalizados (wa.link)', text: 'Cuando hagas publicidad en Facebook/Instagram, redirige el tráfico a tu WhatsApp con un mensaje predeterminado. Ej: "Hola, vi tu anuncio y quiero descargar la guía gratuita."' },
    { title: 'Paso 3: El saludo automatizado y la Etiqueta (WhatsApp Business)', text: 'Configura un mensaje de bienvenida que entregue el valor de inmediato. En el mismo mensaje, pídeles que te guarden en sus contactos. Ejemplo: "¡Hola! Aquí tienes la guía. 🎁 Por cierto, guarda mi número para que los enlaces se activen en el chat."' },
    { title: 'Paso 4: El uso estratégico del Estado de WhatsApp', text: 'Tus prospectos verán tus estados si tienen tu número (y tú el de ellos). Publica testimonios de clientes, detrás de escenas de tu servicio y ofertas limitadas (flash sales) directamente en tus estados. Es la forma más pasiva y menos invasiva de estar "top of mind".' },
    { title: 'Paso 5: Seguimiento Nutricional (No de pura venta)', text: 'No envíes mensajes todos los días diciendo "cómprame". Envía un mensaje a la semana que aporte valor. Ejemplo: "Hola Juan, me acordé de ti y pensé que este pequeño artículo sobre embudos te serviría de inspiración. ¡Buen día!".' }
];

pasos.forEach(p => {
    doc2.fontSize(14).fillColor('#CC0000').text(p.title);
    doc2.moveDown(0.5);
    doc2.fontSize(12).fillColor('#333333').text(p.text, { align: 'justify' });
    doc2.moveDown(1.5);
});

doc2.end();

console.log('¡PDFs generados exitosamente en public/lead-magnets/!');
