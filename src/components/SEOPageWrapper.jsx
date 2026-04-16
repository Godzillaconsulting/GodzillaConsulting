import React from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from './Footer';
import ContactForm from './ContactForm';

/**
 * Envoltorio Híbrido para Rutas SEO Independientes.
 * Envuelve el componente, inyecta Meta Data única y remata con un módulo de Contacto y Footer.
 */
const SEOPageWrapper = ({ title, description, children, includeContact = true }) => {
    return (
        <div className="flex flex-col min-h-screen pt-24 bg-[#050505]">
            <Helmet>
                <title>{title} | Godzilla Consulting</title>
                {description && <meta name="description" content={description} />}
                <link rel="canonical" href={window.location.href} />
                <meta property="og:title" content={`${title} | Godzilla Consulting`} />
                {description && <meta property="og:description" content={description} />}
            </Helmet>
            
            <main className="flex-grow">
                {children}
            </main>

            {includeContact && (
                <div className="border-t border-white/5">
                    <ContactForm />
                </div>
            )}
        </div>
    );
};

export default SEOPageWrapper;
