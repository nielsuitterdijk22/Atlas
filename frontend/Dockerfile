# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars used by client components (the app switcher) are inlined
# at build time, so they must be build args, not just runtime env.
ARG NEXT_PUBLIC_QUILL_URL
ARG NEXT_PUBLIC_TEMPO_URL
ARG NEXT_PUBLIC_FORGE_URL
ENV NEXT_PUBLIC_QUILL_URL=$NEXT_PUBLIC_QUILL_URL
ENV NEXT_PUBLIC_TEMPO_URL=$NEXT_PUBLIC_TEMPO_URL
ENV NEXT_PUBLIC_FORGE_URL=$NEXT_PUBLIC_FORGE_URL
RUN npm run build

# ---- run ----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3003
USER node
CMD ["node", "server.js"]
