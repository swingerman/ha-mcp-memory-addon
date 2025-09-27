# Testing the Real MCP Memory Service

This document explains how to test the **actual** MCP Memory Service with AI/ML capabilities, not just the mock test server.

## 🎯 Testing Overview

### **Two Types of Testing:**

#### 1. **Mock Testing** (Current Setup)
- ✅ **What it tests**: HTTP endpoints, OAuth flow, basic functionality
- ✅ **What it uses**: Simple Express.js server with in-memory storage
- ✅ **Limitations**: No AI/ML, no real persistence, no actual MCP service

#### 2. **Integration Testing** (Real Service)
- ✅ **What it tests**: Actual MCP Memory Service with AI/ML capabilities
- ✅ **What it uses**: Real Python service with vector embeddings
- ✅ **Features**: Semantic search, real persistence, actual AI processing

## 🚀 Testing the Real Service

### Prerequisites

1. **Install the MCP Memory Service add-on** in Home Assistant
2. **Configure OAuth** (recommended):
   ```yaml
   oauth_enabled: true
   oauth_secret_key: "your-secure-256-bit-secret-key"
   ```
3. **Start the add-on** and ensure it's running

### Running Integration Tests

```bash
# Test against the real Home Assistant add-on
./run-tests.sh -u http://homeassistant:8080 -t integration

# Or use npm script
npm run test:integration:ha

# Test against local instance (if running locally)
./run-tests.sh -u http://localhost:8080 -t integration
```

### What Integration Tests Validate

#### **Real OAuth 2.1 Flow:**
- ✅ **OAuth Discovery** - Actual OAuth server metadata
- ✅ **Client Registration** - Real OAuth client registration
- ✅ **Authorization Flow** - Actual authorization with real service
- ✅ **JWT Token Exchange** - Real JWT tokens from actual service

#### **AI/ML Capabilities:**
- ✅ **Semantic Search** - AI-powered content matching
- ✅ **Vector Embeddings** - Real embedding generation and storage
- ✅ **Intelligent Matching** - AI understanding of content relationships
- ✅ **Context Awareness** - AI understanding of memory context

#### **Real Persistence:**
- ✅ **SQLite Vector Database** - Actual vector storage
- ✅ **Memory Persistence** - Real data persistence across restarts
- ✅ **Search Accuracy** - Real AI-powered search results

## 🔍 Integration Test Details

### **Test Flow:**

1. **Service Detection** - Verify it's the real service (not mock)
2. **OAuth Discovery** - Test real OAuth endpoints
3. **Client Registration** - Register with real OAuth service
4. **Authorization** - Complete real OAuth flow
5. **Token Exchange** - Get real JWT tokens
6. **AI Memory Operations** - Test with rich content for AI processing
7. **Semantic Search** - Validate AI-powered search capabilities
8. **Persistence Testing** - Verify real data persistence

### **Sample Integration Test Output:**

```
🚀 Starting MCP Memory Service Integration Tests
==================================================
Testing against: http://homeassistant:8080
Testing REAL MCP Memory Service with AI/ML capabilities

🔍 Testing MCP Memory Service Availability...
✅ PASS Service Health Check - Status: healthy
✅ PASS Real Service Detection - Actual MCP Memory Service detected

🔍 Testing Real OAuth 2.1 Discovery...
✅ PASS OAuth Discovery - Real OAuth discovery endpoint accessible
✅ PASS Real OAuth Endpoints - All OAuth endpoints available

🔍 Testing Real OAuth Client Registration...
✅ PASS OAuth Registration - Real client registered: mcp_client_abc123

🔍 Testing Real OAuth Authorization Flow...
✅ PASS OAuth Authorization - Real authorization redirect successful
✅ PASS OAuth Authorization Code - Authorization code received from real service

🔍 Testing Real OAuth Token Exchange...
✅ PASS OAuth Token Exchange - Real access token received
✅ PASS JWT Token Validation - Token expires: 2024-01-01T13:00:00.000Z

🔍 Testing Real Memory Operations with AI/ML...
✅ PASS Store Memory (Real) - Memory stored: 1759008871316
✅ PASS Semantic Search (Real) - Found 1 relevant memories
✅ PASS AI Semantic Matching - AI correctly matched ML query to machine learning content
✅ PASS Tag Search (Real) - Found 1 memories with tags
✅ PASS List Memories (Real) - Total: 1 memories in real storage
✅ PASS Service Stats (Real) - Backend: sqlite_vec, Mode: mcp_service

🔍 Testing Memory Persistence...
✅ PASS Memory Persistence - Memory persisted and retrievable

📊 Integration Test Report Summary:
=====================================
Total Tests: 12
Passed: 12
Failed: 0
Success Rate: 100.0%
```

## 🛠️ Setting Up Real Service Testing

### **Option 1: Home Assistant Add-on (Recommended)**

