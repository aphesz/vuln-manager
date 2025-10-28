# Stage 1: Build the React application
FROM node:18 AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies (including axios)
COPY package*.json ./
RUN npm install

# Copy source code 
COPY . .

# Run the React build process
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]