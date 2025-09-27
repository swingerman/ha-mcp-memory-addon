# CPU-Only Optimization Guide

This document outlines the CPU-only optimizations implemented in the MCP Memory Service Home Assistant add-on, since GPU acceleration is not available in containerized Home Assistant environments.

## 🖥️ CPU-Only Configuration

### Environment Variables

The add-on is configured with the following CPU-optimized settings:

```yaml
# MCP Memory Service Configuration
MCP_MEMORY_STORAGE_BACKEND: sqlite_vec
MCP_BATCH_SIZE: 16                    # Reduced from 32 for CPU efficiency
MCP_MAX_CONTEXT_LENGTH: 512           # Optimal for CPU processing
MCP_EMBEDDING_MODEL: all-MiniLM-L6-v2 # Lightweight model for CPU
MCP_HTTP_ENABLED: true
MCP_HTTP_PORT: 8080

# CPU-Only Optimization Flags
OMP_NUM_THREADS: 2                    # Limit OpenMP threads
MKL_NUM_THREADS: 2                    # Limit Intel MKL threads
CUDA_VISIBLE_DEVICES: ""              # Disable CUDA
PYTORCH_CUDA_ALLOC_CONF: ""           # Disable CUDA memory allocation
```

### PyTorch CPU Installation

The Docker containers install PyTorch with CPU-only support:

```dockerfile
# Install PyTorch CPU-only version
RUN pip3 install --no-cache-dir \
  torch --index-url https://download.pytorch.org/whl/cpu \
  transformers \
  sentence-transformers \
  numpy \
  scipy
```

## 📊 Performance Characteristics

### Expected Performance

| Operation | CPU Performance | Notes |
|-----------|----------------|-------|
| **Memory Storage** | 100-500ms | Depends on content length |
| **Memory Search** | 200-1000ms | Semantic search with embeddings |
| **Memory Retrieval** | 50-100ms | Direct database lookup |
| **Batch Processing** | 1-5s | For multiple memories |

### Memory Usage

| Component | Memory Usage | Notes |
|-----------|--------------|-------|
| **Base Container** | ~200MB | Alpine Linux + Node.js |
| **Python Dependencies** | ~300MB | PyTorch CPU + transformers |
| **Model Loading** | ~150MB | all-MiniLM-L6-v2 embeddings |
| **Runtime Memory** | ~100-500MB | Depends on memory count |

## 🔧 Optimization Strategies

### 1. Model Selection

**Recommended Model**: `all-MiniLM-L6-v2`
- **Size**: 22.7MB (compact)
- **Performance**: Good balance of speed/accuracy
- **CPU Friendly**: Optimized for CPU inference
- **Memory Efficient**: Low memory footprint

**Alternative Models** (if needed):
- `all-MiniLM-L12-v2`: Larger, more accurate (33MB)
- `paraphrase-MiniLM-L6-v2`: Better for semantic similarity

### 2. Batch Size Optimization

```yaml
# Conservative (recommended for HA)
MCP_BATCH_SIZE: 16

# Aggressive (if you have powerful CPU)
MCP_BATCH_SIZE: 32

# Minimal (for resource-constrained systems)
MCP_BATCH_SIZE: 8
```

### 3. Thread Configuration

```yaml
# For dual-core systems
OMP_NUM_THREADS: 2
MKL_NUM_THREADS: 2

# For quad-core systems
OMP_NUM_THREADS: 4
MKL_NUM_THREADS: 4

# For single-core systems
OMP_NUM_THREADS: 1
MKL_NUM_THREADS: 1
```

## 🚀 Performance Tuning

### Home Assistant Configuration

Add these options to your add-on configuration for optimal performance:

```yaml
# Add-on Configuration Options
log_level: info
storage_path: "/data"
cors_enabled: true
api_key: ""  # Optional

# Advanced CPU Optimization (via environment)
MCP_BATCH_SIZE: 16
MCP_MAX_CONTEXT_LENGTH: 512
MCP_EMBEDDING_MODEL: "all-MiniLM-L6-v2"
```

### Memory Management

