# Production Dockerfile for ProjectXS Task Management
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
# Update npm and install production dependencies + tsx for seeding
RUN npm install -g npm@11.6.0 && npm ci --omit=dev --legacy-peer-deps && npm install tsx --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Update npm and install all dependencies (including devDependencies)
RUN npm install -g npm@11.6.0 && npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install PostgreSQL client and bash for database operations
RUN apk update && apk add --no-cache postgresql-client bash

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for migrations with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy production dependencies (includes tsx for seeding) with correct ownership
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy startup script
COPY --from=builder --chown=nextjs:nodejs /app/docker-start.sh ./docker-start.sh
RUN chmod +x ./docker-start.sh

# Create necessary directories with correct ownership
RUN mkdir -p ./uploads && chown -R nextjs:nodejs ./uploads ./prisma

# Set user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application with proper database initialization
ENTRYPOINT ["/app/docker-start.sh"]