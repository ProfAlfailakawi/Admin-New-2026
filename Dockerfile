FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY server.mjs ./
ENV PORT=8080
CMD ["npm", "start"]
