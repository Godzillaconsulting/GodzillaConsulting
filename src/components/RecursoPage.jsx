import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSiteData } from '../context/SiteContext';

import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';

const RECURSOS_DATA = {
  prompts: {
    title: '7 prompts de IA para marketing que sí funcionan',
    description: 'Dale a tu negocio las herramientas para extraer dinero de su base de datos antigua (contactos de hace 3, 6 o 12 meses que nunca compraron).',
    bottomText: 'Instrucciones para el Usuario: Donde veas [PARÉNTESIS EN NEGRITA], inserta lo que corresponda a tu negocio (ej. tu servicio, el problema que resuelves o tu nombre). Regla de Oro: Estos mensajes funcionan porque parecen escritos por un humano, no por un robot de marketing. No los adornes. Mantenlos cortos.',
    imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80',
    downloadUrl: '#'
  },
  whatsapp: {
    title: 'Cómo generar leads en WhatsApp sin spam',
    description: '¿Cómo clonar a tu mejor vendedor y hacerlo trabajar 24/7 sin pagarle sueldo extra? ¡Deja de perder clientes por no contestar rápido!',
    bottomText: 'Enseñar al dueño del negocio cómo configurar respuestas automáticas (ya sea en WhatsApp Business, Instagram DM o SMS) que conviertan preguntas en citas, incluso mientras duermen.',
    imageUrl: whatsapp3d,
    downloadUrl: '#'
  },
  crm: {
    title: 'Plantilla de CRM Personalizable',
    description: 'Lo que no se mide, no se puede mejorar. Deja de perder dinero en servilletas y cuadernos. Organiza tus prospectos, visualiza tus ventas y toma el control de tu negocio.',
    bottomText: 'Proporcionar una herramienta visual simple para que el dueño (o su recepcionista) deje de usar cuadernos de papel y post-its. Es la \'Digitalización Nivel 1\'.',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80',
    downloadUrl: '#'
  }
};

const RecursoPage = ({ previewRecursoId }) => {
  const { recursoId: urlRecursoId } = useParams();
  const recursoId = previewRecursoId || urlRecursoId;
  const { getNodeData, loading } = useSiteData();
  
  const nodeId = `landing-recurso-${recursoId}`;
  const nodeData = getNodeData(nodeId);
  const defaultData = RECURSOS_DATA[recursoId];

  // Merge the dynamically pulled node data with our base RECURSOS_DATA fallback
  const data = React.useMemo(() => {
      if (!defaultData) return null;
      return {
          title: nodeData?.title || defaultData.title,
          description: nodeData?.description || defaultData.description,
          bottomText: nodeData?.bottomText || defaultData.bottomText,
          buttonText: nodeData?.buttonText || 'Download Resource',
          buttonDestination: nodeData?.buttonDestination || defaultData.downloadUrl || '#',
          imageUrl: nodeData?.mainImageUrl || defaultData.imageUrl
      };
  }, [nodeData, defaultData]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [recursoId]);

  if (loading && !data) return <div className="min-h-screen bg-black"></div>;
  if (!data) return <div className="text-white text-center py-32 text-2xl font-bold bg-black min-h-screen pt-40">Recurso no encontrado.</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-40 pb-24 font-sans px-6 lg:px-12 flex items-center justify-center overflow-x-hidden">
      <div className="max-w-6xl w-full mx-auto flex flex-col">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center lg:items-start justify-between">
          <div className="flex-1 space-y-8 max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight">
              {data.title}
            </h1>
            <p className="text-gray-300 text-lg md:text-xl font-light leading-relaxed">
              {data.description}
            </p>
            <div className="pt-2">
              <a 
                href={data.buttonDestination}
                className="inline-flex items-center justify-center bg-[#FA4A54] hover:bg-[#e03a43] text-white px-8 py-3.5 md:py-4 rounded-[1.5rem] font-bold text-[15px] md:text-base transition-all gap-3 shadow-[0_0_15px_rgba(250,74,84,0.2)] hover:shadow-[0_0_25px_rgba(250,74,84,0.4)]"
              >
                <Download size={20} strokeWidth={2.5} />
                {data.buttonText}
              </a>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-[500px] shrink-0">
            <div className="w-full aspect-[16/10] sm:aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden bg-[#0d1627] border border-gray-800/60 shadow-2xl relative">
              <img 
                src={data.imageUrl} 
                alt={data.title} 
                className={`w-full h-full object-cover rounded-3xl ${recursoId === 'whatsapp' ? 'p-8 object-contain' : 'p-0'}`}
              />
            </div>
          </div>
        </div>

        <div className="w-full bg-[#0a0a0a] border border-neutral-800/60 rounded-2xl p-6 lg:p-8 shadow-2xl mt-16 md:mt-24">
            <p className="text-gray-300 font-light text-[15px] md:text-base leading-relaxed">
              {data.bottomText.split(/(\[PARÉNTESIS EN NEGRITA\]|Regla de Oro:)/).map((part, i) => {
                if (part === '[PARÉNTESIS EN NEGRITA]' || part === 'Regla de Oro:') {
                  return <strong key={i} className="text-white font-bold">{part}</strong>;
                }
                return part;
              })}
            </p>
        </div>
      </div>
    </div>
  );
};

export default RecursoPage;
