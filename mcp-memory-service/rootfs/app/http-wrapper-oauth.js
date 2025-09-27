const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
if (process.env.CORS_ENABLED === 'true') {
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));
}

// OAuth 2.1 Configuration
const OAUTH_ENABLED = process.env.OAUTH_ENABLED === 'true' || process.env.MCP_OAUTH_ENABLED === 'true';
const OAUTH_SECRET_KEY = process.env.OAUTH_SECRET_KEY || process.env.MCP_OAUTH_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES || process.env.MCP_OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES || '60');
const OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES = parseInt(process.env.OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES || process.env.MCP_OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES || '10');

// OAuth client storage
const oauthClients = new Map();
const authorizationCodes = new Map();

/**
 * Simple JWT implementation for OAuth tokens
 * Provides basic JWT encoding/decoding for OAuth 2.1 authentication
 */
class SimpleJWT {
    /**
     * Create a new JWT instance with signing secret
     * @param {string} secret - Secret key for JWT signing
     */
    constructor(secret) {
        this.secret = secret;
    }

    /**
     * Encode a payload into a JWT token
     * @param {Object} payload - The payload to encode
     * @returns {string} The encoded JWT token
     */
    encode(payload) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
        const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto.createHmac('sha256', this.secret)
            .update(`${headerEncoded}.${payloadEncoded}`)
            .digest('base64url');
        return `${headerEncoded}.${payloadEncoded}.${signature}`;
    }

    /**
     * Decode and verify a JWT token
     * @param {string} token - The JWT token to decode
     * @returns {Object} The decoded payload
     * @throws {Error} If token format is invalid or signature verification fails
     */
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

const jwt = new SimpleJWT(OAUTH_SECRET_KEY);

/**
 * Authentication middleware supporting both OAuth and API key authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    
    if (OAUTH_ENABLED && authHeader && authHeader.startsWith('Bearer ')) {
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
    } else if (process.env.AUTH_ENABLED === 'true' && apiKeyHeader) {
        // API key authentication (legacy)
        if (apiKeyHeader !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        req.authMethod = 'api_key';
        return next();
    } else if (process.env.AUTH_ENABLED !== 'true' && !OAUTH_ENABLED) {
        // No authentication required
        return next();
    } else {
        return res.status(401).json({ error: 'Authentication required' });
    }
};

/**
 * MCP Memory Service integration class
 * Handles both the actual MCP Memory Service and fallback JSON storage
 */
class MCPMemoryService {
    /**
     * Initialize the MCP Memory Service
     */
    constructor() {
        this.process = null;
        this.isReady = false;
        this.memories = [];
        this.memoryFile = path.join(process.env.DATA_DIR || '/data', 'memories.json');
        this.fallbackMode = false;
    }

    /**
     * Start the MCP Memory Service or fallback to JSON storage
     * @returns {Promise<void>}
     */
    async start() {
        try {
            // Try to start the actual MCP Memory Service
            await this.startMCPService();
        } catch (error) {
            console.warn('MCP Memory Service not available, using fallback mode:', error.message);
            this.fallbackMode = true;
            await this.loadFallbackMemories();
        }
    }

    /**
     * Start the actual MCP Memory Service Python process
     * @returns {Promise<void>} Resolves when service is ready
     * @throws {Error} If service fails to start or times out
     */
    async startMCPService() {
        return new Promise((resolve, reject) => {
            // Start the MCP Memory Service Python process
            this.process = spawn('python3', ['-m', 'mcp_memory_service'], {
                cwd: '/app',
                env: {
                    ...process.env,
                    MCP_MEMORY_STORAGE_BACKEND: process.env.MCP_MEMORY_STORAGE_BACKEND || 'sqlite_vec',
                    MCP_BATCH_SIZE: process.env.MCP_BATCH_SIZE || '16',
                    MCP_MAX_CONTEXT_LENGTH: process.env.MCP_MAX_CONTEXT_LENGTH || '512',
                    MCP_EMBEDDING_MODEL: process.env.MCP_EMBEDDING_MODEL || 'all-MiniLM-L6-v2',
                    MCP_HTTP_ENABLED: 'true',
                    MCP_HTTP_PORT: '8081',
                    MCP_OAUTH_ENABLED: OAUTH_ENABLED ? 'true' : 'false',
                    MCP_OAUTH_SECRET_KEY: OAUTH_SECRET_KEY,
                    // CPU-only optimization flags
                    OMP_NUM_THREADS: '2',
                    MKL_NUM_THREADS: '2',
                    CUDA_VISIBLE_DEVICES: '',
                    PYTORCH_CUDA_ALLOC_CONF: ''
                }
            });

            this.process.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('MCP Service:', output);
                if (output.includes('Server started')) {
                    this.isReady = true;
                    resolve();
                }
            });

            this.process.stderr.on('data', (data) => {
                console.error('MCP Service Error:', data.toString());
            });

            this.process.on('close', (code) => {
                console.log(`MCP Memory Service process exited with code ${code}`);
                this.isReady = false;
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!this.isReady) {
                    reject(new Error('MCP Memory Service startup timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Load memories from JSON file in fallback mode
     * @returns {Promise<void>}
     */
    async loadFallbackMemories() {
        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memories = JSON.parse(data);
            console.log(`Loaded ${this.memories.length} memories in fallback mode`);
        } catch (error) {
            console.log('No existing memories found, starting fresh');
            this.memories = [];
        }
    }

    /**
     * Save memories to JSON file in fallback mode
     * @returns {Promise<void>}
     */
    async saveFallbackMemories() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memories, null, 2));
        } catch (error) {
            console.error('Error saving memories:', error);
        }
    }

