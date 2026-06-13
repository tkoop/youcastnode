const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const storage = require('./utils/storage');
const binManager = require('./utils/binManager');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper for YouTube Metadata
async function fetchYouTubeMetadata(videoId) {
    try {
        const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (response.status === 200) {
            return {
                title: response.data.title || null,
                thumbnail: response.data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            };
        }
    } catch (e) {
        // Fallback
    }
    return {
        title: null,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
}

function extractYouTubeId(url) {
    const pattern = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const matches = url.match(pattern);
    return matches ? matches[1] : null;
}

// Routes
app.get('/', (req, res) => {
    const feeds = storage.getFeeds();
    res.render('home', { feeds });
});

app.post('/feeds/create', (req, res) => {
    const { name } = req.body;
    if (!name) return res.redirect('/');
    const feed = storage.createFeed(name);
    res.redirect(`/feeds/${feed.id}/edit`);
});

app.get('/feeds/:id/edit', async (req, res) => {
    const feed = storage.getFeed(req.params.id);
    if (!feed) return res.status(404).send('Feed not found');
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const rssUrl = `${baseUrl}/feeds/${feed.id}.rss`;
    const qrCode = await QRCode.toDataURL(rssUrl);

    res.render('feed/edit', { feed, baseUrl, qrCode });
});

app.post('/feeds/:id/update', async (req, res) => {
    const feed = storage.getFeed(req.params.id);
    if (!feed) return res.status(404).send('Feed not found');

    if (req.body.name) feed.name = req.body.name;
    if (req.body.description !== undefined) feed.description = req.body.description;
    if (req.body.author !== undefined) feed.author = req.body.author;

    if (req.body.youtube_url) {
        const videoId = extractYouTubeId(req.body.youtube_url);
        const metadata = videoId ? await fetchYouTubeMetadata(videoId) : { title: null, thumbnail: null };
        
        feed.episodes.push({
            id: uuidv4().substring(0, 8),
            youtube_url: req.body.youtube_url,
            video_id: videoId,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            added_at: new Date().toISOString()
        });
    }

    if (req.body.remove_episode) {
        feed.episodes = feed.episodes.filter(ep => ep.id !== req.body.remove_episode);
    }

    feed.updated_at = new Date().toISOString();
    storage.saveFeed(feed);
    res.redirect(`/feeds/${feed.id}/edit`);
});

app.get('/feeds/:id.rss', (req, res) => {
    const feed = storage.getFeed(req.params.id);
    if (!feed) return res.status(404).send('Feed not found');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const editUrl = `${baseUrl}/feeds/${feed.id}/edit`;
    
    let items = feed.episodes.map(ep => {
        const audioUrl = `${baseUrl}/feeds/${feed.id}/episodes/${ep.id}/audio`;
        return `
        <item>
            <title>${escapeXml(ep.title || 'Unknown Title')}</title>
            <description>${escapeXml(ep.youtube_url || '')}</description>
            <link>${audioUrl}</link>
            <guid isPermaLink="false">${ep.id}</guid>
            <pubDate>${new Date(ep.added_at).toUTCString()}</pubDate>
            <enclosure url="${audioUrl}" type="audio/mpeg" length="0"/>
        </item>`;
    }).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
    <channel>
        <title>${escapeXml(feed.name)}</title>
        <description>${escapeXml(feed.description || '')}&#10;&#10;Edit this podcast: ${editUrl}</description>
        <link>${baseUrl}/feeds/${feed.id}.rss</link>
        <language>${feed.language || 'en'}</language>
        ${feed.author ? `<itunes:author>${escapeXml(feed.author)}</itunes:author>` : ''}
        ${items}
    </channel>
</rss>`;

    res.set('Content-Type', 'application/xml');
    res.send(rss);
});

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

app.get('/feeds/:id/episodes/:episodeId/audio', async (req, res) => {
    const feed = storage.getFeed(req.params.id);
    if (!feed) return res.status(404).send('Feed not found');

    const episode = feed.episodes.find(ep => ep.id === req.params.episodeId);
    if (!episode) return res.status(404).send('Episode not found');

    const ytDlpPath = path.join(binManager.BIN_DIR, os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    const finalYtDlpPath = fs.existsSync(ytDlpPath) ? ytDlpPath : 'yt-dlp';
    
    if (!fs.existsSync(ytDlpPath) && finalYtDlpPath === 'yt-dlp') {
        // Try to download if not present
        try {
            await binManager.downloadYtDlp();
        } catch (e) {
            console.error('Failed to download yt-dlp on demand:', e);
        }
    }

    // Improved arguments to bypass some YouTube restrictions
    let args = [
        '--quiet',
        '--no-progress',
        '-f', 'ba/b',
        '--no-playlist',
        '--no-warnings',
        '--extractor-args', 'youtube:player_client=ios,android,web',
        '--no-check-certificates',
        '--prefer-free-formats',
        '-o', '-',
        episode.youtube_url
    ];
    
    console.log(`Executing: ${finalYtDlpPath} ${args.join(' ')}`);
    
    // Explicitly send headers to start the response
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="episode_${episode.id}.mp3"`,
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache, must-revalidate',
        'Connection': 'keep-alive'
    });

    const ytDlp = spawn(finalYtDlpPath, args);
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-b:a', '128k',
        '-acodec', 'libmp3lame',
        '-map', '0:a',
        '-'
    ]);

    ytDlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    // Draining stderr to prevent blocking
    let ytDlpError = '';
    ytDlp.stderr.on('data', (data) => {
        const msg = data.toString();
        ytDlpError += msg;
        if (msg.toLowerCase().includes('error')) {
            console.error(`yt-dlp error: ${msg}`);
        }
    });

    let ffmpegError = '';
    ffmpeg.stderr.on('data', (data) => {
        const msg = data.toString();
        ffmpegError += msg;
        // Optional: log ffmpeg start info
        if (msg.includes('Output #0')) {
            console.log('ffmpeg started transcoding');
        }
    });

    ytDlp.on('error', (err) => {
        console.error('yt-dlp process error:', err);
        ffmpeg.kill();
        if (!res.writableEnded) res.end();
    });

    ffmpeg.on('error', (err) => {
        console.error('ffmpeg process error:', err);
        ytDlp.kill();
        if (!res.writableEnded) res.end();
    });

    ytDlp.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`yt-dlp closed with code ${code}. Last error: ${ytDlpError}`);
        }
        ffmpeg.stdin.end();
    });

    ffmpeg.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`ffmpeg closed with code ${code}. Last error: ${ffmpegError}`);
        }
        if (!res.writableEnded) res.end();
    });

    req.on('close', () => {
        console.log('Client closed connection');
        ytDlp.kill();
        ffmpeg.kill();
    });
});

// Initial check
(async () => {
    try {
        await binManager.downloadYtDlp();
        const hasFfmpeg = await binManager.checkFfmpeg();
        if (!hasFfmpeg) {
            console.error('ffmpeg not found! Please install ffmpeg.');
        }
    } catch (e) {
        console.error('Error during initialization:', e);
    }

    app.listen(port, () => {
        console.log(`YouCastNode listening at http://localhost:${port}`);
    });
})();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});
