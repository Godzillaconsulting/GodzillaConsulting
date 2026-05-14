FROM node:20-bookworm

# Instalar dependencias para Puppeteer (Chromium), Canvas y FFmpeg
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    libnss3 \
    libxss1 \
    libasound2 \
    fonts-liberation \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Instalar PM2 y pnpm globalmente
RUN npm install -g pm2 pnpm

# Preparar dependencias con pnpm
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY server/package.json ./server/

RUN pnpm install

# Copiar el resto del código
COPY . .

# Construir el frontend Vite
RUN pnpm run build || true

EXPOSE 3000 3002 8080 5173

# Arrancar el ecosistema completo con pm2-runtime
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
