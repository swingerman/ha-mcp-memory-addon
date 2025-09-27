# Cursor Agent Development Guide

## 🎯 Project Context

This is a **Home Assistant add-on** that wraps the MCP Memory Service to provide AI agents with persistent memory capabilities. The add-on runs as a containerized service within Home Assistant's ecosystem.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│        Home Assistant Core         │
├─────────────────────────────────────┤
│  MCP Memory Service Add-on         │
│  ┌─────────────────────────────────┐│
│  │  HTTP API Server (Express.js)  ││
│  │  ├── /health                   ││
│  │  ├── /memory/store             ││
│  │  ├── /memory/search            ││
│  │  ├── /memory/list              ││
│  │  └── /memory/:id (DELETE)      ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │  Persistent Storage (JSON)     ││
│  │  └── /data/memories.json       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 🔧 Key Files and Their Roles

### Core Application Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `mcp-memory-service/rootfs/app/http-wrapper.js` | Main HTTP API server | Express.js app, memory CRUD operations, authentication |
| `mcp-memory-service/config.yaml` | Add-on configuration | HA metadata, configuration schema, port mapping |
| `mcp-memory-service/Dockerfile` | Container build | Node.js setup, dependency installation, file copying |

### Service Management Files

| File | Purpose |
|------|---------|
| `mcp-memory-service/rootfs/etc/services.d/mcp-memory/run` | Service startup script |
| `mcp-memory-service/rootfs/etc/services.d/mcp-memory/finish` | Service shutdown script |
| `mcp-memory-service/apparmor.txt` | Container security profile |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `mcp-memory-service/README.md` | Add-on specific documentation |
| `docs/api.md` | API endpoint reference |
| `docs/installation.md` | Installation instructions |

## 🚀 Development Workflow

### 1. Understanding the Codebase

```bash
# Key entry point
cat mcp-memory-service/rootfs/app/http-wrapper.js

# Configuration schema
cat mcp-memory-service/config.yaml

# Build instructions
cat mcp-memory-service/Dockerfile
```

### 2. Local Testing Setup

```bash
# Build test container
docker build -t mcp-test -f simple-test.Dockerfile .

# Run with debug logging
docker run -p 8080:8080 -e LOG_LEVEL=debug mcp-test

# Test API
curl http://localhost:8080/health
```

### 3. Home Assistant Testing

```bash
# Copy to HA addons directory
cp -r mcp-memory-service /addons/

# Or use add-on store with repository URL:
# https://github.com/swingerman/ha-mcp-memory-addon
```

## 📝 Code Patterns and Conventions

### API Endpoint Structure

```javascript
// Standard pattern for authenticated endpoints
app.post('/memory/store', authenticate, async (req, res) => {
    try {
        // Validate input
        const { content, metadata = {}, tags = [] } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Process request
        const memory = {
            id: Date.now().toString(),
            content,
            metadata,
            tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Save and respond
        memories.push(memory);
        await saveMemories();
        res.json({ success: true, memory_id: memory.id });
    } catch (error) {
        console.error('Error storing memory:', error);
        res.status(500).json({ error: error.message });
    }
});
```

### Configuration Handling

```javascript
// Environment variable pattern
const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.STORAGE_PATH || '/data';
const CORS_ENABLED = process.env.CORS_ENABLED === 'true';
const AUTH_ENABLED = process.env.API_KEY ? 'true' : 'false';
```

### Error Handling Pattern

```javascript
// Consistent error responses
res.status(400).json({ error: 'Specific error message' });
res.status(401).json({ error: 'Unauthorized' });
res.status(404).json({ error: 'Memory not found' });
res.status(500).json({ error: error.message });
```

## 🧪 Testing Strategies

### Unit Testing API Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Store memory
curl -X POST http://localhost:8080/memory/store \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "tags": ["test"]}'

# Search memories
curl "http://localhost:8080/memory/search?query=test"

# List memories
curl http://localhost:8080/memory/list

# Delete memory (use ID from list response)
curl -X DELETE http://localhost:8080/memory/1234567890
```

### Authentication Testing

```bash
# Test without API key (should work if AUTH_ENABLED=false)
curl http://localhost:8080/info

