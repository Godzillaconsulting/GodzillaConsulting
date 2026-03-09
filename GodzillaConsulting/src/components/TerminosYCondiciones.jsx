import React, { useEffect } from 'react';

const TerminosYCondiciones = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="pt-32 pb-24 bg-[#111111] min-h-screen">
            <div className="container mx-auto px-6 max-w-4xl text-gray-200">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 uppercase tracking-tight">
                    Términos y condiciones
                </h1>
                <p className="font-bold mb-10 text-white text-lg">Última actualización: 21/11/2025</p>

                <div className="space-y-6 text-sm md:text-base leading-relaxed text-gray-300">
                    <p>
                        Al usar este sitio y contratar servicios de Godzilla Consulting S.A. de C.V. (RFC: [___]; contacto: info@godzillaconsulting.ai) aceptas estos Términos.
                    </p>
                    <p>
                        Ofrecemos servicios de marketing digital, producción de contenidos, automatización, embudos, ads y consultoría; características y entregables se detallan en cada propuesta/contrato.
                    </p>
                    <p>
                        La contratación se formaliza con la aceptación de la propuesta. Los precios, plazos y formas de pago se acuerdan por escrito; el pago no efectuado puede ocasionar intereses o suspensión de servicios. Godzilla Consulting cotiza y cobra en la moneda del cliente. Para operaciones USD↔MXN se aplica el tipo de cambio FIX determinado por el Banco de México y publicado en el Diario Oficial de la Federación del día hábil bancario inmediato anterior a la fecha de cobro. Para otras monedas, el procesador de pagos aplicará el tipo de cambio vigente al momento del cargo. Cargos, impuestos y comisiones se muestran de forma clara y total antes del pago."
                    </p>
                    <p>
                        La Agencia conserva metodologías y herramientas propias; los entregables se ceden en el alcance pactado tras el pago completo. El Cliente garantiza que los materiales aportados no infringen derechos de terceros.
                    </p>
                    <p>
                        Ambas partes deben mantener la confidencialidad de la información calificada como tal. La responsabilidad de la Agencia se limita al monto pagado por los servicios causantes del daño (con exclusiones para lucro cesante y daños indirectos), salvo pacto expreso en contrario.
                    </p>
                    <p>
                        Fuerza mayor, terminación por incumplimiento y leyes aplicables: leyes de México; jurisdicción de Ciudad Juárez, Chihuahua. Para notificaciones o aclaraciones: info@godzillaconsulting.ai
                    </p>
                </div>
            </div>
        </section>
    );
};

export default TerminosYCondiciones;
