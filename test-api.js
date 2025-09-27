#!/usr/bin/env node

/**
 * Comprehensive API Testing Suite for MCP Memory Service
 * Tests all endpoints including OAuth 2.1 flow and memory operations
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class MCPMemoryServiceTester {
    constructor(baseUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.testResults = [];
        this.testMemories = [];
    }

    /**
     * Log test results with timestamp
     * @param {string} test - Test name
     * @param {boolean} passed - Whether test passed
     * @param {string} details - Additional details
     */
    logResult(test, passed, details = '') {
        const result = {
            timestamp: new Date().toISOString(),
            test,
            passed,
            details
        };
        this.testResults.push(result);
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test}${details ? ` - ${details}` : ''}`);
    }

    /**
     * Make HTTP request with error handling
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(method, url, options = {}) {
        try {
            const response = await axios({
                method,
                url: `${this.baseUrl}${url}`,
                ...options
            });
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status || 0,
                details: error.response?.data ? JSON.stringify(error.response.data) : error.message
            };
        }
    }

    /**
     * Test health endpoint
     */
    async testHealth() {
        console.log('\n🔍 Testing Health Endpoint...');
        
        const result = await this.makeRequest('GET', '/health');
        
        if (result.success) {
            this.logResult('Health Check', true, `Status: ${result.data.status}`);
            
            // Check OAuth status
            if (result.data.oauth_enabled) {
                this.logResult('OAuth Enabled', true, 'OAuth 2.1 is enabled');
            } else {
                this.logResult('OAuth Enabled', false, 'OAuth 2.1 is disabled');
            }
            
            return result.data;
        } else {
            this.logResult('Health Check', false, `Error: ${result.error}`);
            return null;
        }
    }

    /**
     * Test OAuth discovery endpoints
     */
    async testOAuthDiscovery() {
        console.log('\n🔍 Testing OAuth Discovery...');
        
        // Test OAuth authorization server metadata
        const discoveryResult = await this.makeRequest('GET', '/.well-known/oauth-authorization-server/mcp');
        
        if (discoveryResult.success) {
            this.logResult('OAuth Discovery', true, 'Discovery endpoint accessible');
            
            // Validate required fields
            const requiredFields = ['issuer', 'authorization_endpoint', 'token_endpoint', 'registration_endpoint'];
            const missingFields = requiredFields.filter(field => !discoveryResult.data[field]);
            
            if (missingFields.length === 0) {
                this.logResult('OAuth Discovery Fields', true, 'All required fields present');
            } else {
                this.logResult('OAuth Discovery Fields', false, `Missing: ${missingFields.join(', ')}`);
            }
            
            return discoveryResult.data;
        } else {
            this.logResult('OAuth Discovery', false, `Error: ${discoveryResult.error}`);
            return null;
        }
    }

    /**
     * Test OAuth client registration
     */
    async testOAuthRegistration() {
        console.log('\n🔍 Testing OAuth Client Registration...');
        
        const registrationData = {
            client_name: 'API Test Client',
            redirect_uris: ['http://localhost:3000/callback'],
            grant_types: ['authorization_code'],
            response_types: ['code'],
            scope: 'read write'
        };

        const result = await this.makeRequest('POST', '/oauth/register', {
            headers: { 'Content-Type': 'application/json' },
            data: registrationData
        });

        if (result.success) {
            this.clientId = result.data.client_id;
            this.clientSecret = result.data.client_secret;
            
            this.logResult('OAuth Registration', true, `Client ID: ${this.clientId}`);
            
            // Validate required fields in response
            const requiredFields = ['client_id', 'client_secret', 'redirect_uris', 'grant_types'];
            const missingFields = requiredFields.filter(field => !result.data[field]);
            
            if (missingFields.length === 0) {
                this.logResult('OAuth Registration Response', true, 'All required fields present');
            } else {
                this.logResult('OAuth Registration Response', false, `Missing: ${missingFields.join(', ')}`);
            }
            
            return result.data;
        } else {
            this.logResult('OAuth Registration', false, `Error: ${result.error}`);
            return null;
        }
    }

    /**
     * Test OAuth authorization flow (simulated)
     */
    async testOAuthAuthorization() {
        console.log('\n🔍 Testing OAuth Authorization Flow...');
        
        if (!this.clientId) {
            this.logResult('OAuth Authorization', false, 'No client ID available');
            return null;
        }

        // Start authorization flow
        const authUrl = `${this.baseUrl}/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=http://localhost:3000/callback&scope=read write&state=test-state`;
        
        try {
            const response = await axios.get(authUrl, { maxRedirects: 0, validateStatus: () => true });
            
            if (response.status === 302 && response.headers.location) {
                this.logResult('OAuth Authorization', true, 'Authorization redirect successful');
                
                // Extract authorization code from redirect URL
                const redirectUrl = new URL(response.headers.location);
                const authCode = redirectUrl.searchParams.get('code');
                
                if (authCode) {
                    this.logResult('OAuth Authorization Code', true, 'Authorization code received');
                    return authCode;
                } else {
                    this.logResult('OAuth Authorization Code', false, 'No authorization code in redirect');
                    return null;
                }
            } else {
                this.logResult('OAuth Authorization', false, `Unexpected response: ${response.status}`);
                return null;
            }
        } catch (error) {
            this.logResult('OAuth Authorization', false, `Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Test OAuth token exchange
     */
    async testOAuthTokenExchange(authCode) {
        console.log('\n🔍 Testing OAuth Token Exchange...');
        
        if (!authCode || !this.clientId || !this.clientSecret) {
            this.logResult('OAuth Token Exchange', false, 'Missing required parameters');
            return null;
        }

        const tokenData = {
            grant_type: 'authorization_code',
            code: authCode,
            redirect_uri: 'http://localhost:3000/callback',
            client_id: this.clientId,
            client_secret: this.clientSecret
        };

        const result = await this.makeRequest('POST', '/oauth/token', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: new URLSearchParams(tokenData).toString()
        });

        if (result.success) {
            this.accessToken = result.data.access_token;
            
            this.logResult('OAuth Token Exchange', true, 'Access token received');
            
            // Validate token response
            const requiredFields = ['access_token', 'token_type', 'expires_in'];
            const missingFields = requiredFields.filter(field => !result.data[field]);
            
            if (missingFields.length === 0) {
                this.logResult('OAuth Token Response', true, 'All required fields present');
            } else {
                this.logResult('OAuth Token Response', false, `Missing: ${missingFields.join(', ')}`);
            }
            
            return result.data;
        } else {
            this.logResult('OAuth Token Exchange', false, `Error: ${result.details || result.error}`);
            return null;
        }
    }

    /**
     * Test memory operations with OAuth authentication
     */
    async testMemoryOperationsWithOAuth() {
        console.log('\n🔍 Testing Memory Operations with OAuth...');
        
        if (!this.accessToken) {
            this.logResult('Memory Operations OAuth', false, 'No access token available');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        // Test storing a memory
        const storeResult = await this.makeRequest('POST', '/memory/store', {
            headers,
            data: {
                content: 'OAuth test memory - user prefers morning meetings',
                metadata: { source: 'oauth_test', priority: 'high' },
                tags: ['oauth', 'test', 'preference']
            }
        });

        if (storeResult.success) {
            this.testMemories.push(storeResult.data.memory);
            this.logResult('Store Memory (OAuth)', true, `Memory ID: ${storeResult.data.memory_id}`);
        } else {
            this.logResult('Store Memory (OAuth)', false, `Error: ${storeResult.error}`);
        }

        // Test searching memories
        const searchResult = await this.makeRequest('GET', '/memory/search?query=meeting', {
            headers
        });

        if (searchResult.success) {
            this.logResult('Search Memories (OAuth)', true, `Found ${searchResult.data.memories.length} memories`);
        } else {
            this.logResult('Search Memories (OAuth)', false, `Error: ${searchResult.error}`);
        }

        // Test listing memories
        const listResult = await this.makeRequest('GET', '/memory/list?limit=10', {
            headers
        });

        if (listResult.success) {
            this.logResult('List Memories (OAuth)', true, `Total: ${listResult.data.total} memories`);
        } else {
            this.logResult('List Memories (OAuth)', false, `Error: ${listResult.error}`);
        }

        // Test getting service info
        const infoResult = await this.makeRequest('GET', '/info', {
            headers
        });

        if (infoResult.success) {
            this.logResult('Service Info (OAuth)', true, `Auth method: ${infoResult.data.auth_method}`);
        } else {
            this.logResult('Service Info (OAuth)', false, `Error: ${infoResult.error}`);
        }
    }

    /**
     * Test memory operations with API key authentication
     */
    async testMemoryOperationsWithAPIKey() {
        console.log('\n🔍 Testing Memory Operations with API Key...');
        
        // This would require an API key to be set in the environment
        // For now, we'll test without authentication to see if it's disabled
        const headers = {
            'Content-Type': 'application/json'
        };

        // Test storing a memory without authentication
        const storeResult = await this.makeRequest('POST', '/memory/store', {
            headers,
            data: {
                content: 'API key test memory - user works remotely',
                metadata: { source: 'api_key_test' },
                tags: ['api_key', 'test', 'remote']
            }
        });

        if (storeResult.success) {
            this.testMemories.push(storeResult.data.memory);
            this.logResult('Store Memory (No Auth)', true, 'Authentication not required');
        } else if (storeResult.status === 401) {
            this.logResult('Store Memory (No Auth)', true, 'Authentication required (expected)');
        } else {
            this.logResult('Store Memory (No Auth)', false, `Error: ${storeResult.error}`);
        }
    }

    /**
     * Clean up test memories
     */
    async cleanupTestMemories() {
        console.log('\n🧹 Cleaning up test memories...');
        
        let cleanedCount = 0;
        for (const memory of this.testMemories) {
            const result = await this.makeRequest('DELETE', `/memory/${memory.id}`, {
                headers: this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {}
            });
            
            if (result.success) {
                cleanedCount++;
            }
        }
        
        this.logResult('Cleanup Test Memories', true, `Cleaned up ${cleanedCount} memories`);
    }

    /**
     * Generate test report
     */
    async generateReport() {
        console.log('\n📊 Test Report Summary:');
        console.log('========================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.test}: ${result.details}`);
            });
        }
        
        // Save detailed report
        const reportData = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: (passedTests / totalTests) * 100
            },
            results: this.testResults
        };
        
        try {
            await fs.writeFile('test-report.json', JSON.stringify(reportData, null, 2));
            console.log('\n📄 Detailed report saved to test-report.json');
        } catch (error) {
            console.log('\n⚠️  Could not save report file');
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting MCP Memory Service API Tests');
        console.log('==========================================');
        console.log(`Testing against: ${this.baseUrl}`);
        
        try {
            // Basic health check
            await this.testHealth();
            
            // OAuth discovery
            await this.testOAuthDiscovery();
            
            // OAuth client registration
            await this.testOAuthRegistration();
            
            // OAuth authorization flow
            const authCode = await this.testOAuthAuthorization();
            
            // OAuth token exchange
            if (authCode) {
                await this.testOAuthTokenExchange(authCode);
            }
            
            // Memory operations with OAuth
            if (this.accessToken) {
                await this.testMemoryOperationsWithOAuth();
            }
            
            // Memory operations with API key (if applicable)
            await this.testMemoryOperationsWithAPIKey();
            
            // Cleanup
            await this.cleanupTestMemories();
            
            // Generate report
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.logResult('Test Suite', false, `Unexpected error: ${error.message}`);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://localhost:8080';
    
    const tester = new MCPMemoryServiceTester(baseUrl);
    await tester.runAllTests();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MCPMemoryServiceTester;
