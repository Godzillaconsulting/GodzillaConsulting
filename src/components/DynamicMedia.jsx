import React, { useRef } from 'react';

/**
 * DynamicMedia
 * Renderiza un <video> silenciado en bucle (tipo GIF) si la URL apunta a un formato de video.
 * En caso contrario, renderiza un <img> estándar. Ideal para los slots del AdminStudio.
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
            const backendUrl = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
            fetch(`${backendUrl}/api/analytics/video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionStorage.getItem('gz_session_id') || 'unknown',
                    video_id: src.split('/').pop().substring(0, 50),
                    percentage: milestone,
                    drop_off_second: Math.floor(currentTime)
                })
            }).catch(() => {});
        }
    };

    if (!src) return null;

    const isVideo = src.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

    if (isVideo) {
        return (
            <video 
                ref={videoRef}
                src={src} 
                className={className} 
                style={style} 
                autoPlay 
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
            {...props} 
        />
    );
}
