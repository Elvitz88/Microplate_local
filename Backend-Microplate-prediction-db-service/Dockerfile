FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    ca-certificates

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npm install
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:18-alpine AS runner

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    ca-certificates

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 6406

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6406/api/v1/health/ready', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
