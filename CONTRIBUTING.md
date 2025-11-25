# Contributing to Somos Tech v2

Thank you for your interest in contributing to Somos Tech! This guide will help you get started with development.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Collaborate openly and constructively
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

```bash
# Required tools
- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4
- Git

# Optional but recommended
- VS Code with Azure extensions
- PowerShell 7+ (for scripts)
```

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/somos-tech/somos-tech-v2.git
   cd somos-tech-v2
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd apps/web
   npm install

   # Backend
   cd ../api
   npm install
   ```

3. **Configure environment**
   ```bash
   # Frontend (.env.local)
   cd apps/web
   cp .env.example .env.local
   # Edit .env.local with your API URL

   # Backend (local.settings.json)
   cd ../api
   cp local.settings.json.example local.settings.json
   # Edit with your Cosmos DB credentials
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd apps/api
   func start

   # Terminal 2 - Frontend
   cd apps/web
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:7071

---

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `dev` - Development integration branch (if used)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   # Frontend
   cd apps/web
   npm run build
   npm run lint

   # Backend
   cd apps/api
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add user profile editing
fix: resolve authentication redirect loop
docs: update deployment guide
refactor: simplify event service logic
```

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for frontend code
- Use modern ES6+ syntax
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks
- Use async/await over promises chains
- Add JSDoc comments for functions

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props
- Follow component file structure:
  ```typescript
  // 1. Imports
  import React from 'react';
  
  // 2. Types/Interfaces
  interface MyComponentProps {
    // ...
  }
  
  // 3. Component
  export function MyComponent({ prop1, prop2 }: MyComponentProps) {
    // 4. Hooks
    const [state, setState] = useState();
    
    // 5. Event handlers
    const handleClick = () => { };
    
    // 6. Effects
    useEffect(() => { }, []);
    
    // 7. Render
    return <div>...</div>;
  }
  ```

### Azure Functions

- One function per file
- Use descriptive function names
- Export function configuration
- Handle errors gracefully
- Return proper HTTP status codes
- Log important events
- Example structure:
  ```javascript
  const { app } = require('@azure/functions');
  const { httpResponse, errorResponse } = require('../shared/httpResponse');
  
  app.http('functionName', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
      try {
        // Implementation
        return httpResponse({ data: result });
      } catch (error) {
        context.error('Error:', error);
        return errorResponse(error, 500);
      }
    }
  });
  ```

### CSS/Styling

- Use Tailwind CSS utility classes
- Keep custom CSS minimal
- Use CSS modules for component-specific styles
- Follow mobile-first responsive design

---

## Testing Guidelines

### Frontend Testing

- Test user interactions
- Test error states
- Test loading states
- Test accessibility

### Backend Testing

- Test API endpoints
- Test error handling
- Test authentication/authorization
- Test database operations
- Test input validation

### Manual Testing Checklist

- [ ] Authentication flows work
- [ ] CRUD operations succeed
- [ ] Error messages are clear
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance is acceptable

---

## Documentation

### When to Update Docs

- Adding new features
- Changing APIs
- Modifying deployment process
- After security reviews
- Fixing bugs that affect usage

### Documentation Files

- **README.md** - Project overview, quick start
- **docs/guides/** - Feature guides and setup
- **docs/deployment/** - Deployment procedures
- **docs/security/** - Security documentation
- **Code comments** - Explain complex logic

### Documentation Style

- Be clear and concise
- Include code examples
- Add screenshots for UI features
- Keep it up to date
- Link to related docs

---

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all tests**
   ```bash
   # Frontend
   cd apps/web
   npm run build
   npm run lint

   # Backend
   cd apps/api
   npm test
   ```

3. **Update documentation**
   - Update README.md if needed
   - Update relevant guides
   - Add code comments

4. **Self-review your code**
   - Check for console.log statements
   - Remove commented-out code
   - Verify error handling
   - Check for security issues

### Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/my-new-feature
   ```

2. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the template:
     - Description of changes
     - Related issues
     - Testing performed
     - Screenshots (if UI changes)

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Related Issues
   Fixes #123
   
   ## Testing
   - [ ] Tested locally
   - [ ] All tests pass
   - [ ] Linting passes
   
   ## Screenshots (if applicable)
   [Add screenshots here]
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-reviewed the code
   - [ ] Commented complex code
   - [ ] Updated documentation
   - [ ] No new warnings
   - [ ] Added tests
   ```

### Review Process

1. **Code Review**
   - Maintainers will review your PR
   - Address feedback promptly
   - Make requested changes

2. **Approval**
   - At least one approval required
   - All checks must pass
   - No merge conflicts

3. **Merge**
   - Maintainer will merge when ready
   - PR branch will be deleted

---

## Project Structure

```
somos-tech-v2/
├── apps/
│   ├── api/                  # Azure Functions backend
│   │   ├── functions/        # HTTP trigger functions
│   │   ├── shared/          # Shared utilities
│   │   └── package.json
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   ├── api/         # API service layer
│       │   ├── hooks/       # Custom React hooks
│       │   └── lib/         # Utilities
│       └── package.json
├── infra/                   # Infrastructure as Code (Bicep)
├── scripts/                 # Deployment & utility scripts
├── docs/                    # Documentation
│   ├── deployment/          # Deployment docs
│   ├── guides/              # Feature guides
│   ├── security/            # Security docs
│   └── archive/             # Historical docs
└── README.md                # Main documentation
```

---

## Common Tasks

### Adding a New API Endpoint

1. Create function in `apps/api/functions/`
2. Add business logic to `apps/api/shared/services/`
3. Update API service in `apps/web/src/api/`
4. Add TypeScript types
5. Test endpoint
6. Update documentation

### Adding a New Page

1. Create component in `apps/web/src/pages/`
2. Add route in `App.tsx`
3. Add navigation link if needed
4. Add authentication if required
5. Test on all screen sizes
6. Update navigation documentation

### Updating Infrastructure

1. Modify `infra/main.bicep`
2. Update parameter files
3. Test deployment in dev environment
4. Update deployment documentation
5. Deploy to production

---

## Resources

### Documentation
- [Main README](README.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Dual Auth Setup](docs/guides/DUAL_AUTH_SETUP.md)
- [Documentation Index](docs/README.md)

### Azure Documentation
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Cosmos DB](https://docs.microsoft.com/azure/cosmos-db/)

### Tools & Libraries
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite Guide](https://vitejs.dev/guide/)

---

## Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: Search existing GitHub issues
- **Questions**: Create a new issue with the `question` label
- **Bugs**: Create a new issue with the `bug` label
- **Security**: Email security@somos.tech (do not create public issue)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Somos Tech!** 🎉
