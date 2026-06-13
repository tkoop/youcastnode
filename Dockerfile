FROM node:18-slim

# Install FFmpeg which is required for audio conversion
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose the default port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