1. **Install the add-on** from the add-on store
2. **Configure OAuth**:
   ```yaml
   oauth_enabled: true
   oauth_secret_key: "your-secure-secret-key"
   oauth_access_token_expire_minutes: 60
   oauth_authorization_code_expire_minutes: 10
   ```
3. **Start the add-on**
4. **Run integration tests**:
   ```bash
   ./run-tests.sh -u http://homeassistant:8080 -t integration
   ```

### **Option 2: Local Development**

1. **Clone the MCP Memory Service**:
   ```bash
   git clone https://github.com/doobidoo/mcp-memory-service.git
   cd mcp-memory-service
   ```

2. **Set up Python environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   export MCP_OAUTH_ENABLED=true
   export MCP_OAUTH_SECRET_KEY="your-secret-key"
   export MCP_HTTP_ENABLED=true
   export MCP_HTTP_PORT=8080
   ```

4. **Start the service**:
   ```bash
   uv run memory server --http
   ```

5. **Run integration tests**:
   ```bash
   ./run-tests.sh -u http://localhost:8080 -t integration
   ```

## 🔬 What Integration Tests Validate

### **AI/ML Capabilities:**

#### **Semantic Search Testing:**
```javascript
// Store a memory about machine learning
await axios.post('/memory/store', {
    content: 'User is interested in machine learning and Python development',
    tags: ['ml', 'python', 'development']
});

// Search for "artificial intelligence" - should find ML-related content
const results = await axios.get('/memory/search?query=artificial intelligence');
// AI should match "artificial intelligence" to "machine learning" content
```

#### **Vector Embedding Validation:**
- ✅ **Content Understanding** - AI processes natural language content
- ✅ **Semantic Relationships** - AI understands content relationships
- ✅ **Context Awareness** - AI considers context and metadata
- ✅ **Search Accuracy** - AI returns relevant results based on meaning

### **Real Persistence Testing:**

#### **Database Operations:**
- ✅ **SQLite Vector Storage** - Real vector database operations
- ✅ **Memory Persistence** - Data survives service restarts
- ✅ **Search Performance** - Real vector similarity search
- ✅ **Data Integrity** - Consistent data across operations

### **OAuth 2.1 Real Implementation:**

#### **Production-Grade OAuth:**
- ✅ **Real JWT Tokens** - Actual JWT generation and validation
- ✅ **Client Management** - Real OAuth client registration and storage
- ✅ **Token Expiration** - Real token lifecycle management
- ✅ **Security Validation** - Production-grade security measures

## 🐛 Troubleshooting Integration Tests

### **Common Issues:**

#### 1. **Service Not Available**
```bash
# Error: Service not available
# Solution: Ensure the add-on is installed and running
curl http://homeassistant:8080/health
```

#### 2. **OAuth Not Enabled**
```bash
# Error: OAuth endpoints not found
# Solution: Enable OAuth in add-on configuration
# Set oauth_enabled: true in add-on config
```

#### 3. **AI/ML Not Working**
```bash
# Error: Semantic search not finding relevant content
# Solution: Check if Python dependencies are installed
# Verify MCP_EMBEDDING_MODEL is configured
```

#### 4. **Persistence Issues**
```bash
# Error: Memory not persisting
# Solution: Check storage path configuration
# Verify database permissions
```

## 📊 Test Comparison

| Feature | Mock Tests | Integration Tests |
|---------|------------|-------------------|
| **OAuth Flow** | ✅ Simulated | ✅ Real Implementation |
| **Memory Storage** | ✅ In-memory | ✅ SQLite Vector DB |
| **AI/ML Search** | ❌ No AI | ✅ Real AI Processing |
| **Persistence** | ❌ Temporary | ✅ Real Persistence |
| **Performance** | ✅ Fast | ✅ Real Performance |
| **Security** | ✅ Basic | ✅ Production-Grade |

## 🎯 When to Use Each Test Type

### **Use Mock Tests For:**
- ✅ **Development** - Rapid iteration and debugging
- ✅ **API Design** - Testing endpoint designs
- ✅ **OAuth Flow** - Validating OAuth implementation
- ✅ **Unit Testing** - Isolated component testing

### **Use Integration Tests For:**
- ✅ **Production Validation** - Pre-deployment testing
- ✅ **AI/ML Validation** - Testing semantic search capabilities
- ✅ **Performance Testing** - Real-world performance validation
- ✅ **End-to-End Testing** - Complete system validation

## 📚 Related Documentation

- [Testing Guide](testing.md) - General testing overview
- [OAuth Integration Guide](oauth-integration.md) - OAuth 2.1 setup
- [API Reference](api.md) - Complete API documentation
- [CPU Optimization Guide](cpu-optimization.md) - Performance tuning

---

**Ready to test the real AI-powered MCP Memory Service?** Start with integration tests to validate the complete system with OAuth 2.1 and AI/ML capabilities! 🚀
