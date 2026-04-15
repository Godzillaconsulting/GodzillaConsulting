import React, { useRef, useEffect, useState } from 'react';
import { getYouTubeId } from './MediaPicker';

/**
 * DynamicMedia
 * Renderiza un <video> silenciado en bucle (tipo GIF) si la URL apunta a un formato de video.
 * En caso contrario, renderiza un <img> estándar o un iframe de YouTube si es un enlace de YT.
 */
export default function DynamicMedia({ src, alt, className, style, ...props }) {
    const videoRef = useRef(null);
    const hasTracked = useRef({ 25: false, 50: false, 75: false, 100: false });

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const { currentTime, duration } = videoRef.current;
        if (!duration) return;

        const percent = (currentTime / duration) * 100;
        let milestone = 0;

        if (percent >= 100 && !hasTracked.current[100]) milestone = 100;
        else if (percent >= 75 && !hasTracked.current[75]) milestone = 75;
        else if (percent >= 50 && !hasTracked.current[50]) milestone = 50;
        else if (percent >= 25 && !hasTracked.current[25]) milestone = 25;

        if (milestone > 0) {
            hasTracked.current[milestone] = true;
            // Analytics disabled due to Failsafe
        }
    };

    useEffect(() => {
        if (!videoRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                // Return gracefully if browsers block autoplay
                videoRef.current.play().catch(() => {});
            } else {
                videoRef.current.pause();
            }
        }, { threshold: 0.05 }); // Start buffering slightly before fully visible
        
        observer.observe(videoRef.current);
        return () => {
            if (videoRef.current) observer.unobserve(videoRef.current);
            observer.disconnect();
        };
    }, [src]);

    if (!src || typeof src !== 'string') return null;

    const ytId = getYouTubeId(src);
    if (ytId) {
        return (
            <iframe
                src={`https://www.youtube.com/embed/${ytId}?controls=0&mute=1&autoplay=1&loop=1&playlist=${ytId}`}
                className={className}
                style={{ ...style, pointerEvents: 'none' }}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                {...props}
            />
        );
    }

    const isVideo = src.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

    if (isVideo) {
        return (
            <video 
                ref={videoRef}
                src={src} 
                className={className} 
                style={style} 
                preload="metadata"
                loop 
                muted 
                playsInline 
                onTimeUpdate={handleTimeUpdate}
                {...props} 
            />
        );
    }

    return (
        <img 
            src={src} 
            alt={alt || "Media"} 
            className={className} 
            style={style} 
            loading="lazy"
            {...props} 
        />
    );
}
