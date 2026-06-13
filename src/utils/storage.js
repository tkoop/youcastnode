const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_DIR = path.join(__dirname, '../../storage/feeds');

if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function getFeeds() {
    const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'));
    return files.map(file => {
        const content = fs.readFileSync(path.join(STORAGE_DIR, file), 'utf8');
        return JSON.parse(content);
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getFeed(id) {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveFeed(feed) {
    const filePath = path.join(STORAGE_DIR, `${feed.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(feed, null, 2));
}

function createFeed(name) {
    const feed = {
        id: uuidv4(),
        name: name,
        description: '',
        author: '',
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        episodes: []
    };
    saveFeed(feed);
    return feed;
}

module.exports = {
    getFeeds,
    getFeed,
    saveFeed,
    createFeed,
    STORAGE_DIR
};
