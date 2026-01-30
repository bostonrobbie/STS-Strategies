# STS Strategies Worker Dockerfile
# For deployment on Fly.io or similar platforms

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy packages
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared

# Copy worker app
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @sts/database db:generate

# Build worker
RUN pnpm --filter @sts/worker build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built files
COPY --from=base /app/apps/worker/dist ./dist
COPY --from=base /app/apps/worker/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/database/node_modules/.prisma ./node_modules/.prisma

# Set environment
ENV NODE_ENV=production

# Run the worker
CMD ["node", "dist/index.js"]
