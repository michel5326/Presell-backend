FROM node:22-slim

# Instalar dependências do Chromium (Playwright)
RUN apt-get update && apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libgtk-3-0 \
  fonts-liberation \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# instalar dependências
COPY package*.json ./
RUN npm ci

# instalar playwright (somente chromium)
RUN npx playwright install chromium

# copiar código
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
