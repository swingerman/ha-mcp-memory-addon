# Testing Guide

This document provides comprehensive testing instructions for the MCP Memory Service Home Assistant add-on, including OAuth 2.1 authentication and all API endpoints.

## 🧪 Testing Overview

The project includes a complete testing suite that validates:

- ✅ **OAuth 2.1 Authentication Flow** - Complete OAuth implementation
- ✅ **API Endpoints** - All memory operations (store, search, list, delete)
- ✅ **Authentication Methods** - Both OAuth Bearer tokens and API keys
- ✅ **Service Health** - Health checks and service information
- ✅ **Error Handling** - Proper error responses and validation

## 🚀 Quick Start Testing

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Ensure you have the test dependencies
npm list axios express cors
```

### Running Tests

```bash
# Test against local test server (recommended for development)
./run-tests.sh -u http://localhost:8081 -t all

# Test against Home Assistant add-on
./run-tests.sh -u http://homeassistant:8080 -t all

# Test specific functionality
./run-tests.sh -u http://localhost:8081 -t oauth    # OAuth only
./run-tests.sh -u http://localhost:8081 -t health   # Health check only
./run-tests.sh -u http://localhost:8081 -t basic    # Basic endpoints
```

## 🛠️ Test Environment Setup

### Option 1: Local Test Server (Recommended)

The easiest way to test is using the included test server:

```bash
# Start the test server
PORT=8081 node test-server.js

# In another terminal, run tests
./run-tests.sh -u http://localhost:8081 -t all
```

The test server provides:
- ✅ Complete OAuth 2.1 implementation
- ✅ All API endpoints
- ✅ Mock memory storage
- ✅ Realistic responses

### Option 2: Home Assistant Add-on

For testing against the actual add-on:

1. **Install the add-on** in Home Assistant
2. **Configure OAuth** (optional):
   ```yaml
   oauth_enabled: true
   oauth_secret_key: "your-secure-secret-key"
   ```
3. **Start the add-on**
4. **Run tests**:
   ```bash
   ./run-tests.sh -u http://homeassistant:8080 -t all
   ```

## 📋 Test Suite Details

### Test Categories

#### 1. Health Check Tests
- ✅ **Service Status** - Verify service is running
- ✅ **OAuth Status** - Check if OAuth is enabled
- ✅ **Service Information** - Basic service details

#### 2. OAuth 2.1 Tests
- ✅ **Discovery Endpoint** - OAuth server metadata
- ✅ **Client Registration** - Dynamic client registration
- ✅ **Authorization Flow** - Authorization code generation
- ✅ **Token Exchange** - Access token retrieval
- ✅ **JWT Validation** - Token format and expiration

#### 3. Memory Operation Tests
- ✅ **Store Memory** - Create new memories
- ✅ **Search Memories** - Query and filter memories
- ✅ **List Memories** - Paginated memory listing
- ✅ **Delete Memory** - Remove memories
- ✅ **Service Statistics** - Memory counts and stats

#### 4. Authentication Tests
- ✅ **OAuth Bearer Tokens** - JWT-based authentication
- ✅ **API Key Authentication** - Legacy authentication
- ✅ **No Authentication** - Public endpoints (if configured)

## 📊 Test Results

### Sample Test Output

```
🚀 Starting MCP Memory Service API Tests
==========================================
Testing against: http://localhost:8081

🔍 Testing Health Endpoint...
✅ PASS Health Check - Status: healthy
✅ PASS OAuth Enabled - OAuth 2.1 is enabled

🔍 Testing OAuth Discovery...
✅ PASS OAuth Discovery - Discovery endpoint accessible
✅ PASS OAuth Discovery Fields - All required fields present

🔍 Testing OAuth Client Registration...
✅ PASS OAuth Registration - Client ID: mcp_client_abc123
✅ PASS OAuth Registration Response - All required fields present

🔍 Testing OAuth Authorization Flow...
✅ PASS OAuth Authorization - Authorization redirect successful
✅ PASS OAuth Authorization Code - Authorization code received

🔍 Testing OAuth Token Exchange...
✅ PASS OAuth Token Exchange - Access token received
✅ PASS OAuth Token Response - All required fields present

🔍 Testing Memory Operations with OAuth...
✅ PASS Store Memory (OAuth) - Memory ID: 1759008871316
✅ PASS Search Memories (OAuth) - Found 1 memories
✅ PASS List Memories (OAuth) - Total: 1 memories
✅ PASS Service Info (OAuth) - Auth method: oauth

🧹 Cleaning up test memories...
✅ PASS Cleanup Test Memories - Cleaned up 2 memories

📊 Test Report Summary:
========================
Total Tests: 16
Passed: 16
Failed: 0
Success Rate: 100.0%

