import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useSiteData } from '../context/SiteContext';
import DynamicMedia from './DynamicMedia';
import logoCeoCuts    from '../assets/Logos/CEO Cuts Logo@2x.png';
import logoCircleOne  from '../assets/Logos/Circle One Logo@2x.png';
import logoFacemaker  from '../assets/Logos/Facemaker Logo@2x.png';
import logoGrupoMrg   from '../assets/Logos/Grupo MRG Logo@2x.png';
import logoMedhaus    from '../assets/Logos/Medhaus Logo@2x.png';
import logoArtika     from '../assets/Logos/Artika Logo@2x.png';
import logoDonElote   from '../assets/Logos/Don Elote Logo@2x.png';
import logoNutrisa    from '../assets/Logos/Nutrisa Logo@2x.png';
import logoSanAntonio from '../assets/Logos/San Antonio Logo@2x.png';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de logos estáticos: clave = substring del nombre del cliente (minúsculas)
// Estos logos siempre se sirven desde el bundle de Vite (hash estable en build).
// Agregar aquí cualquier nuevo cliente cuyo logo esté en /assets/Logos/.
// ─────────────────────────────────────────────────────────────────────────────
const LOGO_BY_NAME = {
    'facemaker':   logoFacemaker,
    'circle one':  logoCircleOne,
    'ceo cuts':    logoCeoCuts,
    'medhaus':     logoMedhaus,
    'artika':      logoArtika,
    'grupo mrg':   logoGrupoMrg,
    'mrg':         logoGrupoMrg,
    'don elote':   logoDonElote,
    'elote':       logoDonElote,
    'nutrisa':     logoNutrisa,
    'san antonio': logoSanAntonio,
};

/**
 * Resuelve qué imagen mostrar para una tarjeta del carrusel.
 *
 * Orden de prioridad:
 *  1. Si el nombre del cliente coincide con LOGO_BY_NAME → usa el import de Vite
 *     (siempre correcto, independiente de lo que haya en la DB)
 *  2. Si logoSrc es una URL de media *subida por el usuario* (/api/media/file/)
 *     o una URL de blob (preview en tiempo real) → úsala directamente
 *  3. Fallback: logoFacemaker
 *
 * Intencionalmente NO se usan:
 *  - Paths compilados de Vite guardados en la DB (/assets/Nombre-HASH.png)
 *    porque el hash cambia con cada deploy y se vuelven obsoletos.
 *  - URLs genéricas de /api/media/assets/ porque esos archivos pueden
 *    no existir en el servidor de media.
 */
function getLogoSrc(item) {
    // 1. Logo subido manualmente por el usuario (URL de la DB local o blob en vivo)
    if (item.logoSrc && typeof item.logoSrc === 'string') {
        const lc = item.logoSrc.toLowerCase().trim();
        if (
            lc.includes('/api/media/file/') ||
            lc.startsWith('blob:') ||
            lc.startsWith('data:')
        ) {
            return item.logoSrc;
        }
    }

    // 2. Fallback 1: Resolver por nombre del cliente (Logos pre-empaquetados)
    if (item.nombre && typeof item.nombre === 'string') {
        const nameLc = item.nombre.toLowerCase().trim();
        for (const [keyword, logo] of Object.entries(LOGO_BY_NAME)) {
            if (nameLc.includes(keyword)) return logo;
        }
    }

    // 3. Fallback 2: Definitivo
    return logoFacemaker;
}

// Casos por defecto cuando la DB no tiene datos de portafolio
const defaultCases = [
    { _id: 'default-1', orden: 1, nombre: 'Facemaker',  category: 'Clínica Estética',       link: '' },
    { _id: 'default-2', orden: 2, nombre: 'Circle One', category: 'Hotelería',               link: '' },
    { _id: 'default-3', orden: 3, nombre: 'CEO Cuts',   category: 'Barbería',                link: '' },
    { _id: 'default-4', orden: 4, nombre: 'Medhaus',    category: 'Sector Médico',           link: '' },
    { _id: 'default-5', orden: 5, nombre: 'Artika',     category: 'Heladerías',              link: '' },
    { _id: 'default-6', orden: 6, nombre: 'Grupo MRG',  category: 'Banquetes y Eventos',     link: '' },
    { _id: 'default-7', orden: 7, nombre: 'Nutrisa',    category: 'Sector Alimenticio',      link: '' },
    { _id: 'default-8', orden: 8, nombre: 'San Antonio',category: 'Sector Médico',           link: '' },
    { _id: 'default-9', orden: 9, nombre: 'Don Elote',  category: 'Sector Alimenticio',      link: '' },
];

const SPEED = 0.6; // px por frame

