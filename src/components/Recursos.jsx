import React, { useState } from 'react';
import { Download, X, Check } from 'lucide-react';
import { useLeadCapture } from '../hooks/useLeadCapture';
import whatsapp3d from '../assets/images/whatsapp_3d_icon.png';

const Recursos = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState(''); // Honeypot trap
    const [activeItem, setActiveItem] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Importamos nuestra conexión hook al backend (Esto sustituye temporalmente o acompaña a la simulación visual)
    const { captureLead, status, errorMessage, resetStatus } = useLeadCapture();

    const magnets = [
        {
            id: 1,
            title: '7 prompts de IA para marketing que sí funcionan',
            description: 'El contenido de calidad ya no tiene que consumir horas de tu equipo. Esta colección de 7 prompts especializados te da las herramientas exactas que necesitas para crear copy, estrategias y análisis de nivel profesional en minutos. Acelera tu producción sin sacrificar calidad.',
            image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80',
        },
        {
            id: 2,
            title: 'Cómo generar leads en WhatsApp sin spam',
            description: 'WhatsApp se ha consolidado como el canal de comunicación preferido en México, con más de 90 millones de usuarios activos. Esta guía te muestra cómo aprovechar esta plataforma de manera profesional y efectiva para hacer crecer tu negocio. Domina el canal de comunicación más poderoso del país.',
            image: whatsapp3d,
        },
        {
            id: 3,
            title: 'Plantilla de CRM Personalizable',
            description: 'Llevar un seguimiento de tus leads en libretas u hojas caóticas te hace perder ventas a diario. Con este CRM en Excel totalmente personalizable y fácil de usar, podrás organizar a tus prospectos de forma clara, priorizar tus seguimientos y maximizar tu porcentaje de cierre. Simplifica tu proceso de ventas hoy mismo.',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80',
        }
    ];

    return (
        <section id="recursos" className="py-24 bg-[#111111] overflow-hidden">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
                        RECURSOS
                    </h2>
                    <p className="text-xl text-gray-300 font-medium max-w-2xl mx-auto">
                        Accede a recursos de IA y marketing listos para usar en tu día a día.
                    </p>
                </div>

                <div className="space-y-16">
                    {magnets.map((item, index) => (
                        <div key={item.id} className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center group`}>

                            {/* Image Container with Custom Frame */}
                            <div className="w-full md:w-1/3 flex-shrink-0">
                                <div className="relative aspect-square rounded-[3rem] border bg-gray-900 border-gray-800 p-2 shadow-2xl overflow-hidden group-hover:border-[#CC0000] transition-colors duration-500">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover rounded-[2.5rem] opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />

                                    {/* Hover Download Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-[2.5rem]">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveItem(item);
                                                setIsModalOpen(true);
                                            }}
                                            className="bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                                        >
                                            DESCARGAR <Download size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="w-full md:w-2/3">
                                <h3 className="text-3xl font-bold text-white mb-6 leading-tight">{item.title}</h3>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    {item.description}
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setActiveItem(item);
                                        setIsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 text-[#CC0000] hover:text-red-400 font-bold text-lg border-b-2 border-transparent hover:border-[#CC0000] pb-1 transition-all"
                                >
                                    Haz clic aquí para descargar.
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Captura de Lead */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1c1c1c] border border-gray-800 p-8 rounded-[2rem] max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                setTimeout(() => {
                                    setIsSubmitted(false);
                                    setEmail('');
                                }, 300);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {isSubmitted ? (
                            <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check size={32} className="text-white" strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">¡Todo listo!</h3>
                                <p className="text-gray-300 text-base leading-relaxed mb-8">
                                    Hemos enviado "{activeItem?.title}" al correo <span className="text-white font-bold">{email}</span>.
                                    <br /><br />
                                    Por favor, espera un par de minutos y revisa tu bandeja de entrada (y la carpeta de spam por si acaso).
                                </p>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setTimeout(() => {
                                            setIsSubmitted(false);
                                            setEmail('');
                                        }, 300);
                                    }}
                                    className="w-full bg-white hover:bg-gray-200 text-black py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                                >
                                    Entendido
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-white mb-2">¡Estás a un paso!</h3>
                                    <p className="text-gray-400 text-sm">
                                        Ingresa tu mejor correo electrónico para enviarte "{activeItem?.title}" directamente a tu bandeja de entrada.
                                    </p>
                                </div>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (email.trim() === '') return;

                                    // Si un bot llenó el honeypot, lo dejamos pasar sin accionar nada (simulando éxito)
                                    if (website !== '') {
                                        setIsSubmitted(true);
                                        return;
                                    }

                                    // Para que esto funcione 100% el .env debe apuntar al servidor.
                                    // AHORA conectaremos el click con nuestro servidor real (Node.js)
                                    // Determinar slug para API basado en el ID
                                    let slug = '';
                                    if (activeItem?.id === 1) {
                                        slug = 'prompts-ia-marketing';
                                    } else if (activeItem?.id === 2) {
                                        slug = 'leads-whatsapp';
                                    } else if (activeItem?.id === 3) {
                                        slug = 'crm-template';
                                    }

                                    if (slug) {
                                        // Mandamos al back el Lead para que mande el CORREO real
                                        await captureLead(email, slug, website);
                                    }

                                    // DESCARGA DIRECTA (Re-habilitada)
                                    let fileName = '';
                                    if (activeItem?.id === 1) fileName = 'prompts-ia.pdf';
                                    else if (activeItem?.id === 2) fileName = 'whatsapp-guia.pdf';
                                    else if (activeItem?.id === 3) fileName = 'crm-template.xlsx';

                                    if (fileName) {
                                        const link = document.createElement('a');
                                        link.href = `/lead-magnets/${fileName}`;
                                        link.download = fileName;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }

                                    // Cambiamos el estado para mostrar UI de éxito en la pantalla al usuario
                                    setIsSubmitted(true);
                                }}>
                                    <div className="mb-4 relative">

                                        {/* HONEYPOT TRAP */}
                                        <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                                            <input type="text" name="b_website" tabIndex="-1" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                        </div>

                                        <input
                                            type="email"
                                            required
                                            placeholder="tu@correo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center
                                            ${status === 'loading'
                                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                                : 'bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] hover:shadow-xl'
                                            }`}
                                    >
                                        {status === 'loading' ? 'Enviando email...' : 'Enviar a mi correo'}
                                    </button>

                                    {/* Mostrar Errores de API si existieran sin trabar la UI */}
                                    {status === 'error' && (
                                        <p className="text-red-400 text-sm mt-3 text-center">{errorMessage || 'Error enviando correo'}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                        Prometemos no enviarte spam. Puedes desuscribirte en cualquier momento.
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default Recursos;
