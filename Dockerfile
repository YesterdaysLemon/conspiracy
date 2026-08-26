FROM node:24-alpine AS build

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    WRANGLER_WRITE_LOGS=false

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

ENV HOME=/tmp \
    HOSTNAME=0.0.0.0 \
    MINIFLARE_REGISTRY_PATH=/tmp/wrangler-registry \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    WRANGLER_LOG_PATH=/tmp/wrangler-logs \
    WRANGLER_WRITE_LOGS=false

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/next.config.ts /app/vite.config.ts ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

