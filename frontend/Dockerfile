# Stage 1: Build the React application with Vite
# Using Node 22 LTS Alpine for latest security patches (CVE mitigation)
# Pinned to specific digest for reproducible builds
FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Configure npm to use a more reliable registry and add retry logic
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retries 5 && \
    npm install

# Copy source code 
COPY . .

# Fix permissions for all binaries
RUN find node_modules -type f -name "esbuild" -exec chmod +x {} \; && \
    chmod -R +x node_modules/.bin/ || true

# Remove old .js files to avoid JSX parsing conflicts
RUN find /app/src -name "*.js" -type f ! -name "vite.config.js" -delete

# Run the Vite build process (use node directly to avoid permission issues)
RUN node node_modules/vite/bin/vite.js build

# Stage 2: Serve the application using a lightweight web server
# Pinned to specific digest for reproducible builds
FROM nginx:alpine@sha256:b3c656d55d7ad751196f21b7fd2e8d4da9cb430e32f646adcf92441b72f82b14

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]