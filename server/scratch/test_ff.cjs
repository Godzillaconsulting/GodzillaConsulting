const ffmpegPath = require('ffmpeg-static');
const { execSync } = require('child_process');
const cmd = `"${ffmpegPath}" -y -i outputs/task_1_scene_1_broll.mp4 -vf "subtitles='outputs/task_1_scene_1_en.srt':force_style='FontName=Arial,FontSize=100,PrimaryColour=&H00FFFFFF&,Alignment=2,MarginV=300'" -t 5 outputs/test.mp4`;
try {
    execSync(cmd, { stdio: 'pipe' });
    console.log("Success!");
} catch (e) {
    console.error("Error output:", e.stderr.toString());
}
