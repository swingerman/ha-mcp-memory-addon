# Installation Guide

## Method 1: Add-on Store (Recommended)

1. **Add this repository** to your Home Assistant:
   - Go to **Supervisor → Add-on Store**
   - Click the **⋮** menu → **Repositories**
   - Add: `https://github.com/swingerman/ha-mcp-memory-addon`

2. **Install the add-on**:
   - Find **MCP Memory Service** in the store
   - Click **Install**

3. **Configure and start**:
   - Set your desired configuration
   - Click **Start**

## Method 2: Manual Installation

1. **SSH into your Home Assistant** instance

2. **Navigate to the addons directory**:
   ```bash
   cd /addons
   ```

3. **Clone this repository**:
   ```bash
   git clone https://github.com/swingerman/ha-mcp-memory-addon.git
   ```

4. **Copy the addon**:
   ```bash
   cp -r ha-mcp-memory-addon/mcp-memory-service /addons/
   ```

5. **Restart Home Assistant** or reload add-ons

6. **Install from Local Add-ons**:
   - Go to **Supervisor → Add-on Store → Local Add-ons**
   - Find and install **MCP Memory Service**

## Configuration

### Basic Configuration
```yaml
log_level: info
storage_path: "/data"
cors_enabled: true
api_key: ""  # Optional, leave empty to disable auth
```

### Advanced Configuration
```yaml
log_level: debug
storage_path: "/config/mcp-memories"
cors_enabled: true
api_key: "your-secure-api-key-here"
```

## Verification

1. **Check the logs** for successful startup
2. **Test the health endpoint**:
   ```bash
   curl http://homeassistant:8080/health
   ```
3. **Verify memory storage**:
   ```bash
   curl -X POST http://homeassistant:8080/memory/store \
     -H "Content-Type: application/json" \
     -d '{"content": "Test memory"}'
   ```

## External Access

To access from outside your network:

### Option 1: Port Forwarding
1. Forward port 8080 on your router to your HA instance
2. Access via `http://your-external-ip:8080`

### Option 2: Reverse Proxy (Recommended)
1. Install **Nginx Proxy Manager** add-on
2. Create a proxy host pointing to `homeassistant:8080`
3. Enable SSL for secure access

### Option 3: Home Assistant Ingress
Add to your `configuration.yaml`:
```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
```

## Troubleshooting

### Common Issues

**Add-on won't start**:
- Check logs for error messages
- Verify storage path permissions
- Ensure port 8080 is not in use

**Can't access externally**:
- Verify port forwarding configuration
- Check firewall settings
- Test local access first

**Memory not persisting**:
- Check storage_path configuration
- Verify directory permissions
- Look for disk space issues

### Getting Help

1. **Check the logs** in the add-on interface
2. **Enable debug logging** for more details
3. **Open an issue** on GitHub with logs and configuration