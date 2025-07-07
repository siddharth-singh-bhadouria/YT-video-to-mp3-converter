const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');

const videoURL = process.argv[2];

function sanitizeFilename(name) {
    return name.replace(/[\/\\?%*:|"<>]/g, '-');
}

// ✅ Change: resolve with 'timeout' instead of rejecting
function timeoutPromise(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('⏰ Timeout: Using default filename.');
            resolve('timeout');
        }, ms);
    });
}

(async () => {
    let safeTitle = 'downloaded_audio'; // default fallback

    const result = await Promise.race([
        ytdl.getInfo(videoURL),
        timeoutPromise(20000) // 2-second timeout
    ]);

    if (result !== 'timeout') {
        const rawTitle = result.videoDetails.title;
        safeTitle = sanitizeFilename(rawTitle);
    }

    const outputDir = '/Users/siddharth_singh_bhadouria/Downloads/Music Collection';

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFileName = path.join(outputDir, `${safeTitle}.mp3`);
    console.log(`🎵 Downloading as: ${outputFileName}`);

    const audioStream = ytdl(videoURL, { filter: 'audioonly', quality: 'highestaudio' });

    const ffmpeg = spawn(ffmpegPath, [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-ab', '192k',
        '-vn',
        outputFileName
    ]);

    audioStream.pipe(ffmpeg.stdin);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        if (code === 0) {
            console.log(`✅ Conversion complete! Saved as ${outputFileName}`);
        } else {
            console.error(`❌ FFmpeg exited with code ${code}`);
        }
    });
})();
