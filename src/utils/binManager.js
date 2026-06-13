const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const os = require('os');

const BIN_DIR = path.join(__dirname, '../../bin');

async function downloadYtDlp() {
    const platform = os.platform();
    let filename = 'yt-dlp';
    let url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

    if (platform === 'win32') {
        filename = 'yt-dlp.exe';
        url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (platform === 'darwin') {
        url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    }

    const targetPath = path.join(BIN_DIR, filename);

    if (fs.existsSync(targetPath)) {
        console.log('yt-dlp already exists.');
        return targetPath;
    }

    console.log(`Downloading yt-dlp from ${url}...`);
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            if (platform !== 'win32') {
                fs.chmodSync(targetPath, 0755);
            }
            console.log('yt-dlp downloaded successfully.');
            resolve(targetPath);
        });
        writer.on('error', reject);
    });
}

// For ffmpeg, we usually expect it to be on the system, 
// but we can check if it's available.
function checkFfmpeg() {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version']);
        proc.on('error', () => resolve(false));
        proc.on('exit', (code) => resolve(code === 0));
    });
}

module.exports = { downloadYtDlp, checkFfmpeg, BIN_DIR };
