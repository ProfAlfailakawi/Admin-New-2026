FROM node:20-alpine

# Use a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./

# Use npm ci for deterministic, reproducible installs
RUN npm ci

COPY . .

# Run the production build step
RUN npm run build

# Compile server.ts once here. Starting with `npx tsx server.ts` re-transpiled it on every
# cold start, and Cloud Run pays a cold start each time the service wakes from zero.
RUN npm run build:server

# Change ownership of the app files to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the precompiled server directly: no npx and no on-the-fly TypeScript at startup.
CMD ["node", "dist-server/server.mjs"]
