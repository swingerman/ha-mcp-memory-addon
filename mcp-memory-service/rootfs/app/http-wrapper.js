const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

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

// Simple API key authentication middleware
const authenticate = (req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
};

// In-memory storage for simplicity (you might want to integrate with actual MCP service)
let memories = [];
const memoryFile = path.join(process.env.DATA_DIR || '/data', 'memories.json');

// Load existing memories
async function loadMemories() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        memories = JSON.parse(data);
        console.log(`Loaded ${memories.length} memories`);
    } catch (error) {
        console.log('No existing memories found, starting fresh');
        memories = [];
    }
}

// Save memories to file
async function saveMemories() {
    try {
        await fs.writeFile(memoryFile, JSON.stringify(memories, null, 2));
    } catch (error) {
        console.error('Error saving memories:', error);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get service info
app.get('/info', authenticate, (req, res) => {
    res.json({
        service: 'MCP Memory Service',
        version: '1.0.0',
        memories_count: memories.length,
        data_dir: process.env.DATA_DIR
    });
});

// Store a memory
app.post('/memory/store', authenticate, async (req, res) => {
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
        await saveMemories();

        console.log(`Stored memory: ${memory.id}`);
        res.json({ success: true, memory_id: memory.id });
    } catch (error) {
        console.error('Error storing memory:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search memories
app.get('/memory/search', authenticate, (req, res) => {
    try {
        const { query, tags, limit = 10 } = req.query;
        let results = [...memories];

        // Filter by query in content
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(memory => 
                memory.content.toLowerCase().includes(searchTerm)
            );
        }

        // Filter by tags
        if (tags) {
            const searchTags = Array.isArray(tags) ? tags : [tags];
            results = results.filter(memory =>
                searchTags.some(tag => memory.tags.includes(tag))
            );
        }

        // Sort by relevance (most recent first for now)
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Limit results
        results = results.slice(0, parseInt(limit));

        res.json({ memories: results, total: results.length });
    } catch (error) {
        console.error('Error searching memories:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all memories
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

// Delete a memory
app.delete('/memory/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const index = memories.findIndex(memory => memory.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Memory not found' });
        }

        memories.splice(index, 1);
        await saveMemories();

        console.log(`Deleted memory: ${id}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting memory:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 8080;

async function startServer() {
    await loadMemories();
    
    app.listen(PORT, () => {
        console.log(`MCP Memory Service HTTP API running on port ${PORT}`);
        console.log(`Data directory: ${process.env.DATA_DIR}`);
        console.log(`CORS enabled: ${process.env.CORS_ENABLED}`);
        console.log(`Authentication enabled: ${process.env.AUTH_ENABLED}`);
    });
}

startServer().catch(console.error);