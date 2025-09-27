# Simple test Dockerfile for local development
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache git curl

# Set working directory
WORKDIR /app

# Install dependencies directly
RUN npm install express cors

# Create data directory for persistent storage
RUN mkdir -p /data

# Copy HTTP wrapper
COPY mcp-memory-service/rootfs/app/http-wrapper.js ./http-wrapper.js

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV DATA_DIR=/data
ENV CORS_ENABLED=true
ENV AUTH_ENABLED=false

# Start the HTTP wrapper
CMD ["node", "http-wrapper.js"]
