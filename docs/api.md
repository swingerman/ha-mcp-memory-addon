# API Documentation

## Authentication

If an API key is configured, include it in requests:

```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-key" http://homeassistant:8080/memory/search

# Using Authorization header
curl -H "Authorization: Bearer your-api-key" http://homeassistant:8080/memory/search
```

## Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-09-27T10:00:00.000Z"
}
```

### Service Information
```http
GET /info
```

**Response:**
```json
{
  "service": "MCP Memory Service",
  "version": "1.0.0",
  "memories_count": 42,
  "data_dir": "/data"
}
```

### Store Memory
```http
POST /memory/store
Content-Type: application/json

{
  "content": "User prefers morning meetings",
  "metadata": {
    "source": "conversation",
    "confidence": 0.9
  },
  "tags": ["preference", "scheduling"]
}
```

**Response:**
```json
{
  "success": true,
  "memory_id": "1695812400000"
}
```

### Search Memories
```http
GET /memory/search?query=meeting&tags=preference&limit=5
```

**Parameters:**
- `query` (string): Search term in memory content
- `tags` (string|array): Filter by tags
- `limit` (integer): Maximum results (default: 10)

**Response:**
```json
{
  "memories": [
    {
      "id": "1695812400000",
      "content": "User prefers morning meetings",
      "metadata": {
        "source": "conversation",
        "confidence": 0.9
      },
      "tags": ["preference", "scheduling"],
      "created_at": "2024-09-27T10:00:00.000Z",
      "updated_at": "2024-09-27T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### List All Memories
```http
GET /memory/list?limit=50&offset=0
```

**Parameters:**
- `limit` (integer): Maximum results (default: 50)
- `offset` (integer): Skip number of results (default: 0)

**Response:**
```json
{
  "memories": [...],
  "total": 100,
  "offset": 0,
  "limit": 50
}
```

### Delete Memory
```http
DELETE /memory/{memory_id}
```

**Response:**
```json
{
  "success": true
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid/missing API key)
- `404` - Not Found (memory doesn't exist)
- `500` - Internal Server Error

**Error Format:**
```json
{
  "error": "Description of the error"
}
```

## Usage Examples

### Python Client
```python
import requests

class MCPMemoryClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url.rstrip('/')
        self.headers = {'Content-Type': 'application/json'}
        if api_key:
            self.headers['X-API-Key'] = api_key
    
    def store(self, content, metadata=None, tags=None):
        data = {'content': content}
        if metadata:
            data['metadata'] = metadata
        if tags:
            data['tags'] = tags
            
        response = requests.post(
            f'{self.base_url}/memory/store',
            json=data,
            headers=self.headers
        )
        return response.json()
    
    def search(self, query=None, tags=None, limit=10):
        params = {'limit': limit}
        if query:
            params['query'] = query
        if tags:
            params['tags'] = tags
            
        response = requests.get(
            f'{self.base_url}/memory/search',
            params=params,
            headers=self.headers
        )
        return response.json()

# Usage
client = MCPMemoryClient('http://homeassistant:8080', 'your-api-key')
client.store('User likes coffee in the morning', tags=['preference'])
memories = client.search('coffee')
```

### JavaScript Client
```javascript
class MCPMemoryClient {
    constructor(baseUrl, apiKey = null) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            this.headers['X-API-Key'] = apiKey;
        }
    }

    async store(content, metadata = {}, tags = []) {
        const response = await fetch(`${this.baseUrl}/memory/store`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ content, metadata, tags })
        });
        return response.json();
    }

    async search(query = null, tags = null, limit = 10) {
        const params = new URLSearchParams({ limit });
        if (query) params.append('query', query);
        if (tags) params.append('tags', tags);

        const response = await fetch(`${this.baseUrl}/memory/search?${params}`, {
            headers: this.headers
        });
        return response.json();
    }
}

// Usage
const client = new MCPMemoryClient('http://homeassistant:8080', 'your-api-key');
await client.store('User prefers dark mode', {}, ['preference', 'ui']);
const memories = await client.search('dark mode');
```

### curl Examples
```bash
# Store a memory
curl -X POST http://homeassistant:8080/memory/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content": "User is working on a React project",
    "metadata": {"project": "web-app", "tech": "react"},
    "tags": ["project", "development"]
  }'

# Search memories
curl "http://homeassistant:8080/memory/search?query=React&limit=5" \
  -H "X-API-Key: your-api-key"

# List recent memories
curl "http://homeassistant:8080/memory/list?limit=10" \
  -H "X-API-Key: your-api-key"

# Delete a memory
curl -X DELETE http://homeassistant:8080/memory/1695812400000 \
  -H "X-API-Key: your-api-key"
```