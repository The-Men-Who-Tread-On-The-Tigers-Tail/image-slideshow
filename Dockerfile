FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Install dev dependencies for build, compile, then remove dev deps
RUN npm ci && npm run build && npm prune --production

# Expose port
EXPOSE 3000

# Default images directory (mount your images here)
RUN mkdir /images
ENV IMAGES_PATH=/images

# Run the server with configurable images path
CMD node dist/server.js "$IMAGES_PATH"
