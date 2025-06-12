FROM node:22.2.0-bullseye-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@9.15.5
COPY package.json pnpm-lock.yaml ./
COPY .env ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:22.2.0-bullseye-slim AS runner
WORKDIR /app

RUN npm install -g pnpm@9.15.5

ARG NODE_ENV=production
ENV NODE_ENV=production
ARG NODE_REMOTE=true
ENV NODE_REMOTE=true

ARG NEXT_PUBLIC_NODE_ENV=production
ENV NEXT_PUBLIC_NODE_ENV=production
ARG NEXT_PUBLIC_NODE_REMOTE=true
ENV NEXT_PUBLIC_NODE_REMOTE=true

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

COPY --from=builder /app .
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

EXPOSE 3000
CMD ["pnpm", "start"]
