# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to avoid exposing users to potential attacks.

### 2. Report via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/swingerman/ha-mcp-memory-addon/security) in this repository
2. Click "Report a vulnerability"
3. Fill out the security advisory form with:
   - **Summary**: Brief description of the vulnerability
   - **Affected versions**: Which versions are affected
   - **Description**: Detailed description of the vulnerability
   - **Steps to reproduce**: How to reproduce the issue
   - **Impact**: What the vulnerability allows an attacker to do
   - **Suggested fix**: If you have suggestions for fixing the issue

### 3. Alternative Reporting Methods

If you cannot use GitHub Security Advisories, you can report via:

- **Email**: [Your email address] (if you want to provide one)
- **Discord**: [Your Discord handle] (if applicable)
- **Twitter**: [@yourhandle] (if applicable)

## Response Timeline

We will respond to security reports within:

- **Initial response**: 24-48 hours
- **Status update**: Within 1 week
- **Resolution**: As quickly as possible, typically within 2-4 weeks

## Security Best Practices

### For Users

1. **Keep the add-on updated**: Always use the latest version
2. **Enable authentication**: Set a strong API key in configuration
3. **Network security**: Use HTTPS when accessing from external networks
4. **Monitor logs**: Check add-on logs regularly for suspicious activity
5. **Limit access**: Only expose the service to trusted networks when possible

### For Developers

1. **Input validation**: Always validate and sanitize user input
2. **Authentication**: Implement proper authentication for all endpoints
3. **Rate limiting**: Consider implementing rate limiting for API endpoints
4. **Logging**: Log security-relevant events
5. **Dependencies**: Keep dependencies updated and monitor for vulnerabilities

## Security Features

This add-on includes several security features:

- **Optional API Key Authentication**: Protect your memory service with authentication
- **CORS Configuration**: Control cross-origin access
- **Input Validation**: All API inputs are validated
- **Container Security**: Runs in a secure container with AppArmor profile
- **Dependency Monitoring**: Dependabot monitors for security vulnerabilities

## Known Security Considerations

### API Key Authentication

- API keys are transmitted in headers - use HTTPS in production
- Store API keys securely in your configuration
- Rotate API keys regularly

### Data Storage

- Memory data is stored as JSON files in the container
- Ensure proper file permissions on the storage directory
- Consider encrypting sensitive memory data if needed

### Network Access

- The service runs on port 8080 by default
- Use a reverse proxy with SSL for external access
- Consider firewall rules to limit access

## Security Updates

Security updates will be released as:

1. **Patch releases** (1.0.1, 1.0.2, etc.) for critical security fixes
2. **Minor releases** (1.1.0, 1.2.0, etc.) for security improvements
3. **Major releases** (2.0.0, etc.) for breaking security changes

## Vulnerability Disclosure

When we fix a security vulnerability:

1. We will create a security advisory in GitHub
2. We will release a new version with the fix
3. We will update the changelog with security information
4. We will notify users through the GitHub release notes

## Bug Bounty

Currently, we do not offer a formal bug bounty program, but we appreciate security researchers who help improve our security posture.

## Contact

For security-related questions or concerns, please use the GitHub Security Advisories feature or contact us through the methods listed above.

---

**Last updated**: $(date +"%Y-%m-%d")
