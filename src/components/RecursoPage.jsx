import React, { useEffect, useState } from 'react';
import { Download, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  'boveda-scripts': {
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
  const rawId = previewRecursoId || urlRecursoId;
  const recursoId = (rawId === 'whatsapp') ? 'boveda-scripts' : rawId;
  const { getNodeData, loading } = useSiteData();
  
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const nodeId = `landing-recurso-${recursoId}`;
  const nodeData = getNodeData(nodeId);
  const defaultData = RECURSOS_DATA[recursoId];

  // Merge the dynamically pulled node data with our base RECURSOS_DATA fallback
  const data = React.useMemo(() => {
      if (!defaultData) return null;
      let imgUrl = (nodeData?.mainImageUrl && (nodeData.mainImageUrl.startsWith('http') || nodeData.mainImageUrl.startsWith('/api/media')) && !nodeData.mainImageUrl.includes('/assets/')) 
                   ? nodeData.mainImageUrl 
                   : (defaultData?.imageUrl || nodeData?.mainImageUrl);
      
      if (typeof imgUrl === 'string') {
          if (imgUrl.startsWith('/api/media')) {
              const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
              imgUrl = `${API_URL}${imgUrl}`;
          }
          if (imgUrl.includes('/api/media') && !imgUrl.includes('v=cf2')) {
              imgUrl += (imgUrl.includes('?') ? '&' : '?') + 'v=cf2';
          }
      }

      return {
          title: nodeData?.title || defaultData.title,
          description: nodeData?.description || defaultData.description,
          bottomText: nodeData?.bottomText || defaultData.bottomText,
          buttonText: nodeData?.buttonText || 'Download Resource',
          buttonDestination: nodeData?.buttonDestination || defaultData.downloadUrl || '#',
          imageUrl: imgUrl
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
              {status === 'success' ? (
                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-green-500/5">
                      <CheckCircle className="shrink-0 text-green-500" size={28} />
                      <div>
                          <p className="font-bold text-lg leading-tight">¡Recurso enviado a tu correo!</p>
                          <p className="text-[13px] opacity-80 mt-1">Revisa tu bandeja de entrada o la carpeta de spam.</p>
                      </div>
                  </div>
              ) : (
                  <form 
                      onSubmit={async (e) => {
                          e.preventDefault();
                          if (!email) return;
                          setStatus('loading');
                          setErrorMessage('');
                          try {
                              const res = await fetch(`${'' || ''}/api/resources/send`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ email, recursoId })
                              });
                              const resData = await res.json();
                              if (res.ok && resData.success) {
                                  setStatus('success');
                              } else {
                                  setStatus('error');
                                  setErrorMessage(resData.error || 'Hubo un error al enviar el recurso.');
                              }
                          } catch (err) {
                              setStatus('error');
                              setErrorMessage('No pudimos conectar con el servidor.');
                          }
                      }}
                      className="flex flex-col gap-3 max-w-sm"
                  >
                      <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                              <Mail size={18} className="text-gray-400" />
                          </div>
                          <input 
                              type="email" 
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Ingresa tu mejor correo"
                              className="w-full pl-12 pr-5 py-3.5 bg-[#0d1627]/80 border border-gray-700/60 rounded-[1.25rem] text-white text-sm focus:outline-none focus:border-[#FA4A54] focus:ring-1 focus:ring-[#FA4A54] transition-all"
                              disabled={status === 'loading'}
                          />
                      </div>
                      <button 
                          type="submit"
                          disabled={status === 'loading' || !email}
                          className="w-full inline-flex items-center justify-center bg-[#FA4A54] hover:bg-[#e03a43] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-[1.25rem] font-bold text-[15px] md:text-base transition-all gap-2.5 shadow-[0_0_15px_rgba(250,74,84,0.2)] hover:shadow-[0_0_25px_rgba(250,74,84,0.4)]"
                      >
                          {status === 'loading' ? (
                              <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                          ) : (
                              <Download size={18} strokeWidth={2.5} />
                          )}
                          {status === 'loading' ? 'Enviando...' : (data.buttonText || 'Enviar a mi correo')}
                      </button>
                      
                      {status === 'error' && (
                          <div className="flex items-center gap-2 text-red-400 text-xs mt-1 px-2">
                              <AlertCircle size={14} />
                              <p>{errorMessage}</p>
                          </div>
                      )}
                  </form>
              )}
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-[500px] shrink-0">
            <div className="w-full aspect-[16/10] sm:aspect-video lg:aspect-[4/3] rounded-3xl overflow-hidden bg-[#0d1627] border border-gray-800/60 shadow-2xl relative">
              <img 
                src={data.imageUrl} 
                alt={data.title} 
                className={`w-full h-full object-cover rounded-3xl ${recursoId === 'boveda-scripts' ? 'p-8 object-contain' : 'p-0'}`}
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
