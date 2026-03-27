# Security Policy

## Supported Versions

We actively support the following versions of HumanFirst Control with security updates:

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a Vulnerability

The HumanFirst team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

Please report security vulnerabilities privately via:

- **Email**: security@humanfirst.ai
- **Subject**: `[SECURITY] HumanFirst Control - <brief summary>`

### What to Include

To help us investigate quickly, please include:

1. A clear description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact and attack scenario
4. Any proof-of-concept code (if applicable)
5. Suggested remediation (optional)

### Response Timeline

We aim to:

- **Acknowledge** your report within **48 hours**
- **Provide initial assessment** within **5 business days**
- **Issue fix or mitigation** based on severity and complexity
- **Coordinate disclosure** with you once a fix is available

## Scope

This policy covers security issues in:

- Web application (`src/`)
- Windows agent (`agent/`)
- Electron desktop wrapper (`electron/`)
- Supabase schema/functions (`supabase/`)
- Build and deployment scripts (`scripts/`)

## Out of Scope

The following are generally out of scope unless they demonstrate significant impact:

- Issues requiring physical access to a victim machine
- Social engineering attacks
- Denial of service requiring unrealistic resources
- Vulnerabilities in third-party services outside our control
- Best practice suggestions without exploitable impact

## Security Best Practices

When contributing, please:

- Never commit secrets, API keys, or credentials
- Use `.env.example` for environment variable templates
- Validate all user inputs
- Follow principle of least privilege
- Keep dependencies updated
- Use secure coding patterns for auth and data access

## Safe Harbor

We support and protect security researchers acting in good faith. If you follow this policy, we will not pursue legal action against your research activities.

## Disclosure Policy

- Please do not publicly disclose vulnerabilities before we provide a fix
- We may request a coordinated disclosure window
- We are happy to credit researchers (with permission) in release notes

## Contact

For any security-related concerns:

- Email: security@humanfirst.ai
- Organization: HumanFirst (NIC Faisalabad, governed by Founders Institute)

Thank you for helping keep HumanFirst Control and its users safe.
