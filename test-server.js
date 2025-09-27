#!/usr/bin/env node

/**
 * Test Server for MCP Memory Service
 * A simplified version for testing API endpoints
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Simple JWT implementation
class SimpleJWT {
    constructor(secret = 'test-secret-key') {
        this.secret = secret;
    }

    encode(payload) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
        const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto.createHmac('sha256', this.secret)
            .update(`${headerEncoded}.${payloadEncoded}`)
            .digest('base64url');
        return `${headerEncoded}.${payloadEncoded}.${signature}`;
    }

    decode(token) {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');
        
        const [headerEncoded, payloadEncoded, signature] = parts;
        const expectedSignature = crypto.createHmac('sha256', this.secret)
            .update(`${headerEncoded}.${payloadEncoded}`)
            .digest('base64url');
        
        if (signature !== expectedSignature) throw new Error('Invalid signature');
        
        return JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());
    }
}

const jwt = new SimpleJWT();
const oauthClients = new Map();
const authorizationCodes = new Map();
const memories = [];

// Authentication middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // OAuth Bearer token authentication
        const token = authHeader.substring(7);
        try {
            const payload = jwt.decode(token);
            if (payload.exp && Date.now() / 1000 > payload.exp) {
                return res.status(401).json({ error: 'Token expired' });
            }
            req.user = payload;
            req.authMethod = 'oauth';
            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } else if (apiKeyHeader) {
        // API key authentication (for testing, accept any key)
        req.authMethod = 'api_key';
        return next();
    } else {
        // No authentication required for testing
        return next();
    }
};

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MCP Memory Service HTTP Wrapper (Test)',
        mode: 'test',
        oauth_enabled: true,
        auth_methods: ['oauth_bearer', 'api_key']
    });
});

/**
 * Service info endpoint
 */
app.get('/info', authenticate, (req, res) => {
    res.json({
        service: 'MCP Memory Service (Test)',
        version: '1.0.0-test',
        mode: 'test',
        backend: 'memory',
        total_memories: memories.length,
        data_dir: '/tmp/test-data',
        auth_method: req.authMethod || 'none',
        environment: {
            cors_enabled: true,
            auth_enabled: false,
            oauth_enabled: true,
            mcp_backend: 'test',
            embedding_model: 'test-model'
        }
    });
});

/**
 * OAuth Authorization Server Metadata
 */
app.get('/.well-known/oauth-authorization-server/mcp', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        scopes_supported: ['read', 'write', 'admin'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'client_credentials'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post']
    });
});

/**
 * OAuth Client Registration
 */
app.post('/oauth/register', (req, res) => {
    try {
        const { client_name, redirect_uris = [], grant_types = ['authorization_code'], response_types = ['code'], scope = 'read write' } = req.body;
        
        const clientId = `mcp_client_${crypto.randomBytes(8).toString('hex')}`;
        const clientSecret = crypto.randomBytes(16).toString('hex');
        
        const client = {
            client_id: clientId,
            client_secret: clientSecret,
            client_name,
            redirect_uris,
            grant_types,
            response_types,
            scope,
            token_endpoint_auth_method: 'client_secret_basic',
            created_at: new Date().toISOString()
        };
        
        oauthClients.set(clientId, client);
        
        console.log(`Registered OAuth client: ${client_name} (${clientId})`);
        res.json(client);
    } catch (error) {
        console.error('OAuth registration error:', error);
        res.status(400).json({ error: 'Invalid registration request' });
    }
});

/**
 * OAuth Authorization Endpoint
 */
app.get('/oauth/authorize', (req, res) => {
    try {
        const { client_id, response_type, redirect_uri, scope, state } = req.query;
        
        if (response_type !== 'code') {
            return res.status(400).json({ error: 'unsupported_response_type' });
        }
        
        const client = oauthClients.get(client_id);
        if (!client) {
            return res.status(400).json({ error: 'invalid_client' });
        }
        
        // Auto-approve for testing
        const authCode = crypto.randomBytes(16).toString('hex');
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
        
        authorizationCodes.set(authCode, {
            client_id,
            redirect_uri,
            scope,
            expires_at: expiresAt
        });
        
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', authCode);
        if (state) redirectUrl.searchParams.set('state', state);
        
        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('OAuth authorization error:', error);
        res.status(400).json({ error: 'Invalid authorization request' });
    }
});

