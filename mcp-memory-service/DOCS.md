# Home Assistant Add-on: MCP Memory Service

## How to use

This add-on provides an AI memory service using the Model Context Protocol (MCP), enabling AI agents to store and retrieve persistent memories through a simple HTTP API.

When started, it will:
1. Initialize the HTTP API server on port 8080
2. Create the configured data directory for persistent storage
3. Enable authentication if an API key is provided
4. Log the configured welcome message

## Configuration

The add-on can be configured with the following options:

### Option: `log_level`
Set the logging verbosity level. Available options:
- `trace`: Show every detail, like all called internal functions
- `debug`: Shows detailed debug information  
- `info`: Normal (usually) interesting events
- `notice`: Significant events
- `warning`: Exceptional occurrences that are not errors
- `error`: Runtime errors that do not require immediate action
- `fatal`: Something went terribly wrong. Add-on becomes unusable

### Option: `storage_path`
The path where memories will be stored. Defaults to `/data`.

### Option: `cors_enabled`
Enable CORS headers for cross-origin requests. Set to `true` if accessing from web applications.

### Option: `api_key`
Optional API key for authentication. If set, requests must include the key in the `X-API-Key` or `Authorization: Bearer` header.

### Option: `message`
A custom welcome message that will be logged when the service starts. Defaults to "Hello World...".

## API Usage

Once running, the service provides a RESTful HTTP API accessible at `http://homeassistant:8080`:

### Health Check
```bash
curl http://homeassistant:8080/health
```

### Store a Memory
```bash
curl -X POST http://homeassistant:8080/memory/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"content": "User prefers morning meetings", "tags": ["preference"]}'
```

### Search Memories
```bash
curl "http://homeassistant:8080/memory/search?query=meeting&limit=5" \
  -H "X-API-Key: your-api-key"
```

### List All Memories
```bash
curl "http://homeassistant:8080/memory/list?limit=10" \
  -H "X-API-Key: your-api-key"
```

## External Access

To access the service from outside your Home Assistant network:
1. Configure port forwarding on your router for port 8080
2. Use a reverse proxy like Nginx Proxy Manager (recommended)
3. Access through your Home Assistant VPN

## Data Persistence

Memories are stored as JSON files in the configured storage path (default `/data`). This ensures your AI memories persist across add-on restarts and updates.

## Support

For issues and feature requests, please use the GitHub repository at:
https://github.com/swingerman/ha-mcp-memory-addon