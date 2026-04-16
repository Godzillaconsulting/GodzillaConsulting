import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';

// Set the binary paths so it works cross-platform seamlessly
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export const removeWatermark = async (inputPath, outputPath, onProgress = () => {}) => {
    return new Promise((resolve, reject) => {
        // Usar ffprobe para obtener ancho y alto absoluto y evitar un Crash de sintaxis W/H
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            let optionsStr = 'x=10:y=10:w=100:h=60:show=0'; // Fallback
            if (!err && metadata && metadata.streams) {
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                if (videoStream) {
                    const width = videoStream.width || 1280;
                    const height = videoStream.height || 720;
                    // Marca típica en esquina inferior derecha (e.g. Kling AI)
                    const bw = 250;
                    const bh = 80;
                    // Proteger de coordenadas negativas si el video es de muy baja resolución
                    const bx = Math.max(0, width - bw - 10);
                    const by = Math.max(0, height - bh - 10);
                    // Proteger ancho y altura si son más grandes que el marco real
                    const fw = Math.min(bw, width);
                    const fh = Math.min(bh, height);
                    optionsStr = `x=${bx}:y=${by}:w=${fw}:h=${fh}:show=0`;
                }
            } else {
                console.warn("[VIDEO-PROCESSOR] ffprobe no pudo parsear video, usando bounding box seguro.", err);
            }

            ffmpeg(inputPath)
                .videoFilters([
                    {
                        filter: 'delogo',
                        options: optionsStr
                    }
                ])
                .outputOptions([
                    '-c:v libx264',
                    '-crf 12',       // Calidad Near-Lossless (Casi Cero Pérdida) solicitado por admin
                    '-preset slow',  // Más pesado de compilar, pero preserva más detalle
                    '-c:a copy'      // No destrozar ni recomprimir el audio original
                ])
                .on('progress', (progress) => { 
                     if(progress.percent) onProgress(Math.floor(progress.percent)); 
                })
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
    });
};
