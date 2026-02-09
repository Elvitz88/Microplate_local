FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 3
RUN apk add --no-cache openssl

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN yarn prisma:generate

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

EXPOSE 6401

# Run migrations on startup (safe/no-op when already applied), then start the service.
CMD ["sh", "-lc", "yarn prisma:deploy && yarn start:prod"]
