# Agent Quick Reference

## 🚀 Quick Start Commands

### Devcontainer Development (Recommended)
```bash
# Open in VS Code with Dev Containers extension
# Automatically sets up full development environment
./start-dev.sh    # Start development environment
./test-api.sh     # Test API endpoints
```

### Local Docker Testing
```bash
# Build and test locally
docker build -t mcp-test -f simple-test.Dockerfile .
docker run -p 8080:8080 mcp-test

# Test API endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/memory/store -H "Content-Type: application/json" -d '{"content":"test"}'
```

### Development Aliases (in devcontainer)
```bash
mcp-test      # Build and run test container
mcp-health    # Check service health
mcp-store     # Store a memory (add JSON data)
mcp-search    # Search memories (add query)
gc-feat       # Git commit with feat: prefix
gc-fix        # Git commit with fix: prefix
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `mcp-memory-service/rootfs/app/http-wrapper.js` | Main API server |
| `mcp-memory-service/config.yaml` | Add-on configuration |
| `mcp-memory-service/Dockerfile` | Container build |
| `simple-test.Dockerfile` | Local testing |

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/info` | Service info |
| POST | `/memory/store` | Store memory |
| GET | `/memory/search` | Search memories |
| GET | `/memory/list` | List memories |
| DELETE | `/memory/:id` | Delete memory |

## ⚙️ Configuration Options

```yaml
log_level: info          # Logging level
storage_path: "/data"    # Storage directory
cors_enabled: true       # Enable CORS
api_key: ""             # Optional authentication
message: "Hello world..." # Welcome message
```

## 🧪 Testing Commands

```bash
# Health check
curl http://localhost:8080/health

# Store memory
curl -X POST http://localhost:8080/memory/store \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers morning meetings", "tags": ["preference"]}'

# Search memories
curl "http://localhost:8080/memory/search?query=meeting"

# List memories
curl http://localhost:8080/memory/list

# With authentication
curl -H "X-API-Key: your-key" http://localhost:8080/info
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Docker build fails | Use `simple-test.Dockerfile` instead |
| Permission denied | Check `/data` directory permissions |
| CORS blocked | Set `CORS_ENABLED=true` |
| Auth rejected | Check API key header format |

## 📝 Memory Object Structure

```javascript
{
  "id": "timestamp_string",
  "content": "memory content",
  "metadata": {},
  "tags": ["tag1", "tag2"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 8080 | API port |
| `STORAGE_PATH` | /data | Storage directory |
| `CORS_ENABLED` | true | Enable CORS |
| `API_KEY` | "" | Authentication key |
| `AUTH_ENABLED` | auto | Enable auth if key set |

## 🏗️ Project Structure

```
mcp-memory-service/
├── config.yaml              # Add-on config
├── Dockerfile               # Container build
├── apparmor.txt             # Security profile
└── rootfs/
    ├── app/
    │   └── http-wrapper.js  # Main API server
    └── etc/services.d/mcp-memory/
        ├── run              # Startup script
        └── finish           # Shutdown script
```

## 🎯 Common Tasks

### Add New Endpoint
1. Add route to `http-wrapper.js`
2. Include `authenticate` middleware if needed
3. Update `docs/api.md`
4. Test with curl

### Modify Configuration
1. Update `config.yaml` schema
2. Add env var handling in code
3. Update documentation
4. Test configuration

### Debug Issues
1. Check logs: `docker logs container_id`
2. Enable debug: `LOG_LEVEL=debug`
3. Test endpoints individually
4. Verify environment variables

## 📝 Conventional Commits

**Format:** `<type>[scope]: <description>`

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add memory statistics endpoint` |
| `fix` | Bug fix | `fix(auth): resolve API key validation issue` |
| `docs` | Documentation | `docs: update installation guide` |
| `style` | Code formatting | `style: fix indentation in http-wrapper.js` |
| `refactor` | Code refactoring | `refactor(storage): improve memory persistence` |
| `test` | Tests | `test(api): add unit tests for search endpoint` |
| `chore` | Maintenance | `chore: update dependencies to latest versions` |
| `perf` | Performance | `perf(storage): optimize memory loading` |
| `ci` | CI/CD | `ci: add automated testing workflow` |
| `build` | Build system | `build: update Dockerfile for new Node version` |

**Scopes:** `api`, `auth`, `storage`, `config`, `docker`, `docs`

## 🤖 Dependabot

**Automated dependency management** with security monitoring:

| Component | Update Schedule | Auto-merge |
|-----------|----------------|------------|
| Node.js (npm) | Weekly (Monday) | ✅ Minor/Patch |
| Docker | Weekly (Tuesday) | ✅ Security |
| GitHub Actions | Weekly (Wednesday) | ✅ Minor/Patch |

**Files:**
- `.github/dependabot.yml` - Configuration
- `.github/workflows/test-dependencies.yml` - Testing
- `.github/workflows/dependabot-auto-merge.yml` - Auto-merge
- `SECURITY.md` - Security policy

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `.cursorrules` | Cursor agent instructions |
| `CURSOR_AGENT_GUIDE.md` | Detailed development guide |
| `README.md` | Main project documentation |
| `docs/api.md` | API reference |
| `docs/installation.md` | Installation guide |
| `SECURITY.md` | Security policy and reporting |
