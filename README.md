# YouCastNode

Turn YouTube videos into podcasts. This is a Node.js port of the original Laravel YouCast project.

## Features

- Create multiple podcast feeds.
- Add YouTube videos as episodes.
- Real-time audio streaming (converts YouTube video to MP3 on the fly).
- No Nginx required (built-in Express server).
- Auto-downloads `yt-dlp`.
- JSON file-based storage.

## Prerequisites

### For Local Development
- **Node.js** (v18 or higher recommended)
- **FFmpeg** must be installed on your system.
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Download from ffmpeg.org and add to PATH.

### For Docker
- **Docker** and **Docker Compose** (optional but recommended)

## Installation

### Option 1: Local Installation

1. Clone or download this directory.
2. Open a terminal in the `youcastnode` directory.
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

### Option 1: Local Installation

1. Start the server:
   ```bash
   npm start
   ```
2. The app will be available at `http://localhost:3000` (or the port specified in your environment).

### Option 2: Docker

#### Using Docker CLI

1. Build the Docker image:
   ```bash
   docker build -t youcastnode .
   ```

2. Run the container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v youcastnode-storage:/app/storage \
     --name youcastnode \
     youcastnode
   ```

   The app will be available at `http://localhost:3000`.

#### Using Docker Compose

1. Create a `docker-compose.yml` file in the project root (if one doesn't exist):
   ```yaml
   version: '3.8'
   
   services:
     youcastnode:
       build: .
       container_name: youcastnode
       ports:
         - "3000:3000"
       volumes:
         - youcastnode-storage:/app/storage
       environment:
         - NODE_ENV=production
         - PORT=3000
       restart: unless-stopped
   
   volumes:
     youcastnode-storage:
   ```

2. Start the container:
   ```bash
   docker-compose up -d
   ```

3. Stop the container:
   ```bash
   docker-compose down
   ```

#### Accessing the App in Docker

- **Local machine**: Open `http://localhost:3000` in your browser.
- **From another device on the network**: Use your host machine's IP address (e.g., `http://192.168.1.50:3000`).

#### Persisting Data

The Docker setup uses a named volume (`youcastnode-storage`) to persist your storage data (feeds, cookies, etc.) between container restarts. Your data will be preserved even if the container is removed.

To back up your data:
```bash
docker run --rm -v youcastnode-storage:/app/storage -v $(pwd):/backup \
  alpine tar czf /backup/youcastnode-backup.tar.gz -C /app storage
```

## Capturing YouTube Cookies

To access age-restricted or private videos, you can provide YouTube cookies:

1. Use a browser extension like "Get cookies.txt LOCALLY" (for Chrome/Edge/Firefox) to export your YouTube cookies as a **JSON** file.
2. Rename the file to `cookies.json`.
3. Place `cookies.json` in the `storage/` directory of this project.
4. In the app, go to your podcast settings and click **"Load Cookies from cookies.json"**.

## Local Network Access

To access YouCastNode from another device on your network:

1. Find your computer's local IP address (e.g., `192.168.1.50`).
2. On the other device, open a browser and go to `http://192.168.1.50:3000`.
