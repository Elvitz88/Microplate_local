# Use Debian-based image to ensure Prisma OpenSSL compatibility
FROM node:20-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
# Install dependencies with yarn (retry on network failures)
RUN yarn install --frozen-lockfile --network-timeout 300000 || \
    (sleep 2 && yarn install --frozen-lockfile --network-timeout 300000) || \
    (sleep 4 && yarn install --frozen-lockfile --network-timeout 300000)

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
# Ensure OpenSSL available at runtime for Prisma engines
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 6404

# Set environment variables
ENV NODE_ENV=production
ENV PORT=6404

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6404/api/v1/result/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Result API reads data from the prediction DB; migrations are owned by the prediction-db service.
CMD ["node", "dist/src/server.js"]