    /**
     * Store a new memory
     * @param {string} content - The memory content
     * @param {Object} [metadata={}] - Optional metadata for the memory
     * @param {string[]} [tags=[]] - Optional tags for the memory
     * @returns {Promise<Object>} The stored memory object
     * @throws {Error} If content is not provided
     */
    async storeMemory(content, metadata = {}, tags = []) {
        if (!content) {
            throw new Error('Content is required');
        }

        if (this.fallbackMode) {
            const memory = {
                id: Date.now().toString(),
                content,
                metadata,
                tags,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.memories.push(memory);
            await this.saveFallbackMemories();
            return memory;
        } else {
            // Use actual MCP Memory Service
            return this.callMCPService('store', { content, metadata, tags });
        }
    }

    /**
     * Search for memories based on query and tags
     * @param {string} query - Search query string
     * @param {string[]} [tags=[]] - Tags to filter by
     * @param {number} [limit=10] - Maximum number of results to return
     * @returns {Promise<Array>} Array of matching memories
     */
    async searchMemories(query, tags = [], limit = 10) {
        if (this.fallbackMode) {
            let results = [...this.memories];

            if (query) {
                const searchTerm = query.toLowerCase();
                results = results.filter(memory => 
                    memory.content.toLowerCase().includes(searchTerm)
                );
            }

            if (tags.length > 0) {
                results = results.filter(memory =>
                    tags.some(tag => memory.tags.includes(tag))
                );
            }

            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return results.slice(0, limit);
        } else {
            return this.callMCPService('search', { query, tags, limit });
        }
    }

    /**
     * List memories with pagination
     * @param {number} [limit=50] - Maximum number of memories to return
     * @param {number} [offset=0] - Number of memories to skip
     * @returns {Promise<Object>} Object containing memories array and pagination info
     */
    async listMemories(limit = 50, offset = 0) {
        if (this.fallbackMode) {
            const sortedMemories = [...this.memories].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
            const paginatedMemories = sortedMemories.slice(offset, offset + limit);
            return {
                memories: paginatedMemories,
                total: this.memories.length,
                offset,
                limit
            };
        } else {
            return this.callMCPService('list', { limit, offset });
        }
    }

    /**
     * Delete a memory by ID
     * @param {string} id - The memory ID to delete
     * @returns {Promise<boolean>} True if deleted successfully
     * @throws {Error} If memory is not found
     */
    async deleteMemory(id) {
        if (this.fallbackMode) {
            const index = this.memories.findIndex(memory => memory.id === id);
            if (index === -1) {
                throw new Error('Memory not found');
            }
            this.memories.splice(index, 1);
            await this.saveFallbackMemories();
            return true;
        } else {
            return this.callMCPService('delete', { id });
        }
    }

    /**
     * Call the actual MCP Memory Service (not yet implemented)
     * @param {string} method - The method to call
     * @param {Object} params - Parameters for the method
     * @returns {Promise<*>} The result from the MCP service
     * @throws {Error} Not yet implemented
     */
    async callMCPService(method, params) {
        // This would make HTTP calls to the actual MCP Memory Service
        // For now, we'll use the fallback implementation
        throw new Error('MCP Service integration not yet implemented');
    }

    /**
     * Get service statistics
     * @returns {Promise<Object>} Statistics about the service
     */
    async getStats() {
        if (this.fallbackMode) {
            return {
                mode: 'fallback',
                total_memories: this.memories.length,
                backend: 'json_file'
            };
        } else {
            return {
                mode: 'mcp_service',
                backend: process.env.MCP_MEMORY_STORAGE_BACKEND || 'sqlite_vec'
            };
        }
    }
}

// Initialize MCP Memory Service
const mcpService = new MCPMemoryService();

// OAuth 2.1 Discovery Endpoints
if (OAUTH_ENABLED) {
    /**
     * OAuth Authorization Server Metadata endpoint
     * Provides OAuth 2.1 discovery information
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
     * OpenID Connect Discovery endpoint (optional)
     * Provides OpenID Connect discovery information
     */
    app.get('/.well-known/openid-configuration/mcp', (req, res) => {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/oauth/authorize`,
            token_endpoint: `${baseUrl}/oauth/token`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            scopes_supported: ['openid', 'profile', 'read', 'write'],
            response_types_supported: ['code'],
            subject_types_supported: ['public']
        });
    });

    /**
     * OAuth Client Registration endpoint
     * Registers new OAuth clients dynamically
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
     * Handles OAuth authorization flow
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
            
            // For simplicity, auto-approve all authorization requests
            // In production, you'd show a consent screen
            const authCode = crypto.randomBytes(16).toString('hex');
            const expiresAt = Date.now() + (OAUTH_AUTHORIZATION_CODE_EXPIRE_MINUTES * 60 * 1000);
            
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
     * Exchanges authorization codes for access tokens
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
                exp: Math.floor(Date.now() / 1000) + (OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60),
                sub: client_id
            };
            
            const accessToken = jwt.encode(accessTokenPayload);
            
            // Clean up authorization code
            authorizationCodes.delete(code);
            
            res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: OAUTH_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                scope: authCodeData.scope
            });
        } catch (error) {
            console.error('OAuth token error:', error);
            res.status(400).json({ error: 'Invalid token request' });
        }
    });

    /**
     * OAuth Client Information endpoint
     * Returns information about a registered OAuth client
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
}

/**
 * Health check endpoint
 * Returns service status and configuration information
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'MCP Memory Service HTTP Wrapper',
        mode: mcpService.fallbackMode ? 'fallback' : 'mcp_service',
        oauth_enabled: OAUTH_ENABLED,
        auth_methods: OAUTH_ENABLED ? ['oauth_bearer', 'api_key'] : ['api_key']
    });
});

/**
 * Get service information endpoint
 * Returns detailed service information and statistics
 */
app.get('/info', authenticate, async (req, res) => {
    try {
        const stats = await mcpService.getStats();
        res.json({
            service: 'MCP Memory Service',
            version: '1.0.0',
            mode: stats.mode,
            backend: stats.backend,
            total_memories: stats.total_memories || 0,
            data_dir: process.env.DATA_DIR,
            auth_method: req.authMethod,
            environment: {
                cors_enabled: process.env.CORS_ENABLED === 'true',
                auth_enabled: process.env.AUTH_ENABLED === 'true',
                oauth_enabled: OAUTH_ENABLED,
                mcp_backend: process.env.MCP_MEMORY_STORAGE_BACKEND,
                embedding_model: process.env.MCP_EMBEDDING_MODEL
            }
        });
    } catch (error) {
        console.error('Error getting service info:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Store a memory endpoint
 * Creates a new memory with content, metadata, and tags
 */
app.post('/memory/store', authenticate, async (req, res) => {
    try {
        const { content, metadata = {}, tags = [] } = req.body;
        const memory = await mcpService.storeMemory(content, metadata, tags);
        console.log(`Stored memory: ${memory.id}`);
        res.json({ success: true, memory_id: memory.id, memory });
    } catch (error) {
        console.error('Error storing memory:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Search memories endpoint
 * Searches for memories based on query and tags
 */
app.get('/memory/search', authenticate, async (req, res) => {
    try {
        const { query, tags, limit = 10 } = req.query;
        const searchTags = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
        const results = await mcpService.searchMemories(query, searchTags, parseInt(limit));
        res.json({ memories: results, total: results.length });
    } catch (error) {
        console.error('Error searching memories:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List memories endpoint
 * Returns paginated list of all memories
 */
app.get('/memory/list', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const result = await mcpService.listMemories(parseInt(limit), parseInt(offset));
        res.json(result);
    } catch (error) {
        console.error('Error listing memories:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete memory endpoint
 * Deletes a memory by its ID
 */
app.delete('/memory/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await mcpService.deleteMemory(id);
        console.log(`Deleted memory: ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get memory statistics endpoint
 * Returns statistics about stored memories
 */
app.get('/memory/stats', authenticate, async (req, res) => {
    try {
        const stats = await mcpService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 8080;

/**
 * Start the HTTP server and initialize the MCP Memory Service
 * @returns {Promise<void>}
 */
async function startServer() {
    console.log('Starting MCP Memory Service HTTP Wrapper...');
    
    // Start the MCP Memory Service
    await mcpService.start();
    
    app.listen(PORT, () => {
        console.log(`MCP Memory Service HTTP API running on port ${PORT}`);
        console.log(`Data directory: ${process.env.DATA_DIR}`);
        console.log(`CORS enabled: ${process.env.CORS_ENABLED}`);
        console.log(`Authentication enabled: ${process.env.AUTH_ENABLED}`);
        console.log(`OAuth 2.1 enabled: ${OAUTH_ENABLED}`);
        console.log(`Service mode: ${mcpService.fallbackMode ? 'fallback' : 'mcp_service'}`);
        console.log(`MCP Backend: ${process.env.MCP_MEMORY_STORAGE_BACKEND}`);
        console.log(`Embedding Model: ${process.env.MCP_EMBEDDING_MODEL}`);
        
        if (OAUTH_ENABLED) {
            console.log(`OAuth Discovery: http://localhost:${PORT}/.well-known/oauth-authorization-server/mcp`);
            console.log(`OAuth Registration: http://localhost:${PORT}/oauth/register`);
        }
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (mcpService.process) {
        mcpService.process.kill();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    if (mcpService.process) {
        mcpService.process.kill();
    }
    process.exit(0);
});

startServer().catch(console.error);
