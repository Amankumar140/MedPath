# =========================
# Build Stage
# =========================
FROM node:22-bookworm-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# =========================
# Production Stage
# =========================
FROM node:22-bookworm-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma

RUN mkdir -p logs uploads

EXPOSE 3000

CMD ["node", "src/server.js"]