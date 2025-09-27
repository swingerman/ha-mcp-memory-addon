#!/bin/bash

# MCP Memory Service API Test Runner
# Provides different testing scenarios for the add-on

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BASE_URL="http://localhost:8080"
TEST_TYPE="all"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "MCP Memory Service API Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL       Base URL for testing (default: http://localhost:8080)"
    echo "  -t, --type TYPE     Test type: all, oauth, basic, health, integration (default: all)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test local instance"
    echo "  $0 -u http://homeassistant:8080      # Test Home Assistant instance"
    echo "  $0 -t oauth                          # Test only OAuth endpoints"
    echo "  $0 -t health                         # Test only health endpoint"
    echo ""
    echo "Test Types:"
    echo "  all         - Run all tests (OAuth + Memory operations)"
    echo "  oauth       - Test OAuth 2.1 flow only"
    echo "  basic       - Test basic endpoints without OAuth"
    echo "  health      - Test health endpoint only"
    echo "  integration - Test REAL MCP Memory Service with AI/ML capabilities"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate test type
case $TEST_TYPE in
    all|oauth|basic|health|integration)
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        show_usage
        exit 1
        ;;
esac

print_status "Starting MCP Memory Service API Tests"
print_status "Base URL: $BASE_URL"
print_status "Test Type: $TEST_TYPE"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if axios is available
if ! node -e "require('axios')" &> /dev/null; then
    print_warning "axios not found, installing dependencies..."
    npm install
fi

# Create test script based on type
case $TEST_TYPE in
    health)
        print_status "Running health check only..."
        node -e "
        const axios = require('axios');
        axios.get('$BASE_URL/health')
            .then(response => {
                console.log('✅ Health Check Passed');
                console.log('Status:', response.data.status);
                console.log('OAuth Enabled:', response.data.oauth_enabled);
                console.log('Service:', response.data.service);
            })
            .catch(error => {
                console.log('❌ Health Check Failed');
                console.log('Error:', error.message);
                process.exit(1);
            });
        "
        ;;
    basic)
        print_status "Running basic API tests..."
        node -e "
        const axios = require('axios');
        const baseUrl = '$BASE_URL';
        
        async function testBasic() {
            try {
                // Test health
                const health = await axios.get(baseUrl + '/health');
                console.log('✅ Health Check:', health.data.status);
                
                // Test info (might require auth)
                try {
                    const info = await axios.get(baseUrl + '/info');
                    console.log('✅ Service Info:', info.data.service);
                } catch (e) {
                    console.log('⚠️  Service Info requires authentication');
                }
                
                // Test memory list (might require auth)
                try {
                    const list = await axios.get(baseUrl + '/memory/list');
                    console.log('✅ Memory List:', list.data.total, 'memories');
                } catch (e) {
                    console.log('⚠️  Memory List requires authentication');
                }
                
                console.log('✅ Basic tests completed');
            } catch (error) {
                console.log('❌ Basic tests failed:', error.message);
                process.exit(1);
            }
        }
        
        testBasic();
        "
        ;;
    oauth)
        print_status "Running OAuth 2.1 tests..."
        node -e "
        const axios = require('axios');
        const baseUrl = '$BASE_URL';
        
        async function testOAuth() {
            try {
                // Test OAuth discovery
                const discovery = await axios.get(baseUrl + '/.well-known/oauth-authorization-server/mcp');
                console.log('✅ OAuth Discovery:', discovery.data.issuer);
                
                // Test client registration
                const registration = await axios.post(baseUrl + '/oauth/register', {
                    client_name: 'Test Client',
                    redirect_uris: ['http://localhost:3000/callback']
                });
                console.log('✅ Client Registration:', registration.data.client_id);
                
                console.log('✅ OAuth tests completed');
            } catch (error) {
                console.log('❌ OAuth tests failed:', error.message);
                process.exit(1);
            }
        }
        
        testOAuth();
        "
        ;;
    all)
        print_status "Running comprehensive test suite..."
        node test-api.js "$BASE_URL"
        ;;
    integration)
        print_status "Running integration tests against REAL MCP Memory Service..."
        print_warning "This tests the actual service with AI/ML capabilities"
        node test-integration.js "$BASE_URL"
        ;;
esac

# Check if tests passed
if [ $? -eq 0 ]; then
    print_success "All tests completed successfully!"
else
    print_error "Some tests failed. Check the output above for details."
    exit 1
fi
