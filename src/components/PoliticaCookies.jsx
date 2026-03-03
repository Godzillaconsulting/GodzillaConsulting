import React, { useEffect } from 'react';

const PoliticaCookies = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="pt-32 pb-24 bg-[#111111] min-h-screen">
            <div className="container mx-auto px-6 max-w-4xl text-gray-200">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-10 uppercase tracking-tight text-center">
                    Política de Cookies
                </h1>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-gray-300">
                    <p>
                        Usamos cookies para mejorar la experiencia, medir uso y personalizar publicidad.
                    </p>
                    <p>
                        <strong className="text-white">Esenciales:</strong> necesarias para la navegación y funciones básicas (no requieren consentimiento).
                    </p>
                    <p>
                        <strong className="text-white">Analítica:</strong> miden el uso y rendimiento (ej.: Google Analytics).
                    </p>
                    <p>
                        <strong className="text-white">Funcionales:</strong> recuerdan preferencias (idioma, sesión).
                    </p>
                    <p>
                        <strong className="text-white">Publicidad/targeting:</strong> sirven para mostrar anuncios relevantes (Meta, redes de anuncios).
                    </p>
                    <p>
                        En la primera visita, mostramos un banner que permite: aceptar todo, rechazar cookies no esenciales o personalizar preferencias.
                    </p>
                    <p>
                        Puedes gestionar o desactivar cookies desde tu navegador (Chrome, Firefox, Safari, Edge) — advertimos que algunas funciones podrían verse afectadas.
                    </p>
                    <p>
                        Para exclusión específica: instrucciones y enlaces a herramientas externas (ej.: complemento de inhabilitación de Google Analytics).
                    </p>
                    <p>
                        Contacto para dudas:info@godzillaconsulting.ai.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PoliticaCookies;