```yaml
# Container Resource Limits (recommended)
memory_limit: 1GB
cpu_limit: 2.0

# For resource-constrained systems
memory_limit: 512MB
cpu_limit: 1.0
```

## 🔍 Monitoring Performance

### Health Check Endpoint

Monitor performance via the health endpoint:

```bash
curl http://homeassistant:8080/health
```

Response includes service mode and performance indicators:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "MCP Memory Service HTTP Wrapper",
  "mode": "fallback"
}
```

### Service Info Endpoint

Get detailed performance information:

```bash
curl http://homeassistant:8080/info
```

Response includes backend and model information:

```json
{
  "service": "MCP Memory Service",
  "version": "1.0.0",
  "mode": "fallback",
  "backend": "json_file",
  "total_memories": 42,
  "environment": {
    "mcp_backend": "sqlite_vec",
    "embedding_model": "all-MiniLM-L6-v2"
  }
}
```

### Performance Statistics

Monitor performance metrics:

```bash
curl http://homeassistant:8080/memory/stats
```

## 🐛 Troubleshooting CPU Performance

### Common Issues

**Slow Memory Operations:**
```bash
# Check CPU usage
docker stats mcp-memory-service

# Reduce batch size
export MCP_BATCH_SIZE=8

# Use smaller model
export MCP_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

**High Memory Usage:**
```bash
# Reduce context length
export MCP_MAX_CONTEXT_LENGTH=256

# Limit cache size
export MCP_CACHE_SIZE=128

# Use minimal model
export MCP_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

**Container Resource Limits:**
```yaml
# In Home Assistant add-on configuration
memory_limit: 1GB
cpu_limit: 2.0
```

### Performance Optimization Commands

```bash
# Optimize for low-resource systems
export MCP_BATCH_SIZE=8
export MCP_MAX_CONTEXT_LENGTH=256
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

# Optimize for high-performance systems
export MCP_BATCH_SIZE=32
export MCP_MAX_CONTEXT_LENGTH=1024
export OMP_NUM_THREADS=4
export MKL_NUM_THREADS=4
```

## 📈 Expected Performance Benchmarks

### Test Scenarios

**Memory Storage (100 memories):**
- **Low-end CPU**: 30-60 seconds
- **Mid-range CPU**: 15-30 seconds  
- **High-end CPU**: 5-15 seconds

**Memory Search (1000 memories):**
- **Low-end CPU**: 2-5 seconds
- **Mid-range CPU**: 1-2 seconds
- **High-end CPU**: 0.5-1 second

**Memory Retrieval (any size):**
- **All systems**: 50-100ms

## 🎯 Best Practices

### 1. Model Selection
- Use `all-MiniLM-L6-v2` for best CPU performance
- Consider `paraphrase-MiniLM-L6-v2` for better semantic search
- Avoid larger models unless you have powerful hardware

### 2. Batch Processing
- Start with `MCP_BATCH_SIZE=16`
- Reduce to 8 for slower systems
- Increase to 32 only if you have excess CPU

### 3. Resource Management
- Monitor container resource usage
- Set appropriate memory limits
- Use CPU limits to prevent system overload

### 4. Storage Backend
- Use `sqlite_vec` for embedded vector storage
- Consider `json_file` for simple use cases
- Avoid complex backends in containerized environments

## 🔧 Development Notes

### Fallback Mode

The add-on includes a fallback mode that uses simple JSON storage when the full MCP Memory Service isn't available. This ensures:

- ✅ **Always functional** - Basic memory operations work
- ✅ **No dependencies** - Doesn't require Python/AI libraries
- ✅ **Fast startup** - No model loading time
- ✅ **Low resource usage** - Minimal memory footprint

### Enhanced Mode

When the full MCP Memory Service is available:

- ✅ **Semantic search** - AI-powered memory retrieval
- ✅ **Vector embeddings** - Advanced similarity matching
- ✅ **Better organization** - Intelligent memory categorization
- ✅ **Scalable storage** - Efficient database backend

The add-on automatically detects which mode is available and configures itself accordingly.
