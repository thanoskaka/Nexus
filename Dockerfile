FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY package*.json ./
RUN npm ci

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
COPY --from=build /app/src ./src

RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 6868
ENV NODE_ENV=production
ENV PORT=6868

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6868/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
