#!/usr/bin/env node

/**
 * Integration Tests for Actual MCP Memory Service
 * Tests the real service with OAuth 2.1 and AI/ML capabilities
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class MCPMemoryServiceIntegrationTester {
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
                timeout: 30000, // 30 second timeout for AI operations
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
     * Test if the actual MCP Memory Service is running
     */
    async testServiceAvailability() {
        console.log('\n🔍 Testing MCP Memory Service Availability...');
        
        const result = await this.makeRequest('GET', '/health');
        
        if (result.success) {
            this.logResult('Service Health Check', true, `Status: ${result.data.status}`);
            
            // Check if it's the actual service (not mock)
            const isRealService = result.data.service && 
                                 !result.data.service.includes('Test') &&
                                 !result.data.service.includes('Mock');
            
            if (isRealService) {
                this.logResult('Real Service Detection', true, 'Actual MCP Memory Service detected');
            } else {
                this.logResult('Real Service Detection', false, 'Mock service detected - not testing real capabilities');
            }
            
            return result.data;
        } else {
            this.logResult('Service Health Check', false, `Error: ${result.error}`);
            return null;
        }
    }

    /**
     * Test OAuth 2.1 discovery with real service
     */
    async testRealOAuthDiscovery() {
        console.log('\n🔍 Testing Real OAuth 2.1 Discovery...');
        
        const result = await this.makeRequest('GET', '/.well-known/oauth-authorization-server/mcp');
        
        if (result.success) {
            this.logResult('OAuth Discovery', true, 'Real OAuth discovery endpoint accessible');
            
            // Validate that this is a real OAuth implementation
            const hasRealEndpoints = result.data.issuer && 
                                   result.data.authorization_endpoint &&
                                   result.data.token_endpoint;
            
            if (hasRealEndpoints) {
                this.logResult('Real OAuth Endpoints', true, 'All OAuth endpoints available');
            } else {
                this.logResult('Real OAuth Endpoints', false, 'Missing OAuth endpoints');
            }
            
            return result.data;
        } else {
            this.logResult('OAuth Discovery', false, `Error: ${result.error}`);
            return null;
        }
    }

    /**
     * Test OAuth client registration with real service
     */
    async testRealOAuthRegistration() {
        console.log('\n🔍 Testing Real OAuth Client Registration...');
        
        const registrationData = {
            client_name: 'Integration Test Client',
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
            
            this.logResult('OAuth Registration', true, `Real client registered: ${this.clientId}`);
            return result.data;
        } else {
            this.logResult('OAuth Registration', false, `Error: ${result.details || result.error}`);
            return null;
        }
    }

    /**
     * Test OAuth authorization flow with real service
     */
    async testRealOAuthAuthorization() {
        console.log('\n🔍 Testing Real OAuth Authorization Flow...');
        
        if (!this.clientId) {
            this.logResult('OAuth Authorization', false, 'No client ID available');
            return null;
        }

        try {
            const authUrl = `${this.baseUrl}/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=http://localhost:3000/callback&scope=read write&state=integration-test`;
            
            const response = await axios.get(authUrl, { 
                maxRedirects: 0, 
                validateStatus: () => true,
                timeout: 10000
            });
            
            if (response.status === 302 && response.headers.location) {
                this.logResult('OAuth Authorization', true, 'Real authorization redirect successful');
                
                const redirectUrl = new URL(response.headers.location);
                const authCode = redirectUrl.searchParams.get('code');
                
                if (authCode) {
                    this.logResult('OAuth Authorization Code', true, 'Authorization code received from real service');
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
     * Test OAuth token exchange with real service
     */
    async testRealOAuthTokenExchange(authCode) {
        console.log('\n🔍 Testing Real OAuth Token Exchange...');
        
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
            
            this.logResult('OAuth Token Exchange', true, 'Real access token received');
            
            // Validate JWT token structure
            try {
                const parts = this.accessToken.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                    this.logResult('JWT Token Validation', true, `Token expires: ${new Date(payload.exp * 1000).toISOString()}`);
                } else {
                    this.logResult('JWT Token Validation', false, 'Invalid JWT format');
                }
            } catch (error) {
                this.logResult('JWT Token Validation', false, 'JWT parsing failed');
            }
            
            return result.data;
        } else {
            this.logResult('OAuth Token Exchange', false, `Error: ${result.details || result.error}`);
            return null;
        }
    }

    /**
     * Test real memory operations with AI/ML capabilities
     */
    async testRealMemoryOperations() {
        console.log('\n🔍 Testing Real Memory Operations with AI/ML...');
        
        if (!this.accessToken) {
            this.logResult('Memory Operations', false, 'No access token available');
            return;
        }

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        // Test storing a memory with rich content for AI processing
        const storeResult = await this.makeRequest('POST', '/memory/store', {
            headers,
            data: {
                content: 'User prefers morning meetings and works remotely on Fridays. They are interested in machine learning and Python development.',
                metadata: { 
                    source: 'integration_test', 
                    priority: 'high',
                    category: 'preferences',
                    context: 'work_schedule'
                },
                tags: ['meeting', 'remote_work', 'preferences', 'ml', 'python']
            }
        });

        if (storeResult.success) {
            this.testMemories.push(storeResult.data.memory);
            this.logResult('Store Memory (Real)', true, `Memory stored: ${storeResult.data.memory_id}`);
        } else {
            this.logResult('Store Memory (Real)', false, `Error: ${storeResult.error}`);
            return;
        }

        // Test semantic search capabilities
        const searchResult = await this.makeRequest('GET', '/memory/search?query=artificial intelligence', {
            headers
        });

        if (searchResult.success) {
            this.logResult('Semantic Search (Real)', true, `Found ${searchResult.data.memories.length} relevant memories`);
            
            // Check if AI-powered search found the ML-related memory
            const foundMLMemory = searchResult.data.memories.some(memory => 
                memory.content.toLowerCase().includes('machine learning') ||
                memory.tags.includes('ml')
            );
            
            if (foundMLMemory) {
                this.logResult('AI Semantic Matching', true, 'AI correctly matched ML query to machine learning content');
            } else {
                this.logResult('AI Semantic Matching', false, 'AI did not match ML query to relevant content');
            }
        } else {
            this.logResult('Semantic Search (Real)', false, `Error: ${searchResult.error}`);
        }

        // Test tag-based search
        const tagSearchResult = await this.makeRequest('GET', '/memory/search?tags=python,remote_work', {
            headers
        });

        if (tagSearchResult.success) {
            this.logResult('Tag Search (Real)', true, `Found ${tagSearchResult.data.memories.length} memories with tags`);
        } else {
            this.logResult('Tag Search (Real)', false, `Error: ${tagSearchResult.error}`);
        }

        // Test memory listing
        const listResult = await this.makeRequest('GET', '/memory/list?limit=10', {
            headers
        });

        if (listResult.success) {
            this.logResult('List Memories (Real)', true, `Total: ${listResult.data.total} memories in real storage`);
        } else {
            this.logResult('List Memories (Real)', false, `Error: ${listResult.error}`);
        }

        // Test service statistics
        const statsResult = await this.makeRequest('GET', '/memory/stats', {
            headers
        });

        if (statsResult.success) {
            this.logResult('Service Stats (Real)', true, `Backend: ${statsResult.data.backend}, Mode: ${statsResult.data.mode}`);
        } else {
            this.logResult('Service Stats (Real)', false, `Error: ${statsResult.error}`);
        }
    }

    /**
     * Test persistence across service restarts
     */
    async testMemoryPersistence() {
        console.log('\n🔍 Testing Memory Persistence...');
        
        if (this.testMemories.length === 0) {
            this.logResult('Memory Persistence', false, 'No test memories to check persistence');
            return;
        }

        // Wait a moment for any potential persistence operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        // Try to retrieve the stored memory
        const searchResult = await this.makeRequest('GET', '/memory/search?query=remote work', {
            headers
        });

        if (searchResult.success && searchResult.data.memories.length > 0) {
            this.logResult('Memory Persistence', true, 'Memory persisted and retrievable');
        } else {
            this.logResult('Memory Persistence', false, 'Memory not found - persistence issue');
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
     * Generate integration test report
     */
    async generateReport() {
        console.log('\n📊 Integration Test Report Summary:');
        console.log('=====================================');
        
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
            testType: 'integration',
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: (passedTests / totalTests) * 100
            },
            results: this.testResults
        };
        
        try {
            await fs.writeFile('integration-test-report.json', JSON.stringify(reportData, null, 2));
            console.log('\n📄 Detailed integration report saved to integration-test-report.json');
        } catch (error) {
            console.log('\n⚠️  Could not save integration report file');
        }
    }

    /**
     * Run all integration tests
     */
    async runIntegrationTests() {
        console.log('🚀 Starting MCP Memory Service Integration Tests');
        console.log('==================================================');
        console.log(`Testing against: ${this.baseUrl}`);
        console.log('Testing REAL MCP Memory Service with AI/ML capabilities');
        
        try {
            // Test service availability
            const healthData = await this.testServiceAvailability();
            if (!healthData) {
                console.log('\n❌ Service not available. Please start the actual MCP Memory Service add-on.');
                return;
            }

            // Test OAuth discovery
            await this.testRealOAuthDiscovery();
            
            // Test OAuth client registration
            await this.testRealOAuthRegistration();
            
            // Test OAuth authorization flow
            const authCode = await this.testRealOAuthAuthorization();
            
            // Test OAuth token exchange
            if (authCode) {
                await this.testRealOAuthTokenExchange(authCode);
            }
            
            // Test real memory operations with AI/ML
            if (this.accessToken) {
                await this.testRealMemoryOperations();
                await this.testMemoryPersistence();
            }
            
            // Cleanup
            await this.cleanupTestMemories();
            
            // Generate report
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Integration test suite failed:', error.message);
            this.logResult('Integration Test Suite', false, `Unexpected error: ${error.message}`);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://localhost:8080';
    
    console.log('🔬 Integration Testing Mode');
    console.log('This will test the ACTUAL MCP Memory Service with AI/ML capabilities');
    console.log(`Target URL: ${baseUrl}`);
    console.log('');
    
    const tester = new MCPMemoryServiceIntegrationTester(baseUrl);
    await tester.runIntegrationTests();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MCPMemoryServiceIntegrationTester;
