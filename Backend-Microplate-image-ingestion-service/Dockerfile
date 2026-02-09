FROM node:20-alpine
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

# Build TypeScript
RUN yarn build

EXPOSE 6402

# Apply migrations (safe/no-op when already applied), then start the service.
CMD ["sh", "-lc", "npx prisma migrate deploy --schema=./prisma/schema.prisma && yarn start:prod"]
