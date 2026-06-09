FROM node:22-alpine AS builder

WORKDIR /app

# Install the package manager version declared by package.json.
RUN npm install -g pnpm@11.2.2

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the application
RUN pnpm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

# Graphviz is required by /api/erd/render to generate SVG/PNG ERD images.
# Noto CJK fonts keep Korean logical names readable in rendered diagrams.
RUN apk add --no-cache graphviz font-noto-cjk

# Copy built artifacts and dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the server
CMD ["node", "build"]
