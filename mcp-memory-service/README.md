# MCP Memory Service Add-on

![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]
![Supports armhf Architecture][armhf-shield]
![Supports armv7 Architecture][armv7-shield]
![Supports i386 Architecture][i386-shield]

This add-on provides an AI memory service using the Model Context Protocol (MCP), allowing your AI agents to store and retrieve memories through a simple HTTP API.

## About

The MCP Memory Service enables AI agents to maintain persistent memory across conversations and sessions. It provides a RESTful API for storing, searching, and managing AI memories.

## Configuration

### Option: `log_level`

The `log_level` option controls the level of log output by the addon and can be changed to be more or less verbose, which might be useful when you are dealing with an unknown issue.

Possible values are:

- `trace`: Show every detail, like all called internal functions.
- `debug`: Shows detailed debug information.
- `info`: Normal (usually) interesting events.
- `warning`: Exceptional occurrences that are not errors.
- `error`: Runtime errors that do not require immediate action.
- `fatal`: Something went terribly wrong. Add-on becomes unusable.

Please note that each level automatically includes log messages from a more severe level.

### Option: `storage_path`

The path where memories will be stored. Default is `/data`.

### Option: `cors_enabled`

Enable CORS headers for cross-origin requests. Set to `true` if accessing from web applications.

### Option: `api_key`

Optional API key for authentication. If set, requests must include the key in the `X-API-Key` header.

## API Endpoints

- `GET /health` - Health check
- `GET /info` - Service information
- `POST /memory/store` - Store a new memory
- `GET /memory/search` - Search memories
- `GET /memory/list` - List all memories
- `DELETE /memory/:id` - Delete a memory

## Usage

Once installed and running, the service will be available at:
- Internal: `http://homeassistant:8080`
- External: `https://your-ha-domain:8080` (with proper port forwarding)

### Example API Usage

```bash
# Store a memory
curl -X POST http://homeassistant:8080/memory/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"content": "User prefers morning meetings", "tags": ["preference"]}'

# Search memories
curl "http://homeassistant:8080/memory/search?query=meeting&limit=5" \
  -H "X-API-Key: your-api-key"
```

## Support

For issues and feature requests, please use the GitHub repository.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg