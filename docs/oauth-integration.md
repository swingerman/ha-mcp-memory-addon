# OAuth 2.1 Integration Guide

This document explains how to configure and use OAuth 2.1 Dynamic Client Registration with the MCP Memory Service Home Assistant add-on, based on the [official OAuth 2.1 Setup Guide](https://github.com/doobidoo/mcp-memory-service/wiki/OAuth-2.1-Setup-Guide).

## 🚀 Overview

The MCP Memory Service add-on supports OAuth 2.1 for enterprise-grade authentication, enabling:

- **🔗 Claude Code HTTP Transport**: Direct team collaboration support
- **🔐 Automatic Client Registration**: Zero-configuration setup for OAuth clients
- **🛡️ Enterprise Security**: JWT-based authentication with proper scope validation
- **🔄 Backward Compatibility**: Existing API key authentication continues to work

## ⚙️ Configuration

### Add-on Configuration Options

Add these options to your add-on configuration in Home Assistant:

```yaml
# Basic Configuration
log_level: info
storage_path: "/data"
cors_enabled: true
api_key: ""  # Optional - legacy authentication

# OAuth 2.1 Configuration
oauth_enabled: false  # Set to true to enable OAuth
oauth_secret_key: ""  # Leave empty for auto-generation
oauth_access_token_expire_minutes: 60
oauth_authorization_code_expire_minutes: 10
https_enabled: false  # Set to true for production
```

### Environment Variables

The add-on automatically maps configuration to environment variables:

| Configuration Option | Environment Variable | Default | Description |
|---------------------|---------------------|---------|-------------|
| `oauth_enabled` | `MCP_OAUTH_ENABLED` | `false` | Enable/disable OAuth 2.1 endpoints |
| `oauth_secret_key` | `MCP_OAUTH_SECRET_KEY` | Auto-generated | JWT signing key (set for persistence) |
| `oauth_access_token_expire_minutes` | `MCP_OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `oauth_authorization_code_expire_minutes` | `MCP_OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES` | `10` | Authorization code lifetime |
| `https_enabled` | `MCP_HTTPS_ENABLED` | `false` | Enable HTTPS (requires SSL setup) |

## 🔧 Setup Instructions

### 1. Enable OAuth in Home Assistant

1. **Install the add-on** from the add-on store
2. **Open add-on configuration**
3. **Set OAuth options**:
   ```yaml
   oauth_enabled: true
   oauth_secret_key: "your-secure-256-bit-secret-key"
   oauth_access_token_expire_minutes: 60
   oauth_authorization_code_expire_minutes: 10
   ```
4. **Start the add-on**

### 2. Test OAuth Endpoints

Verify OAuth is working:

```bash
# Test OAuth discovery
curl http://homeassistant:8080/.well-known/oauth-authorization-server/mcp

# Test client registration
curl -X POST http://homeassistant:8080/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "Test Client"}'
```

### 3. Connect Claude Code

Claude Code will automatically discover and register:

```bash
# Add HTTP transport server
claude mcp add --transport http memory-service http://homeassistant:8080/mcp

# Claude Code automatically:
# ✅ Discovers OAuth endpoints
# ✅ Registers as OAuth client
# ✅ Completes authorization
# ✅ Uses JWT tokens for requests
```

## 🔗 OAuth Endpoints

### Discovery Endpoints

OAuth clients use these for automatic discovery:

- **`GET /.well-known/oauth-authorization-server/mcp`** - OAuth server metadata
- **`GET /.well-known/openid-configuration/mcp`** - OpenID Connect discovery

### OAuth Flow Endpoints

Core OAuth 2.1 flow endpoints:

- **`POST /oauth/register`** - Dynamic client registration
- **`GET /oauth/authorize`** - Authorization endpoint
- **`POST /oauth/token`** - Token endpoint

### Management Endpoints

For debugging and administration:

- **`GET /oauth/clients/{client_id}`** - Client information

## 🎯 Claude Code Integration

### Automatic Setup (Recommended)

Claude Code automatically handles the complete OAuth flow:

1. **Discovery**: Requests `/.well-known/oauth-authorization-server/mcp`
2. **Registration**: Automatically registers as OAuth client
3. **Authorization**: Completes authorization (auto-approved in current version)
4. **Token Exchange**: Exchanges authorization code for access token
5. **API Access**: Uses Bearer token for all MCP-over-HTTP requests

**Simple Setup:**

```bash
# Add to Claude Code (automatic OAuth)
claude mcp add --transport http memory-service http://homeassistant:8080/mcp
```

### Manual Configuration

For custom OAuth settings:

```json
{
  "memoryService": {
    "protocol": "http",
    "http": {
      "endpoint": "http://homeassistant:8080",
      "oauth": {
        "enabled": true,
        "discoveryUrl": "http://homeassistant:8080/.well-known/oauth-authorization-server/mcp",
        "clientName": "My Claude Code Instance"
      }
    }
  }
}
```

## 🔐 Authentication Methods

### OAuth 2.1 Bearer Tokens (Primary)

```bash
# Store a memory with OAuth token
curl -X POST http://homeassistant:8080/memory/store \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers morning meetings", "tags": ["preference"]}'
```

### API Key Authentication (Legacy)

```bash
# Store a memory with API key
curl -X POST http://homeassistant:8080/memory/store \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers morning meetings", "tags": ["preference"]}'
```

### Dual Authentication

Both authentication methods work simultaneously:

```yaml
# Configuration supports both
oauth_enabled: true
api_key: "fallback-api-key"
```

## 🛡️ Security Considerations

### Production Security Checklist

- ✅ **Set persistent OAuth secret key** - Don't rely on auto-generation
- ✅ **Enable HTTPS** - Use SSL certificates for production
- ✅ **Use short token lifetimes** - 30 minutes or less for access tokens
- ✅ **Monitor OAuth clients** - Check `/oauth/clients/{client_id}` endpoint
- ✅ **Set strong API keys** - If using legacy authentication

### Production Configuration

```yaml
# Production settings
oauth_enabled: true
oauth_secret_key: "your-secure-256-bit-secret-key"
oauth_access_token_expire_minutes: 30  # Shorter token lifetime
oauth_authorization_code_expire_minutes: 5  # Shorter code lifetime
https_enabled: true  # Enable HTTPS
api_key: "fallback-api-key"  # Dual authentication
```

### Development Configuration

```yaml
# Development settings
oauth_enabled: true
oauth_secret_key: ""  # Auto-generate for development
oauth_access_token_expire_minutes: 60  # Longer for development
oauth_authorization_code_expire_minutes: 10
https_enabled: false  # Optional for localhost
```

## 🔍 Troubleshooting

### Common Issues

**OAuth not working:**
```bash
# Check if OAuth is enabled
curl http://homeassistant:8080/health

# Verify OAuth endpoints
curl http://homeassistant:8080/.well-known/oauth-authorization-server/mcp
```

**Token validation errors:**
```bash
# Check token format
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | base64 -d

# Verify secret key consistency
# Ensure oauth_secret_key is set in configuration
```

**Client registration fails:**
```bash
# Test client registration
curl -X POST http://homeassistant:8080/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "Debug Client", "redirect_uris": ["http://localhost:3000/callback"]}'
```

### Debug Commands

**Test Complete OAuth Flow:**

```bash
# 1. Test discovery
curl http://homeassistant:8080/.well-known/oauth-authorization-server/mcp

# 2. Test client registration
curl -X POST http://homeassistant:8080/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "Debug Client", "redirect_uris": ["http://localhost:3000/callback"]}'

# 3. Check server health with OAuth status
curl http://homeassistant:8080/health
```

**Enable Debug Logging:**

```yaml
# In add-on configuration
log_level: debug
oauth_enabled: true
```

## 📖 API Reference

### Client Registration Request

```json
{
  "client_name": "My Application",
  "redirect_uris": ["https://myapp.com/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "scope": "read write"
}
```

### Client Registration Response

```json
{
  "client_id": "mcp_client_abc123",
  "client_secret": "secret_xyz789",
  "redirect_uris": ["https://myapp.com/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_basic"
}
```

### Token Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

## 🧪 Testing & Development

### Running OAuth Tests

```bash
# Use the provided test script
./test-oauth.sh

# Or test manually:
curl http://homeassistant:8080/.well-known/oauth-authorization-server/mcp

# Test client registration
curl -X POST http://homeassistant:8080/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "Test Client"}'

# Test health endpoint with OAuth status
curl http://homeassistant:8080/health
```

### Custom OAuth Client Development

```bash
# Example: Register a custom client
CLIENT_RESPONSE=$(curl -s -X POST http://homeassistant:8080/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name": "My Custom Client", "redirect_uris": ["http://localhost:3000/callback"]}')

# Extract client credentials
CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.client_id')
CLIENT_SECRET=$(echo $CLIENT_RESPONSE | jq -r '.client_secret')

echo "Client ID: $CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"
```

## 🎯 Benefits for Home Assistant

### Enhanced Security
- **JWT-based authentication** - Industry standard tokens
- **Automatic token expiration** - Reduced security risk
- **Scope-based authorization** - Granular permissions
- **Client registration** - Controlled access

### Team Collaboration
- **Claude Code integration** - Direct HTTP transport support
- **Multiple client support** - Different applications can connect
- **Automatic discovery** - Zero-configuration setup
- **Enterprise-ready** - OAuth 2.1 compliance

### Backward Compatibility
- **API key support** - Existing integrations continue to work
- **Dual authentication** - Both methods supported simultaneously
- **Gradual migration** - Enable OAuth without breaking existing clients

## 📚 Related Documentation

- [CPU Optimization Guide](cpu-optimization.md) - Performance tuning for CPU-only operation
- [API Reference](api.md) - Complete endpoint documentation
- [Installation Guide](installation.md) - Setup instructions
- [Security Policy](../SECURITY.md) - Security guidelines and vulnerability reporting

## 🔗 Standards & References

- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) - OAuth 2.1 standard
- [RFC 7591](https://tools.ietf.org/html/rfc7591) - Dynamic Client Registration
- [RFC 8414](https://tools.ietf.org/html/rfc8414) - Authorization Server Metadata
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519) - JSON Web Token standard
- [Original OAuth 2.1 Setup Guide](https://github.com/doobidoo/mcp-memory-service/wiki/OAuth-2.1-Setup-Guide)

---

**Ready to enable enterprise-grade team collaboration?** Follow this guide to set up OAuth 2.1 with your MCP Memory Service Home Assistant add-on!
