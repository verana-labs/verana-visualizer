FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# Install all dependencies (including dev) for build-time tools like Tailwind/PostCSS
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_PUBLIC_API_ENDPOINT=https://api.testnet.verana.network
ENV NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.testnet.verana.network
ENV NEXT_PUBLIC_IDX_ENDPOINT=https://idx.testnet.verana.network
ENV NEXT_PUBLIC_RESOLVER_ENDPOINT=https://resolver.testnet.verana.network
ENV NEXT_PUBLIC_CHAIN_ID=vna-testnet-1
ENV NEXT_PUBLIC_CHAIN_NAME=Testnet
ENV NEXT_PUBLIC_APP_NAME=verana-visualizer
ENV NEXT_PUBLIC_APP_LOGO=logo.svg

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
