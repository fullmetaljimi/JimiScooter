# Dockerfile for JimiScooter Telegram Bot
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json if present
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Set environment variables (override with Docker secrets or env at runtime)
# ENV TELEGRAM_BOT_TOKEN=your_token_here
# ENV TELEGRAM_CHAT_ID=your_chat_id_here

# Expose no ports (script runs as a bot)

# Default command: run subito_watcher.js
CMD ["node", "src/subito_watcher.js"]
