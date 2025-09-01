FROM node:20-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Копируем оба манифеста (если lock-файл есть — попадёт в слой)
COPY package*.json ./

# Если есть package-lock.json — используем ci; иначе fallback на install
RUN if [ -f package-lock.json ]; then \
    npm ci --omit=dev; \
    else \
    npm install --omit=dev; \
    fi

# Кладём исходники
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]