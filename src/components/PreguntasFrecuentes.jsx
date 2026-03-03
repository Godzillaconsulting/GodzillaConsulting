import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { client } from '../sanityClient';

const defaultFaqs = [
    {
        orden: 1,
        question: '¿Qué servicios ofrecen exactamente?',
        answer:
            'Ofrecemos una gama completa de servicios digitales que incluyen automatización de bots, producción audiovisual estratégica, diseño de embudos de venta, gestión de redes sociales, optimización SEO y CRM personalizado.',
    },
    {
        orden: 2,
        question: '¿Cuánto tiempo tarda en verse resultados?',
        answer:
            'Los tiempos varían según el servicio. Las campañas de captación pueden generar leads en días, mientras que el SEO y el posicionamiento de marca suelen tomar entre 3 y 6 meses para mostrar resultados significativos.',
    },
    {
        orden: 3,
        question: '¿Trabajan con clientes fuera de México?',
        answer:
            'Sí, tenemos clientes en diversos países. Nuestras estrategias digitales son globales y podemos adaptarnos a diferentes mercados e idiomas.',
    },
    {
        orden: 4,
        question: '¿Cómo es el proceso de contratación?',
        answer:
            'El proceso comienza con una sesión de estrategia gratuita donde analizamos tus necesidades. Luego presentamos una propuesta personalizada, firmamos el contrato y comenzamos la fase de implementación.',
    },
    {
        orden: 5,
        question: '¿Ofrecen garantías sobre los resultados?',
        answer:
            'Trabajamos con métricas claras y objetivos definidos desde el inicio. Si bien no podemos garantizar resultados exactos (ninguna agencia honesta puede), nos comprometemos con la transparencia total y la optimización continua de cada campaña.',
    },
    {
        orden: 6,
        question: '¿Cuáles son sus métodos de pago?',
        answer:
            'Aceptamos transferencia bancaria, tarjeta de crédito/débito y pagos internacionales vía PayPal o Stripe. Los planes se facturan mensualmente y no hay contratos de largo plazo obligatorios.',
    },
];

function FAQItem({ item }) {
    const [open, setOpen] = useState(false);

    return (
        <div
            className={`border-b border-white/10 transition-all duration-300 ${open ? 'pb-6' : 'pb-0'}`}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-start justify-between gap-4 py-6 text-left group"
                aria-expanded={open}
            >
                <div className="flex items-start gap-3">
                    <span className="text-[#CC0000] font-black text-lg leading-tight shrink-0 mt-0.5">
                        Q:
                    </span>
                    <span className="font-bold text-white text-lg leading-snug group-hover:text-red-100 transition-colors">
                        {item.question}
                    </span>
                </div>
                <ChevronDown
                    size={22}
                    className={`text-[#CC0000] shrink-0 mt-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="flex items-start gap-3 pl-0 pb-2">
                    <span className="text-gray-400 font-bold text-lg leading-tight shrink-0 mt-0.5">
                        A:
                    </span>
                    <p className="text-gray-300 leading-relaxed text-base">{item.answer}</p>
                </div>
            </div>
        </div>
    );
}

export default function PreguntasFrecuentes() {
    const [faqs, setFaqs] = useState(defaultFaqs);

    useEffect(() => {
        client
            .fetch(`*[_type == "faq"] | order(orden asc)`)
            .then((data) => {
                if (data && data.length > 0) {
                    setFaqs(data);
                }
            })
            .catch((error) => console.error('Error cargando FAQs de Sanity:', error));
    }, []);

    return (
        <div className="min-h-screen bg-[#0d0d0d] pt-[100px] pb-24">
            {/* Header */}
            <div className="relative w-full py-20 flex flex-col items-center text-center px-6 overflow-hidden">
                {/* Subtle red glow behind title */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-[#CC0000]/10 blur-[80px] rounded-full pointer-events-none" />

                <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-widest uppercase text-white drop-shadow-lg">
                    PREGUNTAS
                    <br />
                    <span className="text-[#CC0000]">FRECUENTES</span>
                </h1>
                <p className="relative z-10 mt-4 text-gray-400 text-lg max-w-xl">
                    Todo lo que necesitas saber sobre Godzilla Consulting
                </p>
            </div>

            {/* FAQ List */}
            <div className="max-w-3xl mx-auto px-6">
                <div className="bg-[#161616] rounded-2xl border border-white/5 shadow-2xl px-8 md:px-12 py-4">
                    {faqs.map((faq, idx) => (
                        <FAQItem key={faq._id || faq.orden || idx} item={faq} />
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <p className="text-gray-400 mb-4 text-base">
                        ¿No encontraste lo que buscabas?
                    </p>
                    <Link
                        to="/#contacto"
                        className="inline-flex items-center gap-2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-xl"
                    >
                        Contáctanos directamente
                    </Link>
                </div>
            </div>
        </div>
    );
}
