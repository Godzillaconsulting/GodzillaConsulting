import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log('Starting compression. This might take a minute...');

ffmpeg('src/assets/Intro LP_final.mp4')
  .outputOptions([
    '-c:v libx264',
    '-crf 28',
    '-preset fast',
    '-movflags +faststart' // Optimizes mp4 for web playback
  ])
  .save('src/assets/Intro_LP_final_Optimized.mp4')
  .on('end', () => console.log('Compression finished!'))
  .on('error', (err) => console.error('Error:', err));