/**
 * OAuth Token Endpoint
 */
app.post('/oauth/token', (req, res) => {
    try {
        const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;
        
        if (grant_type !== 'authorization_code') {
            return res.status(400).json({ error: 'unsupported_grant_type' });
        }
        
        const authCodeData = authorizationCodes.get(code);
        if (!authCodeData) {
            return res.status(400).json({ error: 'invalid_grant' });
        }
        
        if (Date.now() > authCodeData.expires_at) {
            authorizationCodes.delete(code);
            return res.status(400).json({ error: 'invalid_grant' });
        }
        
        const client = oauthClients.get(client_id);
        if (!client || client.client_secret !== client_secret) {
            return res.status(400).json({ error: 'invalid_client' });
        }
        
        // Generate access token
        const accessTokenPayload = {
            client_id,
            scope: authCodeData.scope,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            sub: client_id
        };
        
        const accessToken = jwt.encode(accessTokenPayload);
        
        // Clean up authorization code
        authorizationCodes.delete(code);
        
        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: authCodeData.scope
        });
    } catch (error) {
        console.error('OAuth token error:', error);
        res.status(400).json({ error: 'Invalid token request' });
    }
});

/**
 * OAuth Client Information
 */
app.get('/oauth/clients/:clientId', (req, res) => {
    const client = oauthClients.get(req.params.clientId);
    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
    }
    
    // Don't return the client secret
    const { client_secret, ...clientInfo } = client;
    res.json(clientInfo);
});

/**
 * Store a memory
 */
app.post('/memory/store', authenticate, (req, res) => {
    try {
        const { content, metadata = {}, tags = [] } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const memory = {
            id: Date.now().toString(),
            content,
            metadata,
            tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        memories.push(memory);
        
        console.log(`Stored memory: ${memory.id}`);
        res.json({ success: true, memory_id: memory.id, memory });
    } catch (error) {
        console.error('Error storing memory:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Search memories
 */
app.get('/memory/search', authenticate, (req, res) => {
    try {
        const { query, tags, limit = 10 } = req.query;
        let results = [...memories];
        
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(memory => 
                memory.content.toLowerCase().includes(searchTerm)
            );
        }
        
        if (tags) {
            const searchTags = Array.isArray(tags) ? tags : [tags];
            results = results.filter(memory =>
                searchTags.some(tag => memory.tags.includes(tag))
            );
        }
        
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        results = results.slice(0, parseInt(limit));
        
        res.json({ memories: results, total: results.length });
    } catch (error) {
        console.error('Error searching memories:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List memories
 */
app.get('/memory/list', authenticate, (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const start = parseInt(offset);
        const end = start + parseInt(limit);
        
        const sortedMemories = [...memories].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        const paginatedMemories = sortedMemories.slice(start, end);
        
        res.json({
            memories: paginatedMemories,
            total: memories.length,
            offset: start,
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error listing memories:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a memory
 */
app.delete('/memory/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const index = memories.findIndex(memory => memory.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Memory not found' });
        }
        
        memories.splice(index, 1);
        
        console.log(`Deleted memory: ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get service statistics
 */
app.get('/memory/stats', authenticate, (req, res) => {
    try {
        res.json({
            mode: 'test',
            total_memories: memories.length,
            backend: 'memory'
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Start the test server
 */
app.listen(PORT, () => {
    console.log(`🧪 MCP Memory Service Test Server running on port ${PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${PORT}/health`);
    console.log(`🔐 OAuth discovery: http://localhost:${PORT}/.well-known/oauth-authorization-server/mcp`);
    console.log(`📝 OAuth registration: http://localhost:${PORT}/oauth/register`);
    console.log(`💾 Memory operations: http://localhost:${PORT}/memory/*`);
    console.log('\n🚀 Ready for testing! Use Ctrl+C to stop.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
