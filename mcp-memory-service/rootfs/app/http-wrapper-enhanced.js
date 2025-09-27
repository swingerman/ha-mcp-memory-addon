const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS configuration
if (process.env.CORS_ENABLED === 'true') {
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));
}

/**
 * Simple API key authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
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

    async saveFallbackMemories() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memories, null, 2));
        } catch (error) {
            console.error('Error saving memories:', error);
        }
    }

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

    async callMCPService(method, params) {
        // This would make HTTP calls to the actual MCP Memory Service
        // For now, we'll use the fallback implementation
        throw new Error('MCP Service integration not yet implemented');
    }

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'MCP Memory Service HTTP Wrapper',
        mode: mcpService.fallbackMode ? 'fallback' : 'mcp_service'
    });
});

// Get service info
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
            environment: {
                cors_enabled: process.env.CORS_ENABLED === 'true',
                auth_enabled: process.env.AUTH_ENABLED === 'true',
                mcp_backend: process.env.MCP_MEMORY_STORAGE_BACKEND,
                embedding_model: process.env.MCP_EMBEDDING_MODEL
            }
        });
    } catch (error) {
        console.error('Error getting service info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Store a memory
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

// Search memories
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

// List all memories
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

// Delete a memory
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

// Get service statistics
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

async function startServer() {
    console.log('Starting MCP Memory Service HTTP Wrapper...');
    
    // Start the MCP Memory Service
    await mcpService.start();
    
    app.listen(PORT, () => {
        console.log(`MCP Memory Service HTTP API running on port ${PORT}`);
        console.log(`Data directory: ${process.env.DATA_DIR}`);
        console.log(`CORS enabled: ${process.env.CORS_ENABLED}`);
        console.log(`Authentication enabled: ${process.env.AUTH_ENABLED}`);
        console.log(`Service mode: ${mcpService.fallbackMode ? 'fallback' : 'mcp_service'}`);
        console.log(`MCP Backend: ${process.env.MCP_MEMORY_STORAGE_BACKEND}`);
        console.log(`Embedding Model: ${process.env.MCP_EMBEDDING_MODEL}`);
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
