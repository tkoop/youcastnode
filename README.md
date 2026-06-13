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

- **Node.js** (v18 or higher recommended)
- **FFmpeg** must be installed on your system.
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: Download from ffmpeg.org and add to PATH.

## Installation

1. Clone or download this directory.
2. Open a terminal in the `youcastnode` directory.
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

1. Start the server:
   ```bash
   npm start
   ```
2. The app will be available at `http://localhost:3000` (or the port specified in your environment).

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
