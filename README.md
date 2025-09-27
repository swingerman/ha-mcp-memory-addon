# Home Assistant MCP Memory Service Add-on

[![GitHub Release][releases-shield]][releases]
[![GitHub Activity][commits-shield]][commits]
[![License][license-shield]](LICENSE)
[![hacs][hacsbadge]][hacs]

![Project Maintenance][maintenance-shield]
[![GitHub Activity][last-commit-shield]][commits]

[![Community Forum][forum-shield]][forum]

A Home Assistant add-on that provides an AI memory service using the Model Context Protocol (MCP). This allows AI agents to store and retrieve persistent memories through a simple HTTP API.

## About

The MCP Memory Service enables AI agents to maintain context and memory across conversations and sessions. It's perfect for:

- 🤖 **AI Assistants** - Remember user preferences and past interactions
- 💬 **Chatbots** - Maintain conversation context over time  
- 🔄 **Automation** - Store and recall state information
- 📚 **Knowledge Base** - Build a searchable memory database

## Features

- ✅ **RESTful HTTP API** for easy integration
- 🔐 **Optional API key authentication** 
- 🌐 **CORS support** for web applications
- 💾 **Persistent storage** in Home Assistant
- 🏗️ **Multi-architecture support** (ARM, x64, etc.)
- 📊 **Health monitoring** and logging
- 🔍 **Search and filtering** capabilities

## Installation

### Add-on Store

1. Add this repository to Home Assistant:
   - **Supervisor** → **Add-on Store** → **⋮** → **Repositories**
   - Add: `https://github.com/swingerman/ha-mcp-memory-addon`

2. Install the **MCP Memory Service** add-on

3. Configure and start the add-on

### Manual Installation

See [Installation Guide](docs/installation.md) for detailed instructions.

## Quick Start

1. **Install and start** the add-on
2. **Test the service**:
   ```bash
   curl http://homeassistant:8080/health
   ```
3. **Store a memory**:
   ```bash
   curl -X POST http://homeassistant:8080/memory/store \
     -H "Content-Type: application/json" \
     -d '{"content": "User prefers morning meetings"}'
   ```
4. **Search memories**:
   ```bash
   curl "http://homeassistant:8080/memory/search?query=meeting"
   ```

## Configuration

```yaml
log_level: info
storage_path: "/data"
cors_enabled: true
api_key: ""  # Optional authentication
```

See [API Documentation](docs/api.md) for complete endpoint reference.

## External Access

Access your memory service from anywhere:

- **Port Forwarding**: Forward port 8080 to your HA instance
- **Reverse Proxy**: Use Nginx Proxy Manager (recommended)
- **VPN**: Access through your Home Assistant VPN

## Development

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/swingerman/ha-mcp-memory-addon.git
   cd ha-mcp-memory-addon
   ```

2. Build locally:
   ```bash
   docker build -t mcp-memory-service ./mcp-memory-service
   ```

3. Test the container:
   ```bash
   docker run -p 8080:8080 -e LOG_LEVEL=debug mcp-memory-service
   ```

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- 📖 **Documentation**: [Installation](docs/installation.md) | [API Reference](docs/api.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/swingerman/ha-mcp-memory-addon/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/swingerman/ha-mcp-memory-addon/discussions)

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the [MCP Memory Service](https://github.com/doobidoo/mcp-memory-service)
- Built for the [Model Context Protocol](https://modelcontextprotocol.io/)
- Home Assistant add-on framework

---

[commits-shield]: https://img.shields.io/github/commit-activity/y/swingerman/ha-mcp-memory-addon.svg
[commits]: https://github.com/swingerman/ha-mcp-memory-addon/commits/main
[hacs]: https://hacs.xyz
[hacsbadge]: https://img.shields.io/badge/HACS-Custom-orange.svg
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg
[forum]: https://community.home-assistant.io/
[license-shield]: https://img.shields.io/github/license/swingerman/ha-mcp-memory-addon.svg
[maintenance-shield]: https://img.shields.io/badge/maintainer-Your%20Name-blue.svg
[releases-shield]: https://img.shields.io/github/release/swingerman/ha-mcp-memory-addon.svg
[releases]: https://github.com/swingerman/ha-mcp-memory-addon/releases
[last-commit-shield]: https://img.shields.io/github/last-commit/swingerman/ha-mcp-memory-addon.svg
Home Assistant add-on for hosting MCP Memory Service with HTTP API
