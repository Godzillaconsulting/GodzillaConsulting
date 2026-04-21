import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteData } from '../context/SiteContext';
import { injectSectionDefaults } from '../utils/studioConfig';

const SociosGodzilla = () => {
    const [loading, setLoading] = useState(false);
    const { t, i18n } = useTranslation();
    const isEng = i18n.resolvedLanguage ? i18n.resolvedLanguage.startsWith('en') : false;
    
    const { getNodeData } = useSiteData();
    let content = getNodeData('socio-godzilla');
    if (!content) {
        content = injectSectionDefaults('socio-godzilla', {});
    }

    const handleSubscribe = () => {
        setLoading(true);
        setTimeout(() => {
            alert(isEng ? "Redirecting to AES-256 secure payment gateway..." : "Redirigiendo a pasarela segura cifrada 256-bit...");
            setLoading(false);
        }, 1500);
    };

    return (
        <div style={styles.container}>
            <div style={styles.leftColumn}>
                
                <img src="/favicon.png" alt="Godzilla Consulting" style={styles.logo} />
                <h1 style={styles.heroText} dangerouslySetInnerHTML={{ __html: content.heroText }} />
                
                <div style={styles.separator}></div>
                
                <h2 style={styles.subtext} dangerouslySetInnerHTML={{ __html: content.subtext }} />
                <p style={styles.description} dangerouslySetInnerHTML={{ __html: content.description }} />

                <ul style={styles.features}>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> <span dangerouslySetInnerHTML={{ __html: content.feature1 }} /></li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> <span dangerouslySetInnerHTML={{ __html: content.feature2 }} /></li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> <span dangerouslySetInnerHTML={{ __html: content.feature3 }} /></li>
                    <li style={styles.featureItem}><span style={styles.check}>✓</span> <span dangerouslySetInnerHTML={{ __html: content.feature4 }} /></li>
                </ul>

            </div>

            <div style={styles.rightColumn}>
                <div style={styles.checkoutBox}>
                    <h3 style={styles.checkoutTitle} dangerouslySetInnerHTML={{ __html: content.checkoutTitle }} />
                    
                    <div style={styles.priceContainer}>
                        <span style={styles.currency}>$</span>
                        <span style={styles.price}>{content.price}</span>
                        <span style={styles.period} dangerouslySetInnerHTML={{ __html: content.period }} />
                    </div>
                    
                    <p style={styles.guarantee}><span style={styles.lock}>🔒</span> <span dangerouslySetInnerHTML={{ __html: content.guarantee }} /></p>
                    
                    <div style={styles.ccBanner}>
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196578.png" alt="Visa" style={styles.ccIcon} />
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196561.png" alt="MasterCard" style={styles.ccIcon} />
                        <img src="https://cdn-icons-png.flaticon.com/128/196/196539.png" alt="Amex" style={styles.ccIcon} />
                    </div>

                    <p style={styles.infoText} dangerouslySetInnerHTML={{ __html: content.infoText.replace(/\n/g, '<br/>') }} />

                    <button 
                        style={loading ? {...styles.button, ...styles.buttonLoading} : styles.button} 
                        onClick={handleSubscribe}
                        disabled={loading}
                    >
                        {loading 
                        ? (isEng ? 'Initializing Gateway...' : 'Inicializando Pasarela...') 
                        : content.buttonText}
                    </button>

                    <p style={styles.terms} dangerouslySetInnerHTML={{ __html: content.terms }} />
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
