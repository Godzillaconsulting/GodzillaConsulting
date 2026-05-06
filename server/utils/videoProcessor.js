import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Set the binary paths so it works cross-platform seamlessly
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export const removeWatermark = async (inputPath, outputPath, onProgress = () => {}) => {
    return new Promise((resolve, reject) => {
        // Usar ffprobe para obtener ancho y alto absoluto y evitar un Crash de sintaxis W/H
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            let filterChain = [];
            if (!err && metadata && metadata.streams) {
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                if (videoStream) {
                    const width = videoStream.width || 1280;
                    const height = videoStream.height || 720;
                    
                    if (height > width) {
                        // Video Vertical (Reels/Shorts/TikTok)
                        // TikTok Top-Left, CapCut Top-Right, TikTok/Shorts Bottom-Right
                        const bw = 350;
                        const bh = 150;
                        const fw = Math.min(bw, width);
                        const fh = Math.min(bh, height);
                        
                        // Top Left
                        const tlX = 10; const tlY = 10;
                        // Top Right
                        const trX = Math.max(0, width - fw - 10); const trY = 10;
                        // Bottom Right
                        const brX = Math.max(0, width - fw - 10); const brY = Math.max(0, height - fh - 50);

                        filterChain.push(`delogo=x=${tlX}:y=${tlY}:w=${fw}:h=${fh}:show=0`);
                        filterChain.push(`delogo=x=${trX}:y=${trY}:w=${fw}:h=${fh}:show=0`);
                        filterChain.push(`delogo=x=${brX}:y=${brY}:w=${fw}:h=${fh}:show=0`);
                    } else {
                        // Video Horizontal (Kling AI / Runway)
                        const bw = 250;
                        const bh = 80;
                        const bx = Math.max(0, width - bw - 10);
                        const by = Math.max(0, height - bh - 10);
                        const fw = Math.min(bw, width);
                        const fh = Math.min(bh, height);
                        filterChain.push(`delogo=x=${bx}:y=${by}:w=${fw}:h=${fh}:show=0`);
                    }
                }
            }
            if(filterChain.length === 0) filterChain.push('delogo=x=10:y=10:w=100:h=60:show=0');

            ffmpeg(inputPath)
                .videoFilters(filterChain)
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

export const detectSilences = async (inputPath, threshold = '-35dB', duration = 0.5) => {
    return new Promise((resolve, reject) => {
        let silences = [];
        let currentSilence = {};

        ffmpeg(inputPath)
            .audioFilters(`silencedetect=noise=${threshold}:d=${duration}`)
            .outputOptions('-f', 'null')
            .on('stderr', (line) => {
                const silenceStartMatch = line.match(/silence_start: ([\d.]+)/);
                if (silenceStartMatch) currentSilence.start = parseFloat(silenceStartMatch[1]);
                
                const silenceEndMatch = line.match(/silence_end: ([\d.]+)/);
                if (silenceEndMatch) {
                    currentSilence.end = parseFloat(silenceEndMatch[1]);
                    silences.push({ ...currentSilence });
                    currentSilence = {};
                }
            })
            .on('end', () => {
                resolve(silences);
            })
            .on('error', (err) => {
                console.error('[VIDEO-PROCESSOR] Error en silencedetect:', err);
                reject(err);
            })
            .save(path.join(os.tmpdir(), 'nul')); // compatible cross-platform fake output
    });
};
