import React, { useState } from 'react';

const SociosGodzilla = () => {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = () => {
        setLoading(true);
        // Simulación: Aquí irá la pasarela de Stripe/MercadoPago en vivo.
        setTimeout(() => {
            alert("Redirigiendo a pasarela segura cifrada 256-bit...");
            setLoading(false);
        }, 1500);
    };

    return (
        <div style={styles.container}>
            <div style={styles.leftColumn}>
                
                <img src="/favicon.png" alt="Godzilla Consulting" style={styles.logo} />
                <h1 style={styles.heroText}>Godzilla Business Insights</h1>
                
                <div style={styles.separator}></div>
                
                <h2 style={styles.subtext}>Inteligencia C-Level en Tiempo Real</h2>
                <p style={styles.description}>
                    Decodificamos el ecosistema corporativo diario usando I.A. Obtén acceso absoluto a reportes PDF avanzados, 
                    métricas visuales y estrategias accionables diseñadas para directivos.
                </p>

                <ul style={styles.features}>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> Análisis Corporativos y Geográficos</li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> Vectores Geométricos B2B Exclusivos</li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> Acceso Cero-Fricción Universal Multi-idioma</li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> Repositorios Periodísticos HD</li>
                </ul>

            </div>

            <div style={styles.rightColumn}>
                <div style={styles.checkoutBox}>
                    <h3 style={styles.checkoutTitle}>Membresía Socio Executive</h3>
                    
                    <div style={styles.priceContainer}>
                        <span style={styles.currency}>$</span>
                        <span style={styles.price}>1.00</span>
                        <span style={styles.period}>USD / Quincena</span>
                    </div>
                    
                    <p style={styles.guarantee}><span style={styles.lock}>🔒</span> Cobro Seguro y Cancelación 1 Click</p>
                    
                    <div style={styles.ccBanner}>
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196578.png" alt="Visa" style={styles.ccIcon} />
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196561.png" alt="MasterCard" style={styles.ccIcon} />
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196539.png" alt="Amex" style={styles.ccIcon} />
                    </div>

                    <p style={styles.infoText}>
                        Aceptamos todas las tarjetas de crédito corporativas y débito.<br/> 
                        Desbloquea instantáneamente tu Biblioteca Premium PDF.
                    </p>

                    <button 
                        style={loading ? {...styles.button, ...styles.buttonLoading} : styles.button} 
                        onClick={handleSubscribe}
                        disabled={loading}
                    >
                        {loading ? 'Inicializando Pasarela...' : 'Convertirme en Socio (Pagar $1 USD)'}
                    </button>

                    <p style={styles.terms}>
                        Suscripción auto-renovable periódica. Términos y condiciones aplicables.
                    </p>
                </div>
            </div>
            
            {/* Animación CSS para loader si requiere */}
            <style>
                {`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(0.98); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#fff',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        flexWrap: 'wrap',
    },
    leftColumn: {
        flex: '1 1 50%',
        padding: '5vw 5vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)'
    },
    rightColumn: {
        flex: '1 1 40%',
        padding: '5vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111'
    },
    logo: {
        width: '60px',
        marginBottom: '20px'
    },
    heroText: {
        fontSize: 'clamp(2.5rem, 4vw, 4rem)',
        fontWeight: '900',
        lineHeight: '1.1',
        margin: '0 0 10px 0',
        letterSpacing: '-1px'
    },
    separator: {
        height: '4px',
        width: '60px',
        backgroundColor: '#CC0000',
        margin: '25px 0'
    },
    subtext: {
        fontSize: '1.5rem',
        color: '#DDAA00',
        fontWeight: 'bold',
        margin: '0 0 20px 0'
    },
    description: {
        fontSize: '1.1rem',
        color: '#aaaaaa',
        lineHeight: '1.6',
        maxWidth: '500px',
        marginBottom: '40px'
    },
    features: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    featureItem: {
        fontSize: '1.05rem',
        color: '#e0e0e0',
        marginBottom: '15px',
        display: 'flex',
        alignItems: 'center'
    },
    check: {
        color: '#CC0000',
        fontWeight: 'bold',
        marginRight: '10px',
        fontSize: '1.2rem'
    },
    checkoutBox: {
        backgroundColor: '#181818',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
    },
    checkoutTitle: {
        fontSize: '1.2rem',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        margin: '0 0 20px 0'
    },
    priceContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        marginBottom: '20px'
    },
    currency: {
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#fff'
    },
    price: {
        fontSize: '4.5rem',
        fontWeight: '900',
        color: '#fff',
        letterSpacing: '-2px'
    },
    period: {
        fontSize: '1rem',
        color: '#777',
        marginLeft: '10px'
    },
    guarantee: {
        fontSize: '0.9rem',
        color: '#4CAF50',
        margin: '0 0 25px 0',
        fontWeight: 'bold'
    },
    lock: {
        marginRight: '5px'
    },
    ccBanner: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '20px'
    },
    ccIcon: {
        height: '30px',
        opacity: 0.8,
        filter: 'grayscale(0.5) brightness(1.2)'
    },
    infoText: {
        fontSize: '0.9rem',
        color: '#999',
        lineHeight: '1.5',
        marginBottom: '30px'
    },
    button: {
        width: '100%',
        padding: '18px 0',
        backgroundColor: '#CC0000',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 5px 15px rgba(204, 0, 0, 0.3)',
    },
    buttonLoading: {
        backgroundColor: '#880000',
        animation: 'pulse 1.5s infinite',
        cursor: 'wait'
    },
    terms: {
        fontSize: '0.75rem',
        color: '#555',
        marginTop: '25px'
    }
};

export default SociosGodzilla;
