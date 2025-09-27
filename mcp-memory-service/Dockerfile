# https://developers.home-assistant.io/docs/add-ons/configuration#add-on-dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install Node.js and required packages
RUN \
  apk add --no-cache \
  nodejs \
  npm \
  git \
  curl

# Set working directory
WORKDIR /app

# Clone the MCP memory service repository
RUN git clone https://github.com/doobidoo/mcp-memory-service.git .

# Install dependencies
RUN npm install

# Install additional dependencies for HTTP wrapper
RUN npm install express cors

# Create data directory for persistent storage
RUN mkdir -p /data

# Copy root filesystem
COPY rootfs /