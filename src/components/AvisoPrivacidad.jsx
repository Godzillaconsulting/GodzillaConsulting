import React, { useEffect } from 'react';

const AvisoPrivacidad = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="pt-32 pb-24 bg-[#111111] min-h-screen">
            <div className="container mx-auto px-6 max-w-4xl text-gray-200">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-10 uppercase tracking-tight text-center">
                    Aviso de Privacidad
                </h1>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-gray-300">
                    <p>
                        <strong className="text-white">Responsable:</strong> Godzilla Consulting S.A. de C.V. contacto: info@godzillaconsulting.ai
                    </p>
                    <p>
                        <strong className="text-white">Finalidades principales:</strong> prestar servicios, facturación, comunicación comercial (con tu consentimiento), analítica y mejora de servicios, y cumplimiento legal.
                    </p>
                    <p>
                        <strong className="text-white">Datos que recabamos:</strong> identificación y contacto (nombre, email, teléfono), datos fiscales y de facturación, datos profesionales, datos de navegación (IP, cookies) y archivos que nos proporciones.
                    </p>
                    <p>
                        <strong className="text-white">Base legal:</strong> consentimiento (cuando aplique), necesidad contractual y cumplimiento legal.
                    </p>
                    <p>
                        <strong className="text-white">Transferencias:</strong> podemos compartir datos con proveedores/encargados (hosting, herramientas de analítica y ads, pasarelas de pago). Se notificará quiénes son cuando proceda.
                    </p>
                    <p>
                        <strong className="text-white">Conservación:</strong> se retienen según la finalidad y plazos legales (p. ej. facturación: hasta 6 años; marketing: hasta revocación del consentimiento). Ajusta según obligaciones.
                    </p>
                    <p>
                        <strong className="text-white">Tus derechos:</strong> acceder, rectificar, cancelar, oponerte, limitar uso, portabilidad y revocar consentimiento. Solicitudes por escrito a godzilla.oscar21@gmail.com indicando tu identificación y la petición.
                    </p>
                    <p>
                        <strong className="text-white">Seguridad:</strong> medidas técnicas y administrativas razonables; sin embargo, ningún sistema es 100% infalible.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AvisoPrivacidad;
