import React, { useState } from 'react';
import logo from '../assets/Godzilla Consulting.png';
import {
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Facebook,
  Chrome,
  Calendar as CalendarIcon,
  Upload,
  Info,
  CheckCircle2,
  Check,
  Lock,
  Notebook,
  Globe,
  Sprout,
  Instagram,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck
} from 'lucide-react';

// Icono personalizado para TikTok
const TikTokIcon = ({ className }) => (
  <svg viewBox="-2 -2 28 28" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
);

// Icono personalizado para Google
const GoogleIcon = ({ className }) => (
  <svg viewBox="-3 -3 30 30" fill="currentColor" className={className}>
    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
  </svg>
);

const FormAbordaje = () => {
  const [step, setStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [showSecurityPopup, setShowSecurityPopup] = useState(false);
  const [formData, setFormData] = useState({
    empresa: '',
    web: '',
    hasWeb: true,
    servicios: '',
    servicioEstrella: '',
    metas: '',
    diferenciadores: '',
    dbOption: '', // 'cuaderno', 'ninguna', 'excel'
    metaVariant: '', // 'portafolio', 'pagina', 'ninguna'
    tiktokVariant: '', // 'login', 'business', 'ninguna'
    googleVariant: '',
    redes: { meta: false, tiktok: false, google: false }, // 'login', 'email'
    termsAccepted: false,
    infoAccepted: false
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const stepInfo = {
    1: { title: "IDENTIDAD", subtitle: "Dinos quién eres" },
    2: { title: "ESTRATEGIA", subtitle: "Cuéntanos cuál es tu propuesta de valor" },
    3: { title: "ACCESOS", subtitle: "Vincula tus perfiles comerciales" },
    4: { title: "AGENDA", subtitle: "Programa nuestro primer acercamiento" },
    5: { title: "TÉRMINOS Y CONDICIONES", subtitle: "Lee y acepta para finalizar" }
  };


  // Pantalla Final de Bienvenida
  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#CC0000]/10 via-black to-black flex flex-col items-center justify-center z-[200] p-4 text-center animate-in fade-in duration-700">
        <div className="w-full max-w-md bg-[#111111] rounded-[40px] p-8 pb-10 border border-[#CC0000]/20 shadow-[0_0_50px_rgba(204,0,0,0.15)] relative flex flex-col items-center overflow-hidden">
          
          {/* Botón de cerrar superior */}
          <button onClick={() => window.location.reload()} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-[#CC0000]/20 rounded-full transition-colors z-10">
            <X className="w-4 h-4 text-white/50 hover:text-[#CC0000]" />
          </button>

          <div className="relative w-40 h-40 mt-8 mb-6 flex items-center justify-center z-10">
            {/* Anillo de Partículas (Verde Éxito + Rojo Godzilla) */}
            <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
              <div className="absolute top-2 left-1/2 w-2 h-2 bg-[#34C759] rounded-full shadow-[0_0_8px_#34C759]"></div>
              <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-[#CC0000]/60 rounded-full"></div>
              <div className="absolute bottom-4 left-1/3 w-3 h-3 bg-[#34C759]/80 rounded-full shadow-[0_0_10px_#34C759]"></div>
              <div className="absolute bottom-10 -left-2 w-1.5 h-1.5 bg-white/60 rounded-full"></div>
              <div className="absolute top-1/2 right-2 w-2 h-2 bg-[#34C759]/50 rounded-full"></div>
              <div className="absolute top-1/3 left-4 w-1 h-1 bg-[#CC0000]/40 rounded-full"></div>
            </div>
            
            <div className="absolute inset-0 animate-[spin_12s_linear_infinite_reverse]">
              <div className="absolute bottom-8 right-4 w-2 h-2 bg-[#34C759]/80 rounded-full shadow-[0_0_8px_#34C759]"></div>
              <div className="absolute top-1/4 left-8 w-1 h-1 bg-white/80 rounded-full"></div>
              <div className="absolute bottom-1/3 left-2 w-1.5 h-1.5 bg-[#CC0000]/50 rounded-full shadow-[0_0_5px_#CC0000]"></div>
            </div>
            
            {/* Circulo Central */}
            <div className="relative z-10 w-20 h-20 rounded-full border-[3px] border-[#34C759] bg-[#34C759]/10 flex items-center justify-center animate-in zoom-in duration-500 shadow-[0_0_30px_rgba(52,199,89,0.2)] backdrop-blur-sm">
              <Check className="w-10 h-10 text-[#34C759] stroke-[3]" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-3 leading-tight uppercase tracking-tighter z-10">
            ¡Bienvenidos a la <span className="text-[#CC0000]">Familia</span>!
          </h1>
          <p className="text-white/60 text-sm mb-10 px-4 font-mono z-10">
            Tus datos han sido encriptados y recibidos. La maquinaria de <strong className="text-white">Godzilla Consulting</strong> ha comenzado. Prepárate para el impacto.
          </p>

          <p className="text-white/30 text-[10px] mt-4 mb-2 uppercase tracking-widest font-bold z-10">
            Ya puedes cerrar esta ventana
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#CC0000] flex flex-col px-2 md:px-0 pb-24">
      <style>
        {`
          @keyframes animateGlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      {/* Contenedor Glow para TODO el formulario */}
      <div className="w-full max-w-md mx-auto relative z-0 mt-4 flex flex-col mb-24 h-[85vh] max-h-[800px] min-h-[600px]">
        {/* Glow animado (Backlight) */}
        <div className="absolute inset-[-6px] z-[-1] rounded-[46px] blur-[15px] bg-[linear-gradient(270deg,#ff3333,#CC0000,#4d0000)] bg-[length:200%_200%] animate-[animateGlow_8s_ease_infinite] opacity-60"></div>
        
        {/* Tarjeta de Encabezado */}
        <div className="w-full bg-[#1a1a1a] rounded-[40px] pt-8 pb-20 px-6 relative z-0 border border-white/5 shadow-2xl shrink-0">
        {step === 1 && (
          <div className="text-center">
            <div className="flex flex-col items-center gap-1">
              <img src={logo} alt="Godzilla Consulting" className="h-8 object-contain" />
            </div>
          </div>
        )}

        {/* Encabezado Dinámico de Paso */}
        <div className={`relative flex flex-col items-center justify-center ${step === 1 ? 'border-t border-white/10 pt-6 mt-6' : ''}`}>
          <div className="text-center px-12">
            <h3 className="text-3xl font-display font-bold mb-2 uppercase">{stepInfo[step]?.title}</h3>
            {stepInfo[step]?.subtitle && (
              <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest mt-1">{stepInfo[step].subtitle}</p>
            )}
            {step <= 3 && (
              <p className="text-[10px] text-white/50 mt-2">
                Tus datos están protegidos.{' '}
                <button 
                  onClick={() => setShowSecurityPopup(true)} 
                  className="text-[#CC0000] underline font-bold transition-all hover:text-white"
                >
                  Saber más
                </button>
              </p>
            )}
          </div>

          <div className="absolute right-0 top-6 w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(204,0,0,0.3)]">
              <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent" />
              <circle
                cx="28" cy="28" r="22" stroke="#CC0000" strokeWidth="3" fill="transparent"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 - (step / 5) * (2 * Math.PI * 22)}
                className="transition-all duration-700 ease-out" strokeLinecap="round"
              />
            </svg>
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-widest">{step} de 5</span>
          </div>
        </div>

      </div>

      <main className="flex-1 min-h-0 w-full bg-[#111111] rounded-b-[40px] rounded-t-[40px] shadow-[0_-30px_60px_rgba(0,0,0,0.9)] border border-white/10 relative z-10 -mt-12 flex flex-col overflow-hidden">

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-8 pt-10 pb-4">
          {/* PASO 1: IDENTIDAD */}
          {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 mt-2">
            <div className="group">
              <label className="block text-xs font-bold uppercase mb-2 text-white/70 group-focus-within:text-[#CC0000] transition-colors tracking-widest">
                Nombre de la Empresa <span className="text-[#CC0000] ml-1">*</span>
              </label>
              <input
                className="w-full bg-black/40 border border-[#CC0000]/50 focus:border-[#CC0000] focus:bg-black outline-none transition-all rounded-full p-4 px-6 text-sm"
                placeholder="Ej: Spa Renacer, Clínica Dental o Despacho Jurídico"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-white/70 tracking-widest">Sitio Web (Opcional)</label>
              <input
                className="w-full bg-black/40 border border-[#CC0000]/50 focus:border-[#CC0000] focus:bg-black outline-none transition-all rounded-full p-4 px-6 text-sm"
                placeholder="Ej: www.sparenacer.com"
                value={formData.web}
                onChange={(e) => setFormData({ ...formData, web: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* PASO 2: ESTRATEGIA */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 mt-2">
            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-white/70 tracking-widest">
                ¿Cuáles son tus servicios? <span className="text-[#CC0000] normal-case font-normal">(Incluye tu servicio estrella)</span> <span className="text-[#CC0000] ml-1">*</span>
              </label>
              <textarea
                className="w-full bg-black/40 border border-[#CC0000]/50 rounded-[32px] p-5 focus:border-[#CC0000] focus:bg-black outline-none transition-all h-32 text-sm"
                placeholder="Ej: Ofrecemos consultas dentales generales, pero nuestro servicio estrella es el Diseño de Sonrisa y Ortodoncia."
                value={formData.servicios}
                onChange={(e) => setFormData({ ...formData, servicios: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-white/70 tracking-widest">
                ¿Qué quieres lograr? <span className="text-[#CC0000] normal-case font-normal">(Metas y Dolores)</span> <span className="text-[#CC0000] ml-1">*</span>
              </label>
              <textarea
                className="w-full bg-black/40 border border-[#CC0000]/50 rounded-[32px] p-5 focus:border-[#CC0000] focus:bg-black outline-none transition-all h-32 text-sm"
                placeholder="Ej: Quiero llenar la agenda de la tarde. Me duele que los pacientes cancelan a última hora y necesito un sistema para captar gente nueva."
                value={formData.metas}
                onChange={(e) => setFormData({ ...formData, metas: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2 text-white/70 tracking-widest">
                ¿Cuáles son al menos 3 diferenciadores claves que tienes? <span className="text-[#CC0000] ml-1">*</span>
              </label>
              <textarea
                className="w-full bg-black/40 border border-[#CC0000]/50 rounded-[32px] p-5 focus:border-[#CC0000] focus:bg-black outline-none transition-all h-24 text-sm"
                placeholder="1. Atención personalizada 24/7, 2. Más de 10 años de experiencia, 3. Instalaciones premium y confortables."
                value={formData.diferenciadores}
                onChange={(e) => setFormData({ ...formData, diferenciadores: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-bold uppercase mb-4 text-white/70 tracking-widest">
                Base de Datos Actual <span className="text-[#CC0000] ml-1">*</span>
              </label>
              <div className="space-y-3">
                <button
                  onClick={() => setFormData({ ...formData, dbOption: 'cuaderno' })}
                  className={`w-full p-4 rounded-full px-6 border-2 text-left flex items-center justify-between transition-all ${formData.dbOption === 'cuaderno' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <Notebook className="w-5 h-5 text-white/70" />
                    <span className="font-bold text-sm">Tengo lista en cuaderno</span>
                  </div>
                  {formData.dbOption === 'cuaderno' && <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />}
                </button>

                <div className={`p-4 px-6 rounded-[32px] border-2 transition-all ${formData.dbOption === 'excel' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                  <button
                    onClick={() => setFormData({ ...formData, dbOption: 'excel' })}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-white/70" />
                      <span className="font-bold text-sm">Tengo Excel / CSV / Digital</span>
                    </div>
                    {formData.dbOption === 'excel' && <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />}
                  </button>
                  {formData.dbOption === 'excel' && (
                    <div className="mt-4 border-2 border-dashed border-white/20 p-6 rounded-xl text-center hover:border-[#CC0000] transition-all cursor-pointer bg-black/40">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-[#CC0000]" />
                      <p className="text-[10px] font-bold uppercase">Subir Archivo</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setFormData({ ...formData, dbOption: 'ninguna' })}
                  className={`w-full p-4 rounded-full px-6 border-2 text-left flex items-center justify-between transition-all ${formData.dbOption === 'ninguna' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <Sprout className="w-5 h-5 text-white/70" />
                    <span className="font-bold text-sm">No tengo (Empiezo de Cero)</span>
                  </div>
                  {formData.dbOption === 'ninguna' && <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* PASO 3: ACCESOS */}
        {step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300 mt-2">

            {/* ITEM: META / FACEBOOK */}
            <div className="space-y-4">
              <button
                onClick={() => setFormData({ ...formData, redes: { ...formData.redes, meta: !formData.redes.meta } })}
                className={`w-full p-4 rounded-[32px] px-6 flex items-center justify-between transition-all border ${formData.redes.meta ? 'border-[#CC0000] bg-[#CC0000]/10' : 'border-[#CC0000]/50 bg-black/40'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#CC0000]`}>
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-sm block text-white">Meta</span>
                    <span className="text-[10px] text-white/50 block">Conectar cuenta publicitaria</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.redes.meta ? 'border-[#CC0000]' : 'border-white/20'}`}>
                  {formData.redes.meta && <div className="w-3 h-3 bg-[#CC0000] rounded-full" />}
                </div>
              </button>

              {formData.redes.meta && (
                <div className="pl-6 border-l-2 border-[#CC0000]/30 ml-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.metaVariant === 'portafolio' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, metaVariant: 'portafolio' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>Portafolio Comercial (Business)</span>
                      {formData.metaVariant === 'portafolio' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.metaVariant === 'portafolio' && (
                      <div className="space-y-4 animate-in fade-in pt-4">
                        <p className="text-[11px] text-white/80 p-3 bg-black/40 rounded-lg italic border border-[#CC0000]/30">
                          "Ve a Configuración del Negocio &gt; Socios &gt; Agregar socio con el ID que te enviamos por correo."
                        </p>
                        <a href="https://business.facebook.com/settings" target="_blank" className="w-full bg-[#1877F2] hover:bg-blue-600 py-3 rounded-full flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-tighter shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5">
                          <Facebook className="w-5 h-5" />
                          Configuración de Negocio
                        </a>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.metaVariant === 'pagina' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, metaVariant: 'pagina' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>Acceso a mi Página de FB</span>
                      {formData.metaVariant === 'pagina' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.metaVariant === 'pagina' && (
                      <div className="space-y-4 animate-in fade-in pt-4">
                        <p className="text-[11px] text-white/80 p-3 bg-black/40 rounded-lg border border-[#CC0000]/30">
                          Instrucciones: Entra a tu página &gt; Panel de profesionales &gt; Acceso a la página &gt; Agregar nuevo administrador.
                        </p>
                        <button className="w-full bg-[#1877F2] hover:bg-blue-600 py-3 rounded-full flex items-center justify-center gap-3 font-bold text-xs uppercase shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5">
                          <Facebook className="w-5 h-5" />
                          Dar Acceso en Página
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.metaVariant === 'ninguna' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, metaVariant: 'ninguna' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span className={`${formData.metaVariant === 'ninguna' ? 'text-[#CC0000]' : 'text-white/70'}`}>No tengo cuenta Business</span>
                      {formData.metaVariant === 'ninguna' ? <div className="w-5 h-5 rounded-full bg-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.metaVariant === 'ninguna' && (
                      <div className="mt-4 p-4 bg-[#CC0000]/10 rounded-xl border border-[#CC0000]/30 animate-in fade-in">
                        <p className="text-[11px]">Iniciaremos creando una página profesional para tu negocio desde cero.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ITEM: GOOGLE */}
            <div className="space-y-4">
              <button
                onClick={() => setFormData({ ...formData, redes: { ...formData.redes, google: !formData.redes.google } })}
                className={`w-full p-4 rounded-[32px] px-6 flex items-center justify-between transition-all border ${formData.redes.google ? 'border-[#CC0000] bg-[#CC0000]/10' : 'border-[#CC0000]/50 bg-black/40'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#CC0000]`}>
                    <GoogleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-sm block text-white">Google Business</span>
                    <span className="text-[10px] text-white/50 block">Perfil de negocio en Google</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.redes.google ? 'border-[#CC0000]' : 'border-white/20'}`}>
                  {formData.redes.google && <div className="w-3 h-3 bg-[#CC0000] rounded-full" />}
                </div>
              </button>

              {formData.redes.google && (
                <div className="pl-6 border-l-2 border-[#CC0000]/30 ml-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.googleVariant === 'login' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, googleVariant: 'login' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>Usuario y Contraseña</span>
                      {formData.googleVariant === 'login' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.googleVariant === 'login' && (
                      <div className="space-y-4 animate-in fade-in pt-4">
                        <input className="w-full bg-black/40 border border-[#CC0000]/50 p-4 rounded-full px-6 text-sm outline-none focus:border-[#CC0000] transition-all" placeholder="ejemplo@gmail.com" />
                        <input className="w-full bg-black/40 border border-[#CC0000]/50 p-4 rounded-full px-6 text-sm outline-none focus:border-[#CC0000] transition-all" type="password" placeholder="Tu contraseña" />
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.googleVariant === 'email' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, googleVariant: 'email' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>Mediante Invitación</span>
                      {formData.googleVariant === 'email' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.googleVariant === 'email' && (
                      <div className="space-y-4 animate-in fade-in pt-4">
                        <p className="text-[11px] text-white/80 p-3 bg-black/40 rounded-lg border border-[#CC0000]/30">Agrega nuestro correo corporativo como administrador en Google Business Profile.</p>
                        <a href="https://business.google.com/" target="_blank" className="w-full bg-white hover:bg-white/90 text-black py-3 rounded-full flex items-center justify-center gap-3 font-bold text-xs uppercase shadow-xl shadow-white/10 transition-all hover:-translate-y-0.5">
                          <GoogleIcon className="w-5 h-5 text-[#CC0000]" />
                          Google Business Profile
                        </a>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.googleVariant === 'ninguna' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, googleVariant: 'ninguna' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span className={`${formData.googleVariant === 'ninguna' ? 'text-[#CC0000]' : 'text-white/70'}`}>No tengo cuenta de Google</span>
                      {formData.googleVariant === 'ninguna' ? <div className="w-5 h-5 rounded-full bg-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.googleVariant === 'ninguna' && (
                      <div className="mt-4 p-4 bg-[#CC0000]/10 rounded-xl border border-[#CC0000]/30 animate-in fade-in">
                        <p className="text-[11px]">Iniciaremos creando un perfil de negocio en Google desde cero.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ITEM: TIKTOK */}
            <div className="space-y-4">
              <button
                onClick={() => setFormData({ ...formData, redes: { ...formData.redes, tiktok: !formData.redes.tiktok } })}
                className={`w-full p-4 rounded-[32px] px-6 flex items-center justify-between transition-all border ${formData.redes.tiktok ? 'border-[#CC0000] bg-[#CC0000]/10' : 'border-[#CC0000]/50 bg-black/40'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#CC0000]`}>
                    <TikTokIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-sm block text-white">TikTok</span>
                    <span className="text-[10px] text-white/50 block">Conectar cuenta de TikTok</span>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.redes.tiktok ? 'border-[#CC0000]' : 'border-white/20'}`}>
                  {formData.redes.tiktok && <div className="w-3 h-3 bg-[#CC0000] rounded-full" />}
                </div>
              </button>

              {formData.redes.tiktok && (
                <div className="pl-6 border-l-2 border-[#CC0000]/30 ml-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.tiktokVariant === 'login' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, tiktokVariant: 'login' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>Correo / Teléfono y Pass</span>
                      {formData.tiktokVariant === 'login' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.tiktokVariant === 'login' && (
                      <div className="space-y-4 animate-in fade-in pt-4">
                        <input className="w-full bg-black/40 border border-[#CC0000]/50 p-4 rounded-full px-6 text-sm outline-none focus:border-[#CC0000] transition-all" placeholder="Ej: @tacos_el_rey" />
                        <input className="w-full bg-black/40 border border-[#CC0000]/50 p-4 rounded-full px-6 text-sm outline-none focus:border-[#CC0000] transition-all" type="password" placeholder="Tu contraseña" />
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.tiktokVariant === 'business' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, tiktokVariant: 'business' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span>TikTok Ads Manager</span>
                      {formData.tiktokVariant === 'business' ? <CheckCircle2 className="w-5 h-5 text-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                    {formData.tiktokVariant === 'business' && (
                      <div className="space-y-4 animate-in fade-in text-center pt-4">
                        <p className="text-[11px] text-white/80 text-left mb-4 italic p-3 bg-black/40 rounded-lg border border-[#CC0000]/30">
                          "Ve a Assets &gt; Business Profile y danos acceso como socio."
                        </p>
                        <a href="https://ads.tiktok.com/" target="_blank" className="w-full bg-black hover:bg-white/10 py-3 rounded-full flex items-center justify-center gap-3 font-bold text-xs uppercase border border-white/20 transition-all hover:-translate-y-0.5">
                          <TikTokIcon className="w-5 h-5" />
                          TikTok For Business
                        </a>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-[24px] border transition-all ${formData.tiktokVariant === 'ninguna' ? 'border-[#CC0000] bg-[#CC0000]/20' : 'border-[#CC0000]/50 bg-black/40'}`}>
                    <button
                      onClick={() => setFormData({ ...formData, tiktokVariant: 'ninguna' })}
                      className="w-full flex items-center justify-between text-left font-bold text-xs"
                    >
                      <span className={`${formData.tiktokVariant === 'ninguna' ? 'text-[#CC0000]' : 'text-white/70'}`}>No tengo cuenta de TikTok</span>
                      {formData.tiktokVariant === 'ninguna' ? <div className="w-5 h-5 rounded-full bg-[#CC0000]" /> : <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* PASO 6: CALENDARIO */}
        {step === 4 && (
          <div className="animate-in slide-in-from-right duration-300 space-y-6 text-center">


            <div className="bg-white/5 border-2 border-white/10 rounded-[40px] p-8 min-h-[350px] flex flex-col items-center justify-center border-dashed">
              <div className="w-16 h-16 rounded-full border-4 border-[#CC0000] border-t-transparent animate-spin mb-6"></div>
              <p className="font-bold text-lg mb-2 italic uppercase">Cargando Agenda Godzilla...</p>
              <p className="text-xs text-white/70">Selecciona el horario que más te convenga.</p>
              <button className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 hover:-translate-y-0.5 rounded-full text-[10px] font-bold tracking-widest border border-white/10 uppercase transition-all">
                Refrescar Calendario
              </button>
            </div>
          </div>
        )}

        {/* PASO 7: PROTOCOLO */}
        {step === 5 && (
          <div className="animate-in slide-in-from-right duration-300 space-y-8">


            <div className="space-y-6">
              <label className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 cursor-pointer active:scale-95 transition-all">
                <input
                  type="checkbox"
                  className="mt-1 w-6 h-6 accent-[#CC0000] rounded-md"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                />
                <span className="text-xs text-white/80 font-bold uppercase tracking-tight">
                  Acepto los <a href="https://godzillaconsulting.ai/terminos" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#CC0000] underline hover:text-white transition-colors">Términos y Condiciones</a> de Godzilla Consulting. <span className="text-[#CC0000] ml-1">*</span>
                </span>
              </label>

              <label className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 cursor-pointer active:scale-95 transition-all">
                <input
                  type="checkbox"
                  className="mt-1 w-6 h-6 accent-[#CC0000] rounded-md"
                  checked={formData.infoAccepted}
                  onChange={(e) => setFormData({ ...formData, infoAccepted: e.target.checked })}
                />
                <span className="text-xs text-white/80 font-bold uppercase tracking-tight">
                  Estoy de acuerdo con el uso de mi información para fines de escalado. <span className="text-[#CC0000] ml-1">*</span>
                </span>
              </label>
            </div>

            <div className="p-6 bg-[#CC0000]/20 border border-[#CC0000]/30 rounded-3xl">
              <div className="flex gap-4 items-center mb-2">
                <Info className="w-6 h-6 text-[#CC0000]" />
                <span className="font-bold uppercase text-xs tracking-widest">Aviso de Privacidad</span>
              </div>
              <p className="text-[10px] text-white/70 leading-relaxed">
                Tu información está protegida por encriptación de nivel bancario. Godzilla Consulting nunca compartirá tus datos con terceros sin autorización explícita.
              </p>
            </div>
          </div>
        )}
        </div> {/* Cierra el contenedor scrolleable */}

        {/* Barra de Navegación Fija al fondo del Pill */}
        <div className="shrink-0 px-8 pt-6 pb-8 bg-[#111111] border-t border-white/10 z-20 relative">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="w-14 h-14 bg-white/5 border border-white/20 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={nextStep}
                className="flex-1 h-14 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] font-bold uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,0,0,0.4)] hover:shadow-[0_0_30px_rgba(204,0,0,0.6)] hover:-translate-y-1 transition-all active:scale-95"
              >
                Siguiente
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                disabled={!formData.termsAccepted || !formData.infoAccepted}
                onClick={() => setIsFinished(true)}
                className={`flex-1 h-14 font-bold uppercase tracking-tighter rounded-2xl flex items-center justify-center transition-all active:scale-95 ${formData.termsAccepted && formData.infoAccepted
                    ? 'bg-[#34C759] hover:bg-[#2eb350] text-white shadow-[0_0_20px_rgba(52,199,89,0.4)] hover:shadow-[0_0_30px_rgba(52,199,89,0.6)] hover:-translate-y-1'
                    : 'bg-white/10 text-white/20 cursor-not-allowed shadow-none grayscale'
                  }`}
              >
                Enviar
              </button>
            )}
          </div>
        </div>

      </main>
      </div> {/* Cierra el Contenedor Glow para TODO el formulario */}

      {/* Pop-up de Seguridad */}
      {showSecurityPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowSecurityPopup(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#CC0000]/10 rounded-full flex items-center justify-center border border-[#CC0000]/30">
                <ShieldCheck className="w-8 h-8 text-[#CC0000]" />
              </div>
              <h4 className="text-lg font-bold uppercase tracking-wide">Seguridad de tus accesos</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                En Godzilla Consulting nos tomamos tu seguridad muy en serio. Todas las credenciales que compartes en este formulario viajan encriptadas de extremo a extremo. Solamente nuestro equipo interno de configuración las utilizará para vincular tus perfiles comerciales. 
              </p>
              <p className="text-xs text-white/70 font-bold">
                Tus datos nunca serán compartidos ni vendidos a terceros.
              </p>
              <button 
                onClick={() => setShowSecurityPopup(false)}
                className="w-full mt-4 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] font-bold uppercase tracking-tighter rounded-xl py-3 transition-all active:scale-95 shadow-[0_0_15px_rgba(204,0,0,0.3)]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FormAbordaje;
