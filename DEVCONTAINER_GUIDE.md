# Devcontainer Development Guide

## 🚀 Quick Start

The MCP Memory Service add-on project includes a comprehensive devcontainer setup based on the [Home Assistant addons-example](https://github.com/home-assistant/addons-example) repository. This provides a complete development environment with all necessary tools pre-configured.

## 📋 Prerequisites

1. **Visual Studio Code** with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. **Docker Desktop** installed and running
3. **Git** for version control

## 🔧 Setup Instructions

### 1. Open Project in Devcontainer

1. **Clone or open** the project in VS Code
2. **Install Dev Containers extension** if not already installed
3. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. **Select** "Dev Containers: Reopen in Container"
5. **Wait** for the container to build and start

### 2. Automatic Setup

The devcontainer automatically:
- ✅ **Installs Node.js 18** and npm dependencies
- ✅ **Sets up development environment** variables
- ✅ **Creates helpful aliases** for common tasks
- ✅ **Configures VS Code** with useful extensions
- ✅ **Mounts necessary volumes** for Home Assistant integration

## 🛠️ Development Environment

### Included Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Home Assistant Devcontainer** | Base development environment | Latest |
| **Node.js** | JavaScript runtime | 18.x |
| **Docker** | Container management | Latest |
| **Git** | Version control | Latest |
| **curl** | HTTP testing | Latest |
| **jq** | JSON processing | Latest |

### VS Code Extensions

- **ShellCheck** - Shell script linting
- **Prettier** - Code formatting
- **JSON** - JSON file support
- **TypeScript** - TypeScript support
- **ESLint** - JavaScript linting
- **Docker** - Docker support

## 🚀 Development Workflow

### 1. Start Development Environment

```bash
# Quick start script (auto-created in devcontainer)
./start-dev.sh
```

This script:
- Starts Home Assistant Supervisor
- Builds the MCP Memory Service container
- Runs the service on port 8080
- Sets up data persistence

### 2. Test Your Changes

```bash
# Comprehensive API testing script
./test-api.sh
```

This script:
- Tests health endpoint
- Tests info endpoint
- Stores a test memory
- Searches for memories
- Lists all memories

### 3. Use Development Aliases

The devcontainer includes helpful aliases:

```bash
# Container management
mcp-test      # Build and run test container
mcp-logs      # View container logs
mcp-stop      # Stop test container

# API testing
mcp-health    # Check service health
mcp-info      # Get service info
mcp-list      # List all memories
mcp-store     # Store a memory (add JSON data)
mcp-search    # Search memories (add query)

# Git shortcuts
gc-feat       # Git commit with feat: prefix
gc-fix        # Git commit with fix: prefix
gc-docs       # Git commit with docs: prefix
gc-chore      # Git commit with chore: prefix
```

## 🌐 Access URLs

Once the development environment is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Home Assistant** | http://localhost:7123 | Main HA interface |
| **MCP Memory Service** | http://localhost:8080 | API endpoints |
| **HA Supervisor** | http://localhost:7357 | Supervisor interface |

## 📁 Project Structure in Devcontainer

```
/mnt/supervisor/addons/local/ha-mcp-memory-addon/
├── mcp-memory-service/          # Add-on source code
├── .devcontainer/               # Devcontainer configuration
├── docs/                        # Documentation
├── .github/                     # GitHub workflows
├── start-dev.sh                 # Development startup script
├── test-api.sh                  # API testing script
└── data/                        # Persistent data directory
```

## 🔧 Configuration

### Environment Variables

The devcontainer sets up these development environment variables:

```bash
PORT=8080                    # API port
DATA_DIR=/data              # Storage directory
CORS_ENABLED=true           # Enable CORS
AUTH_ENABLED=false          # Disable auth for development
LOG_LEVEL=debug             # Debug logging
NODE_ENV=development        # Node.js environment
```

### Development Configuration

A development configuration is automatically created at `/data/dev-config.yaml`:

```yaml
log_level: debug
storage_path: "/data"
cors_enabled: true
api_key: ""
message: "MCP Memory Service Development Environment"
```

## 🧪 Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:8080/health | jq

# Store a memory
curl -X POST http://localhost:8080/memory/store \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "tags": ["test"]}' | jq

# Search memories
curl "http://localhost:8080/memory/search?query=test" | jq

# List all memories
curl http://localhost:8080/memory/list | jq
```

### Automated Testing

```bash
# Run the comprehensive test suite
./test-api.sh
```

## 🐛 Debugging

### Container Logs

```bash
# View container logs
mcp-logs

# Or manually
docker logs -f $(docker ps -q --filter ancestor=mcp-test)
```

### Debug Mode

The development environment runs in debug mode by default. Check logs for detailed information:

```bash
# Check if service is running
mcp-health

# View recent logs
docker logs --tail 50 $(docker ps -q --filter ancestor=mcp-test)
```

## 🔄 Git Workflow

### Conventional Commits

The devcontainer includes shortcuts for conventional commits:

```bash
# Feature development
gc-feat "add memory statistics endpoint"

# Bug fixes
gc-fix "resolve API key validation issue"

# Documentation
gc-docs "update installation guide"

# Maintenance
gc-chore "update dependencies"
```

### Branch Management

```bash
# Create feature branch
git checkout -b feature/new-endpoint

# Make changes and commit
gc-feat "add new endpoint"

# Push branch
git push origin feature/new-endpoint
```

## 🚀 Deployment

### Local Testing

```bash
# Build production container
docker build -t mcp-memory-prod ./mcp-memory-service

# Test production build
docker run -p 8080:8080 mcp-memory-prod
```

### Home Assistant Installation

```bash
# Copy to HA addons directory
cp -r mcp-memory-service /addons/

# Or use add-on store with repository URL:
# https://github.com/swingerman/ha-mcp-memory-addon
```

## 🆘 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check Docker is running
docker ps

# Rebuild container
docker build --no-cache -t mcp-test -f simple-test.Dockerfile .
```

**Port conflicts:**
```bash
# Check what's using port 8080
lsof -i :8080

# Stop conflicting services
mcp-stop
```

**Permission issues:**
```bash
# Fix file permissions
sudo chown -R $(whoami):$(whoami) data/
```

**Dependencies issues:**
```bash
# Reinstall Node.js dependencies
cd mcp-memory-service/rootfs/app
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

1. **Check logs** in the container
2. **Review configuration** files
3. **Test API endpoints** individually
4. **Check VS Code output** for devcontainer issues
5. **Restart devcontainer** if needed

## 📚 Additional Resources

- [Home Assistant Add-on Development](https://developers.home-assistant.io/docs/add-ons/)
- [Dev Containers Documentation](https://code.visualstudio.com/docs/remote/containers)
- [MCP Memory Service API](docs/api.md)
- [Cursor Agent Guide](CURSOR_AGENT_GUIDE.md)

---

**Happy coding!** 🎉 The devcontainer provides everything you need for efficient MCP Memory Service add-on development.
