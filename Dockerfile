FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @marstv/web build && pnpm --filter @marstv/server build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8787
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/packages ./packages
RUN mkdir -p /data && chown -R node:node /app /data
ENV MARSTV_DATA_DIR=/data
EXPOSE 8787
VOLUME ["/data"]
USER node
CMD ["node", "--enable-source-maps", "apps/server/dist/index.js"]
