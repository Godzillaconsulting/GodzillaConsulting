import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import { buildPremiumPDF } from './services/pdfPremiumBuilder.js';
import { generateDailySocialMediaAssets } from './services/socialMediaVisuals.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const currentDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full' });

async function runTest() {
    console.log("🚀 Iniciando prueba local del pipeline (MOCK DATA)...");
    
    const data = {
        "pdfTitle": "DIARIO GODZILLA AI",
        "pdfSubtitle": "Inteligencia Ejecutiva Diaria",
        "pdfIntro": "En las últimas 24 horas hemos presenciado un cambio tectónico en la adopción corporativa de Inteligencia Artificial. Los modelos predictivos ya no son experimentales; son la base operativa de gigantes logísticos y de retail, desplazando la fuerza laboral humana en tareas analíticas repetitivas. \n\nEsta consolidación tecnológica exige que los directivos dejen de ver a la IA como un 'chatbot' y comiencen a integrarla como el núcleo de sus operaciones comerciales si desean sobrevivir al próximo trimestre.",
        "pdfMetrics": [ 
            { "label": "Impacto a Productividad", "value": 85 },
            { "label": "Reducción de Costos", "value": 42 }
        ],
        "pdfChart": { 
            "title": "Adopción de Mercado", 
            "data": [ {"label": "Líder", "value": 60}, {"label": "Rival", "value": 40} ] 
        },
        "pdfSections": [ 
            { 
                "heading": "La Integración de LLMs en Subsistemas Ofensivos Cibernéticos", 
                "content": "La escalada armamentística en el ciberespacio acaba de dar un giro tectónico. Durante la última semana, hemos observado el despliegue de agentes autónomos impulsados por Inteligencia Artificial diseñados específicamente para penetrar defensas perimetrales corporativas. A diferencia de los scripts estáticos tradicionales, estos modelos ofensivos pueden realizar ingeniería social dinámica a través de correos electrónicos corporativos, ajustando su tono de ataque basándose en las respuestas de los empleados en tiempo real. Esta adaptabilidad casi humana elimina los patrones predecibles que los sistemas IDS/IPS heredados solían cazar, volviéndolos prácticamente obsoletos.\n\nEl impacto estructural en la infraestructura empresarial es masivo. Los Centros de Operaciones de Seguridad (SOC) están registrando picos de brechas que ocurren en microsegundos, lo que significa que el tiempo de respuesta humana ya no es suficiente. Organizaciones de grado empresarial se ven ahora obligadas a invertir agresivamente en contramedidas basadas también en redes neuronales profundas (sistemas de inmunidad digital), creando una paradoja operativa donde solo una máquina puede defenderse de otra. Si las juntas directivas no comienzan a presupuestar actualizaciones de hardware para soportar inferencia local de IA defensiva, sus compañías quedarán expuestas a la primera oleada de este ransomware hiper-dinámico.\n\nEsta tendencia marca el fin de la ciberseguridad estática. Desde una perspectiva de arquitectura, los directores de tecnología (CTOs) deben migrar hacia arquitecturas de confianza cero ('Zero Trust') orquestadas por IA. No es simplemente un tema de protección de datos, sino un factor crítico para la viabilidad a largo plazo de cualquier organización que almacene propiedad intelectual sensible o maneje bases de datos de usuarios masivas." 
            },
            { 
                "heading": "Despliegue del Modelo Médico 'Alpha-Diag' y su Impacto Clínico", 
                "content": "El sector biomédico ha cruzado oficialmente la barrera de las pruebas teóricas para adentrarse en la aplicación clínica real. El lanzamiento de 'Alpha-Diag', un modelo multimodal capaz de cruzar registros de salud electrónicos con secuenciación genética y resonancias magnéticas en paralelo, está reduciendo los tiempos de diagnóstico oncológico temprano en un asombroso 70%. Al procesar gigabytes de información del historial del paciente en segundos, el sistema correlaciona síntomas aparentemente aislados que típicamente requerirían semanas de análisis por parte de juntas médicas especializadas.\n\nSin embargo, este avance tecnológico trae consigo un debate ético y legal que apenas comienza a regularse. La principal fricción radica en la opacidad inherente de las redes neuronales profundas: el famoso efecto de 'caja negra'. Si el modelo dicta un tratamiento que resulta en complicaciones severas, la trazabilidad de la decisión clínica se vuelve difusa, abriendo un vacío en las pólizas de negligencia médica actuales. Los hospitales están demandando explicabilidad algorítmica antes de permitir integraciones completas en quirófanos o unidades de cuidados intensivos.\n\nEn consecuencia, el verdadero cuello de botella para la Inteligencia Artificial médica ya no es la capacidad computacional o la precisión inferencial, sino la interoperabilidad de datos y la certificación gubernamental (FDA/EMA). Las corporaciones biotecnológicas que logren auditar y empaquetar sus modelos con un nivel estricto de cumplimiento legal dominarán una cuota de mercado trillonaria durante la próxima década." 
            },
            {
                "heading": "La Disrupción Laboral: Agentes Autónomos en Desarrollo de Software",
                "content": "La economía del desarrollo de software está sufriendo una metamorfosis sin precedentes con la llegada de agentes programadores autónomos como 'Devin' y sus contrapartes de código abierto. Estas entidades no actúan como simples autocompletadores de código (como lo hacía Copilot en 2023), sino que funcionan como ingenieros de software completos. Son capaces de leer repositorios masivos, entender tickets de Jira, planificar una arquitectura, escribir el código, ejecutar las pruebas unitarias y hacer el despliegue a producción, todo en un ciclo autónomo que no requiere supervisión constante.\n\nEl impacto económico para las grandes consultoras y empresas de tecnología es abrumador. Se estima que las tareas de mantenimiento de código heredado, corrección de bugs menores y desarrollo de APIs estándar pueden ser delegadas casi en un 80% a estos agentes en los próximos dos años. Esto reduce el costo operativo radicalmente, pero simultáneamente inyecta una volatilidad extrema en el mercado laboral para desarrolladores junior, obligando a una recapacitación forzada hacia roles de 'orquestación de IA' o arquitectura de sistemas de alto nivel.\n\nPara los directores de ingeniería, el reto inmediato es integrar estos agentes en sus pipelines de CI/CD sin comprometer la seguridad del código fuente. Las tendencias indican que las empresas que logren formar equipos híbridos (donde un arquitecto humano supervisa a 10 agentes autónomos) alcanzarán una velocidad de despliegue inalcanzable para competidores tradicionales. La programación ya no se trata de escribir sintaxis, sino de dirigir inteligencia."
            },
            {
                "heading": "Hardware Neuronal y la Caída del Monopolio Tradicional",
                "content": "El ecosistema de hardware subyacente que potencia la Inteligencia Artificial está viviendo una fractura crítica. Mientras que Nvidia dominó indiscutiblemente la fase de entrenamiento de LLMs masivos, gigantes tecnológicos como Google, Meta y Amazon están migrando agresivamente hacia arquitecturas de silicio propietarias (TPUs, MTIA, Trainium) diseñadas específicamente para la fase de inferencia. Esta transición obedece a una matemática simple: la inferencia (usar el modelo) representa el 80% del costo operativo a largo plazo de cualquier IA en producción, y las GPUs tradicionales resultan ser extremadamente ineficientes a nivel energético para esta tarea continua.\n\nLa implicación corporativa es que el costo de operar modelos de IA disminuirá de forma asintótica. Al utilizar silicio altamente especializado y técnicas matemáticas como la cuantización extrema (reduciendo modelos de 16-bit a 4-bit), es posible correr inteligencias a nivel humano directamente en el borde (edge computing). Esto significa que hospitales, bancos y bases militares podrán desplegar IA de alto nivel sin depender de la nube pública, resolviendo de golpe los problemas de latencia y privacidad de datos.\n\nEsta revolución en el hardware descentraliza el poder de cómputo. La tendencia es clara: en los próximos 18 meses, veremos el declive de la dependencia absoluta de los centros de datos masivos para tareas cotidianas. Las organizaciones deben auditar hoy su infraestructura para determinar qué cargas de trabajo de IA deben moverse a procesadores locales optimizados (NPUs), asegurando su resiliencia tecnológica y reduciendo sus facturas en la nube en más de un 60%."
            }
        ]
    };
    
    // 4. Generar PDF
    console.log("📄 Generando PDF Premium...");
    const pdfBuffer = await buildPremiumPDF(data, 'es', null);
    
    // Escribir en la carpeta de artefactos para que la IA lo pueda enlazar al usuario
    const artifactPath = "C:\\Users\\GODZILLA.IA\\.gemini\\antigravity\\brain\\4149c38e-7d62-4c5c-b3db-3c34930accac\\scratch\\test_boletin.pdf";
    fs.writeFileSync(artifactPath, pdfBuffer);
    console.log(`✅ PDF guardado en: ${artifactPath}`);
    
    // 5. Generar Imágenes Sociales
    console.log("🎨 Generando imágenes sociales...");
    // Esto guardará las imágenes en public/temp_social/final_0.jpg, etc.
    await generateDailySocialMediaAssets(data.pdfSections);
    
    console.log("✅ Pipeline de prueba finalizado.");
}

runTest().catch(console.error);