📄 Detailed report saved to test-report.json
```

### Test Report Files

- **`test-report.json`** - Detailed JSON report with timestamps and results
- **Console Output** - Real-time test progress and results
- **Exit Codes** - 0 for success, 1 for failures

## 🔧 Test Configuration

### Environment-Specific Testing

```bash
# Local development
./run-tests.sh -u http://localhost:8081 -t all

# Home Assistant development
./run-tests.sh -u http://homeassistant:8080 -t all

# Production testing (with HTTPS)
./run-tests.sh -u https://your-domain.com:8080 -t all
```

### Test Types

| Test Type | Description | Tests Included |
|-----------|-------------|----------------|
| `health` | Basic health check | Health endpoint only |
| `oauth` | OAuth 2.1 flow | Discovery, registration, authorization |
| `basic` | Basic API endpoints | Health, info, memory operations |
| `all` | Complete test suite | All tests including OAuth flow |

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Error: Failed to connect to localhost port 8081
# Solution: Start the test server
PORT=8081 node test-server.js
```

#### 2. OAuth Token Exchange Fails
```bash
# Error: unsupported_grant_type
# Solution: Ensure test server has urlencoded middleware
# Check test-server.js has: app.use(express.urlencoded({ extended: true }));
```

#### 3. Authentication Required
```bash
# Error: Authentication required
# Solution: Check if OAuth is enabled and configured properly
curl http://localhost:8081/health
```

#### 4. Port Already in Use
```bash
# Error: Port 8081 is already in use
# Solution: Use a different port
PORT=8082 node test-server.js
./run-tests.sh -u http://localhost:8082 -t all
```

### Debug Mode

For detailed debugging, you can modify the test scripts:

```javascript
// In test-api.js, add more logging
console.log('Request data:', JSON.stringify(options, null, 2));
console.log('Response:', JSON.stringify(response.data, null, 2));
```

## 📚 Advanced Testing

### Custom Test Scenarios

#### Test OAuth with Custom Client
```javascript
// Register custom client
const client = await axios.post('http://localhost:8081/oauth/register', {
    client_name: 'Custom Test Client',
    redirect_uris: ['https://myapp.com/callback'],
    scope: 'read write admin'
});

console.log('Client ID:', client.data.client_id);
```

#### Test Memory Operations with Different Auth Methods
```javascript
// Test with OAuth Bearer token
const oauthResponse = await axios.post('http://localhost:8081/memory/store', {
    content: 'OAuth test memory'
}, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Test with API key
const apiKeyResponse = await axios.post('http://localhost:8081/memory/store', {
    content: 'API key test memory'
}, {
    headers: { 'X-API-Key': 'your-api-key' }
});
```

### Performance Testing

```bash
# Test response times
time curl http://localhost:8081/health

# Load testing with multiple concurrent requests
for i in {1..10}; do
    ./run-tests.sh -u http://localhost:8081 -t health &
done
wait
```

## 🔍 Test Files Reference

### Core Test Files

- **`test-api.js`** - Main test suite with comprehensive OAuth and API testing
- **`test-server.js`** - Mock server for local testing
- **`run-tests.sh`** - Test runner with different test types
- **`test-oauth.sh`** - Simple OAuth flow testing
- **`test-config.json`** - Test configuration for different environments

### Test Dependencies

- **`axios`** - HTTP client for API requests
- **`express`** - Web server for test server
- **`cors`** - CORS middleware for test server

### Generated Files

- **`test-report.json`** - Detailed test results (generated after each test run)

## 🎯 Best Practices

### Testing Workflow

1. **Start with local test server** for rapid development
2. **Test OAuth flow** before testing memory operations
3. **Validate authentication** with both OAuth and API keys
4. **Clean up test data** after each test run
5. **Test against real add-on** before deployment

### Continuous Integration

```bash
# Add to CI/CD pipeline
npm install
./run-tests.sh -u http://localhost:8081 -t all
if [ $? -ne 0 ]; then
    echo "Tests failed!"
    exit 1
fi
```

### Security Testing

- ✅ **OAuth Token Expiration** - Verify tokens expire correctly
- ✅ **Invalid Token Handling** - Test with malformed tokens
- ✅ **Client Validation** - Verify client registration security
- ✅ **Scope Validation** - Test OAuth scope restrictions

## 📖 Related Documentation

- [OAuth Integration Guide](oauth-integration.md) - OAuth 2.1 setup and configuration
- [API Reference](api.md) - Complete API endpoint documentation
- [CPU Optimization Guide](cpu-optimization.md) - Performance tuning
- [Installation Guide](installation.md) - Add-on installation instructions

---

**Ready to test your MCP Memory Service?** Start with the local test server and work your way up to testing against the actual Home Assistant add-on! 🚀
