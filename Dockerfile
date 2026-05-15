FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
EXPOSE 8080
CMD ["npm", "start"]
