FROM node:20

WORKDIR /app

# Backend: bağımlılıkları yükle
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend: kaynak kodu kopyala
COPY backend/ ./backend/

# Frontend: bağımlılıkları yükle
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Frontend: kaynak kodu kopyala ve build et (çıktı → /app/backend/public)
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
