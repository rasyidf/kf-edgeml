# Base image for building
FROM node:14-alpine AS build

# Change working directory
WORKDIR /app

# Update NPM
RUN npm install -g npm@7.22.0

# Copy package manifest
COPY ["package.json", "package-lock.json*", "./"]

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build and pack app for production
RUN npm run build

# Remove devDependencies
RUN npm ci --production

# Base image for runtime
FROM node:14-slim AS runtime

# Setup default environment variables
ENV PORT=8000

# Change working directory
WORKDIR /app

# Copy built app and server script
COPY --from=build /app/bin ./bin
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Expose port
EXPOSE $PORT

# Bootstrap app
CMD ["node", "bin/serve.js"]
