FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL 3
RUN apk add --no-cache openssl

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --network-timeout 600000

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN yarn prisma:generate

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# กันหลง build เก่า
RUN rm -rf dist && npm run build && (echo "=== ls dist ===" && ls -la dist || true)

###########
# RUNTIME #
###########
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY package*.json ./
RUN npm install 

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 6405
# Apply migrations (safe/no-op when already applied), then start the service.
CMD ["sh", "-lc", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
