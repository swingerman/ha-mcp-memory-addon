# https://developers.home-assistant.io/docs/add-ons/configuration#add-on-dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install Node.js and required packages (CPU-only optimized)
RUN \
  apk add --no-cache \
  nodejs \
  npm \
  git \
  curl \
  python3 \
  py3-pip \
  build-base \
  python3-dev \
  gfortran \
  openblas-dev \
  lapack-dev

# Set working directory
WORKDIR /app

# Clone the MCP memory service repository
RUN git clone https://github.com/doobidoo/mcp-memory-service.git .

# Install Python dependencies for AI/ML capabilities (CPU-only)
RUN pip3 install --no-cache-dir \
  torch --index-url https://download.pytorch.org/whl/cpu \
  transformers \
  sentence-transformers \
  numpy \
  scipy

# Install Node.js dependencies
RUN npm install

# Install additional dependencies for HTTP wrapper
RUN npm install express cors

# Create data directory for persistent storage
RUN mkdir -p /data

# Set environment variables for CPU-only optimized performance
ENV MCP_MEMORY_STORAGE_BACKEND=sqlite_vec
ENV MCP_BATCH_SIZE=16
ENV MCP_MAX_CONTEXT_LENGTH=512
ENV MCP_EMBEDDING_MODEL=all-MiniLM-L6-v2
ENV MCP_HTTP_ENABLED=true
ENV MCP_HTTP_PORT=8080

# OAuth 2.1 Configuration
ENV MCP_OAUTH_ENABLED=false
ENV MCP_OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES=60
ENV MCP_OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES=10
ENV MCP_HTTPS_ENABLED=false

# CPU-only optimization flags
ENV OMP_NUM_THREADS=2
ENV MKL_NUM_THREADS=2
ENV PYTORCH_CUDA_ALLOC_CONF=""
ENV CUDA_VISIBLE_DEVICES=""

# Copy root filesystem
COPY rootfs /

# Ensure OAuth wrapper is executable and available
RUN chmod +x /app/http-wrapper-oauth.js