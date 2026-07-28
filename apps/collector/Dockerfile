FROM mcr.microsoft.com/playwright:v1.49.0-jammy AS base
WORKDIR /app

FROM base AS build
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm --filter @kairos/collector build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/collector/dist ./dist
COPY --from=build /app/apps/collector/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