# Test with API key
curl -H "X-API-Key: your-secret-key" http://localhost:8080/info
```

### CORS Testing

```javascript
// Test CORS from browser console
fetch('http://localhost:8080/health')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🔒 Security Considerations

### Authentication Implementation

```javascript
const authenticate = (req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
        const apiKey = req.headers['x-api-key'] || 
                      req.headers['authorization']?.replace('Bearer ', '');
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
};
```

### Input Validation

```javascript
// Always validate required fields
if (!content) {
    return res.status(400).json({ error: 'Content is required' });
}

// Sanitize and limit input
const { query, tags, limit = 10 } = req.query;
const searchLimit = Math.min(parseInt(limit), 100); // Cap at 100
```

## 🐛 Common Issues and Solutions

### 1. Docker Build Failures

**Problem**: `ARG BUILD_FROM` not defined
**Solution**: Use `simple-test.Dockerfile` for local testing

### 2. Permission Issues

**Problem**: Cannot write to `/data` directory
**Solution**: Ensure proper directory permissions in Dockerfile

### 3. CORS Issues

**Problem**: Web requests blocked
**Solution**: Set `CORS_ENABLED=true` in configuration

### 4. Authentication Not Working

**Problem**: API key rejected
**Solution**: Check `X-API-Key` header format and environment variable

## 📚 Learning Resources

### Home Assistant Add-ons
- [HA Add-on Development Guide](https://developers.home-assistant.io/docs/add-ons/)
- [Configuration Schema](https://developers.home-assistant.io/docs/add-ons/configuration/)
- [Dockerfile Guidelines](https://developers.home-assistant.io/docs/add-ons/configuration/#add-on-dockerfile)

### MCP Protocol
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Original Memory Service](https://github.com/doobidoo/mcp-memory-service)

### Express.js
- [Express.js Documentation](https://expressjs.com/)
- [CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)

## 🎯 Common Agent Tasks

### Adding New Endpoints

1. Add route to `http-wrapper.js`
2. Include authentication if needed
3. Update `docs/api.md`
4. Add tests and examples

### Modifying Configuration

1. Update `config.yaml` schema
2. Add environment variable handling
3. Update documentation
4. Test configuration changes

### Improving Security

1. Review authentication implementation
2. Add input validation
3. Update AppArmor profile if needed
4. Test security scenarios

### Performance Optimization

1. Add pagination to list endpoints
2. Implement memory indexing
3. Add caching if appropriate
4. Monitor memory usage

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-endpoint

# Make changes
# ... edit files ...

# Test changes
docker build -t test -f simple-test.Dockerfile .
docker run -p 8080:8080 test

# Commit and push (using conventional commits)
git add .
git commit -m "feat(api): add memory statistics endpoint"
git push origin feature/new-endpoint
```

### Conventional Commit Style

**Always use conventional commits** for consistent, meaningful commit messages:

**Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code formatting, semicolons, etc.
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance, dependencies, build tasks
- `perf`: Performance improvements
- `ci`: CI/CD pipeline changes
- `build`: Build system changes

**Examples:**
```bash
git commit -m "feat(api): add memory statistics endpoint"
git commit -m "fix(auth): resolve API key validation issue"
git commit -m "docs: update installation guide for new architecture"
git commit -m "refactor(storage): improve memory persistence logic"
git commit -m "chore: update dependencies to latest versions"
git commit -m "test(api): add unit tests for memory search endpoint"
git commit -m "perf(storage): optimize memory loading performance"
```

**Scopes** (optional but recommended):
- `api`: API endpoints and functionality
- `auth`: Authentication and authorization
- `storage`: Data persistence and storage
- `config`: Configuration and environment
- `docker`: Docker and containerization
- `docs`: Documentation updates

## 📋 Checklist for Changes

- [ ] Update relevant documentation
- [ ] Test locally with Docker
- [ ] Test in Home Assistant environment
- [ ] Verify all API endpoints work
- [ ] Check authentication behavior
- [ ] Validate CORS configuration
- [ ] Update CHANGELOG.md if needed
- [ ] Ensure backward compatibility
