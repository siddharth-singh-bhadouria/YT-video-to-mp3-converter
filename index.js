require('dotenv').config();

const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');

const filePath = process.env.FILE_PATH;

const videoURL = process.argv[2];

function sanitizeFilename(name) {
    return name.replace(/[\/\\?%*:|"<>]/g, '-');
}

// ✅ Change: resolve with 'timeout' instead of rejecting
function cancellableTimeoutPromise(ms) {
    let timeoutId;
    const promise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            console.log('⏰ Timeout: Using default filename.');
            resolve('timeout');
        }, ms);
    });
    return { promise, cancel: () => clearTimeout(timeoutId) };
}

(async () => {
    let safeTitle = 'downloaded_audio'; // default fallback

    const { promise: timeoutP, cancel } = cancellableTimeoutPromise(20000);

    const result = await Promise.race([
        ytdl.getInfo(videoURL),
        timeoutP // 20-second max timeout
    ]);

    if (result !== 'timeout') {
        cancel(); // ✅ Cancel the pending timeout if getInfo succeeded
        const rawTitle = result.videoDetails.title;
        safeTitle = sanitizeFilename(rawTitle);
    }
    const outputDir = filePath;

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