const CasosExito = () => {
    const { t, i18n } = useTranslation();
    const { getNodeData } = useSiteData();
    const nodeData = getNodeData('portafolio') || {};
    const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;

    const scrollContainerRef = useRef(null);
    const animFrameRef       = useRef(null);
    const isPausedRef        = useRef(false);

    const [isDragging,      setIsDragging]      = useState(false);
    const [startX,          setStartX]          = useState(0);
    const [scrollLeftState, setScrollLeftState] = useState(0);

    // ── Typewriter effect ──────────────────────────────────────────────────
    const rawTitle = isSpanish ? (nodeData.title || t('portfolio.title')) : t('portfolio.title');
    const [typedTitle,   setTypedTitle]   = useState('');
    const [startTyping,  setStartTyping]  = useState(false);
    const titleContainerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStartTyping(true);
                } else {
                    setStartTyping(false);
                    setTypedTitle('');
                }
            },
            { threshold: 0.3 }
        );
        if (titleContainerRef.current) observer.observe(titleContainerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!startTyping) return;
        let i = 0;
        let current = '';
        const interval = setInterval(() => {
            if (i < rawTitle.length) {
                current += rawTitle.charAt(i);
                setTypedTitle(current);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 120);
        return () => clearInterval(interval);
    }, [rawTitle, startTyping]);

    // ── Construir lista de casos desde nodeData ────────────────────────────
    const displayCases = useMemo(() => {
        // Detectar cuántos casos hay en el nodo
        let maxIdx = 0;
        Object.keys(nodeData).forEach(k => {
            if (k.startsWith('caso') && k.endsWith('Nombre')) {
                const num = parseInt(k.replace('caso', '').replace('Nombre', ''), 10);
                if (!isNaN(num) && num > maxIdx) maxIdx = num;
            }
        });

        if (maxIdx > 0) {
            const mapped = [];
            for (let i = 1; i <= maxIdx; i++) {
                const nombre   = nodeData[`caso${i}Nombre`]   || '';
                const category = nodeData[`caso${i}Category`] || '';
                const logoSrc  = nodeData[`caso${i}LogoUrl`]  || '';
                const link     = nodeData[`caso${i}Link`]     || '';

                // Incluir el caso si tiene nombre o categoría
                if (nombre || category) {
                    mapped.push({ _id: `node-${i}`, orden: i, nombre, category, logoSrc, link });
                }
            }
            if (mapped.length > 0) return mapped;
        }

        return defaultCases;
    }, [nodeData]);

    // Duplicamos para el loop infinito del scroll
    const allCases = useMemo(() => [...displayCases, ...displayCases], [displayCases]);

    // ── Auto-scroll (RAF) ──────────────────────────────────────────────────
    const animate = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el || isPausedRef.current) {
            animFrameRef.current = requestAnimationFrame(animate);
            return;
        }
        el.scrollLeft += SPEED;
        const halfWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= halfWidth) el.scrollLeft -= halfWidth;
        animFrameRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [animate]);

    // ── Drag & touch handlers ──────────────────────────────────────────────
    const onMouseEnter = () => { isPausedRef.current = true; };
    const onMouseLeave = () => { isPausedRef.current = false; setIsDragging(false); };
    const onMouseDown  = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeftState(scrollContainerRef.current.scrollLeft);
    };
    const onMouseUp   = () => setIsDragging(false);
    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x    = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
    };

    const touchStartX    = useRef(0);
    const touchScrollLeft = useRef(0);
    const onTouchStart = (e) => {
        isPausedRef.current = true;
        touchStartX.current    = e.touches[0].pageX;
        touchScrollLeft.current = scrollContainerRef.current.scrollLeft;
    };
    const onTouchEnd  = () => { isPausedRef.current = false; };
    const onTouchMove = (e) => {
        const walk = (touchStartX.current - e.touches[0].pageX) * 1.5;
        scrollContainerRef.current.scrollLeft = touchScrollLeft.current + walk;
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <section id="portafolio" className="py-24 bg-[#111111] relative overflow-hidden">
            {/* Dot grid decoration */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
            />

            <div className="container mx-auto px-6 max-w-7xl relative z-10">
                <div ref={titleContainerRef} className="text-center mb-16">
                    {nodeData.overline && (
                        <span className="block text-[#CC0000] font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base drop-shadow-lg">
                            {isSpanish ? (nodeData.overline || t('portfolio.overline')) : t('portfolio.overline')}
                        </span>
                    )}
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter inline-block animate-blink-cursor">
                        {typedTitle}
                    </h2>
                    <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                        {isSpanish ? (nodeData.subtitle || t('portfolio.subtitle')) : t('portfolio.subtitle')}
                    </p>
                </div>

                {/* Carrusel con fade lateral */}
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#111111] to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#111111] to-transparent z-10 pointer-events-none" />

                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto hide-scrollbar py-8 px-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        onMouseDown={onMouseDown}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                        onTouchMove={onTouchMove}
                    >
                        {allCases.map((item, idx) => {
                            const cardContent = (
                                <>
                                    <div className="absolute -inset-1 bg-[#CC0000] rounded-[2rem] z-[-1] opacity-0 group-hover/card:opacity-100 transition-opacity blur-sm" />
                                    <div className="absolute inset-0 bg-[#1A1A1A] rounded-[2rem] z-0" />
                                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 gap-6 pointer-events-none">
                                        <div className="flex-1 flex items-center justify-center w-full">
                                            <DynamicMedia
                                                src={getLogoSrc(item)}
                                                alt={item.nombre || 'Caso de Éxito'}
                                                className="max-h-36 w-full object-contain opacity-60 group-hover/card:opacity-100 group-hover/card:scale-110 transition-all duration-300 px-4"
                                                draggable="false"
                                            />
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-300 text-center font-medium mt-auto border-t border-[#CC0000]/30 w-full pt-3 px-2 truncate">
                                            {isSpanish
                                                ? item.category
                                                : (item.category ? t(`portfolio.categories.${item.category}`, item.category) : item.category)
                                            }
                                        </div>
                                    </div>
                                </>
                            );

                            const cardClass = `flex-none w-[280px] md:w-[350px] aspect-square relative bg-[#1A1A1A] rounded-[2rem] border-2 border-transparent hover:border-[#CC0000] transition-all duration-300 group/card shadow-lg hover:shadow-[0_0_30px_rgba(204,0,0,0.3)] ${item.link ? (!isDragging ? 'cursor-pointer' : 'cursor-grabbing') : 'cursor-default'}`;

                            return item.link ? (
                                <a
                                    key={`${item._id}-${idx}`}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cardClass}
                                    draggable="false"
                                >
                                    {cardContent}
                                </a>
                            ) : (
                                <div
                                    key={`${item._id}-${idx}`}
                                    className={cardClass}
                                    draggable="false"
                                >
                                    {cardContent}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CasosExito;
