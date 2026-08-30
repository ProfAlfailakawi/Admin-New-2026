FROM node:20-alpine

# Use a non-root user for security
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./

# Use npm ci for deterministic, reproducible installs
RUN npm ci

COPY . .

# Run the production build step
RUN npm run build

# Change ownership of the app files to the non-root user
# RUN chown -R appuser:appgroup /app

# USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Execute compiled typescript natively if possible or fallback to tsx
CMD ["npx", "tsx", "server.ts"]
