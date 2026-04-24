# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app

# Production deps for runtime migrator + app
COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App bundle (non-standalone: standard .next + code)
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/drizzle ./drizzle
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/lib ./lib
COPY --from=builder --chown=app:app /app/app ./app
COPY --from=builder --chown=app:app /app/components ./components
COPY --from=builder --chown=app:app /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=app:app /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "node_modules/next/dist/bin/next", "start"]
