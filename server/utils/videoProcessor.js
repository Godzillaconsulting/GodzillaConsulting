import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';

// Set the binary path so it works cross-platform seamlessly
ffmpeg.setFfmpegPath(ffmpegPath.path);

export const removeWatermark = async (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        // La marca de agua típica de servicios AI suele colocarse en la esquina inferior derecha
        // Parámetros: delogo = x, y, width, height. W/H son dinámicos según el video.
        // Haremos un box conservador. x=W-240, y=H-80, w=220, h=60
        // Para preservar la pureza, usamos -crf 18 (Casi Lossless Visual) y copia estricta de audio.

        ffmpeg(inputPath)
            .videoFilters([
                {
                    filter: 'delogo',
                    // Ajuste estándar para la marca de Kling AI
                    options: 'x=w-260:y=h-90:w=250:h=80:show=0'
                }
            ])
            .outputOptions([
                '-c:v libx264',
                '-crf 18',       // Preserva la máxima calidad del video
                '-preset slow',  // Más pesado de compilar, pero preserva más detalle
                '-c:a copy'      // No destrozar ni recomprimir el audio original
            ])
            .save(outputPath)
            .on('end', () => {
                console.log(`[VIDEO-PROCESSOR] Watermark aniquilada con éxito en: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(`[VIDEO-PROCESSOR] Error aplicando inpainting algorítmico:`, err.message);
                reject(err);
            });
    });
};
