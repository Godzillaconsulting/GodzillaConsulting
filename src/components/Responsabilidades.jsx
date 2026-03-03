import React from 'react';

const Responsabilidades = () => {
    const points = [
        'Firma del contrato de prestación de servicios antes de iniciar el proyecto',
        'Entrega de información y materiales solicitados dentro de los plazos establecidos para evitar retrasos',
        'Respuestas y feedback en máximo 48-72 horas hábiles',
        'Accesos necesarios (redes sociales, dominio, hosting, plataformas publicitarias) proporcionados al inicio',
        'Disponibilidad para juntas de seguimiento programadas con anticipación',
        'Aprobaciones claras y por escrito para avanzar a las siguientes etapas del proyecto',
        'Punto de contacto designado que tenga autoridad para tomar decisiones'
    ];

    return (
        <section className="bg-[#111111] pt-24 pb-12">
            <div className="container mx-auto px-6 max-w-5xl">
                <div className="bg-[#1A1A1A] rounded-t-[2rem] p-10 md:p-16 border-b-8 border-[#CC0000]">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase leading-none">
                        Responsabilidades <br className="hidden md:block" />
                        <span className="text-gray-400">de nuestros clientes</span>
                    </h2>
                    <h3 className="text-2xl font-bold text-white mb-6">Trabajamos juntos, entregamos juntos</h3>
                    <p className="text-xl text-gray-300 font-medium leading-relaxed max-w-4xl">
                        Los tiempos de entrega que prometemos son reales, pero dependen de un ingrediente clave: el trabajo en equipo.
                        Nosotros ponemos toda nuestra experiencia y agilidad, pero necesitamos que estés disponible para feedback,
                        aprobaciones y entrega de materiales. Cuando ambos cumplimos nuestra parte, los resultados llegan a tiempo.
                    </p>
                </div>

                <div className="bg-white rounded-b-[2rem] p-10 md:p-16 shadow-2xl">
                    <ul className="space-y-6">
                        {points.map((point, index) => (
                            <li key={index} className="flex items-start gap-4">
                                <span className="text-[#CC0000] font-black text-2xl leading-none mt-1">•</span>
                                <span className="text-[#111111] text-lg font-medium leading-relaxed">
                                    {/* Split the first few words to bold them since the PDF highlights the start of the sentence */}
                                    {(() => {
                                        const firstSpace = point.indexOf(' ');
                                        const boldPart = point.split(' ').slice(0, 3).join(' ');
                                        const restPart = point.substring(boldPart.length);
                                        return (
                                            <>
                                                <strong className="font-black">{boldPart}</strong>{restPart}
                                            </>
                                        );
                                    })()}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-10 pt-8 border-t border-gray-200">
                        <p className="text-[#111111] font-bold text-lg">
                            El incumplimiento de estos puntos puede resultar en extensión de los tiempos de entrega originalmente acordados.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Responsabilidades;
