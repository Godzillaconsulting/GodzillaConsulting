import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const videoUrl = 'https://cdn.coverr.co/videos/coverr-a-person-typing-on-a-laptop-5291/1080p.mp4';

console.log("Probando ffmpeg con coverr URL:", videoUrl);

ffmpeg(videoUrl)
    .outputOptions(['-t 2', '-c:v copy'])
    .save('test_coverr.mp4')
    .on('end', () => console.log('Éxito!'))
    .on('error', (err) => console.error('Error FFmpeg:', err.message));
