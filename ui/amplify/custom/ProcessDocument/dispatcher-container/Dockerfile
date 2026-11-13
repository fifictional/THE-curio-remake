# Stage 1: Build stage
FROM public.ecr.aws/docker/library/node:24-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY dispatcher-container/package*.json ./

# Install dependencies including TypeScript
RUN npm install --only=production && npm install --save-dev typescript @types/node @types/node-fetch

# Copy source code and maintain the original directory structure for imports
COPY dispatcher-container/src ./dispatcher/src
COPY document-processor/handler/database/tasks/get-task.ts ./document-processor/handler/database/tasks/get-task.ts
COPY document-processor/handler/core/types.ts ./document-processor/handler/core/types.ts
COPY document-processor/handler/database/tasks/update-task.ts ./document-processor/handler/database/tasks/update-task.ts
COPY document-processor/handler/database/documents/get-document.ts ./document-processor/handler/database/documents/get-document.ts
COPY common ./common

# Create tsconfig.json
RUN <<EOF cat > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": ".",
    "outDir": "./dist",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": false
  },
  "include": ["dispatcher/src/**/*.ts"],
  "files": ["dispatcher/src/index.ts"]
}
EOF

# Compile TypeScript to JavaScript
RUN npx tsc -p tsconfig.json

# Stage 2: Runtime stage
FROM public.ecr.aws/docker/library/node:24-alpine AS runtime

WORKDIR /app

# Copy package files and install only production dependencies
COPY dispatcher-container/package*.json ./
RUN npm install --only=production

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

CMD ["node", "dist/dispatcher/src/index.js"]
