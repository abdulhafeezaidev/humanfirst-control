# Contributing to HumanFirst Control

First off, thank you for considering contributing to HumanFirst Control! It's people like you that make HumanFirst such a great tool.

## Our Development Philosophy

HumanFirst Control is built on three core principles:

1. **Enforcement without Surveillance** - We never spy on users or violate their privacy
2. **Transparency** - Students and admins should always know what's happening
3. **Open Source First** - We believe in community-driven security and development

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue list](https://github.com/humanfirst-ai/humanfirst-control/issues) as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs if possible**
* **Include your environment details** (OS, Node.js version, .NET version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and the expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

* Follow the [TypeScript](#typescript-styleguide) and [C#](#csharp-styleguide) style guides
* Include appropriate test cases
* End all files with a newline
* Use meaningful commit messages
* Reference issues and pull requests liberally after the first line

## Development Setup

### Prerequisites

- Node.js >=18.0.0
- .NET 8 SDK
- Git
- Supabase account (free tier)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/humanfirst-ai/humanfirst-control.git
cd humanfirst-control

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Create a free Supabase project and add credentials to .env
# Then start development
npm run dev
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Building for Desktop

```bash
# Electron development
npm run desktop:dev

# Package desktop app
npm run desktop:package

# Distribute desktop app
npm run desktop:dist
```

### Windows Agent Development

```bash
cd agent/ControlPlane.Agent

# Run tests
dotnet test

# Build debug version
dotnet build

# Build release version
dotnet publish -c Release
```

## Style Guides

### TypeScript StyleGuide

- Use **2 spaces** for indentation
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and types
- Use **UPPER_SNAKE_CASE** for constants
- Prefer `const` over `let`, never use `var`
- Use explicit type annotations for exported functions
- Use template literals instead of string concatenation
- Maximum line length is 100 characters (for readability)

Example:

```typescript
// Good
interface UserPolicy {
  id: string;
  name: string;
  enforcementMode: 'strict' | 'lenient';
}

const MAX_RETRY_ATTEMPTS = 3;

const applyPolicy = (userId: string, policy: UserPolicy): Promise<void> => {
  // Implementation
};

// Bad
var userPolicy: any = {}; // Avoid var and any
const applyPolicy = (userId, policy) => { // Missing types
```

### C# StyleGuide

- Use **4 spaces** for indentation
- Use **PascalCase** for class names and public methods
- Use **camelCase** for local variables and private fields
- Prefix private fields with `_`
- Use explicit access modifiers (public, private, protected, internal)
- Follow [Microsoft C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)

Example:

```csharp
// Good
public class PolicyEnforcer
{
    private readonly Logger _logger;

    public PolicyEnforcer(Logger logger)
    {
        _logger = logger;
    }

    public async Task EnforcePolicy(Policy policy)
    {
        _logger.Information("Enforcing policy: {PolicyId}", policy.Id);
        // Implementation
    }
}

// Bad
public class PolicyEnforcer
{
    Logger logger; // Missing access modifier and underscore prefix
    
    public PolicyEnforcer(Logger l) { // Unclear parameter name
        logger = l;
    }
}
```

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Add" not "Adds")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with a prefix:
  - `feat:` when adding a feature
  - `fix:` when fixing a bug
  - `refactor:` when restructuring code
  - `perf:` when improving performance
  - `docs:` when writing docs
  - `test:` when adding tests
  - `chore:` when changing tooling/dependencies

Example:

```
feat: add enrollment verification to admin dashboard

- Implement document upload verification
- Add verification status tracking
- Update student transparency view

Fixes #123
```

## Documentation

- Use Markdown for documentation
- Keep documentation up-to-date with code changes
- Document complex algorithms and business logic
- Include examples for API documentation

## Additional Notes

### Issue and Pull Request Labels

- **bug** - Something that's broken
- **enhancement** - New feature or request
- **documentation** - Improvements or additions to documentation
- **good first issue** - Good for newcomers
- **help wanted** - Extra attention is needed
- **question** - Further information is requested
- **security** - Security-related issue
- **wontfix** - This will not be worked on

## Community

- Join our [GitHub Discussions](https://github.com/humanfirst-ai/humanfirst-control/discussions)
- Ask questions in the [Q&A section](https://github.com/humanfirst-ai/humanfirst-control/discussions/categories/q-a)
- Share ideas in [Ideas discussions](https://github.com/humanfirst-ai/humanfirst-control/discussions/categories/ideas)

## License

By contributing to HumanFirst Control, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to:
- Open an issue with the label `question`
- Start a discussion in [GitHub Discussions](https://github.com/humanfirst-ai/humanfirst-control/discussions)
- Reach out to the maintainers

Thank you for contributing to HumanFirst Control!
