import React from 'react';

/**
 * DynamicMedia
 * Renderiza un <video> silenciado en bucle (tipo GIF) si la URL apunta a un formato de video.
 * En caso contrario, renderiza un <img> estándar. Ideal para los slots del AdminStudio.
 */
export default function DynamicMedia({ src, alt, className, style, ...props }) {
    if (!src) return null;

    const isVideo = src.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

    if (isVideo) {
        return (
            <video 
                src={src} 
                className={className} 
                style={style} 
                autoPlay 
                loop 
                muted 
                playsInline 
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
            {...props} 
        />
    );
}
