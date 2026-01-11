# anon-spliit - Development Guide

> Anonymous bill splitting with end-to-end encryption

## Project Overview

anon-spliit is a privacy-focused fork of Spliit. All user data is **end-to-end encrypted (E2EE)** - the server never sees unencrypted data. The encryption key is stored in the URL fragment and never sent to the server.

**Repository**: https://github.com/sora-grayscale/spliit

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React, TypeScript, TailwindCSS
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL
- **Encryption**: Web Crypto API (AES-128-GCM, HKDF SHA-256)
- **Deployment**: Vercel, Docker/Podman

### E2EE Design Philosophy
- **Zero-knowledge server**: The server never sees unencrypted data
- **URL fragment key storage**: Encryption key in `#<base64key>` format (never sent to server)
- **localStorage persistence**: Keys saved per-group for convenience
- **Everything encrypted**: Group names, participant names, expense titles, notes, amounts

### Key Files
```
src/lib/crypto.ts              # Core crypto utilities
src/lib/encrypt-helpers.ts     # Encryption/decryption helpers
src/components/encryption-provider.tsx  # React context for encryption
src/lib/hooks/use-group-url.ts # URL navigation with key preservation
```

## Development Rules

### 1. Version Control with jj (Jujutsu)
- Use `jj` instead of `git` for version control
- Leverage parallel development with multiple changes
- Common commands:
  ```bash
  jj status                    # Check status
  jj log                       # View history
  jj new                       # Create new change
  jj describe -m "message"     # Set commit message
  jj git push --change @       # Push current change
  ```

### 2. Branch/PR Strategy
- **1 feature = 1 branch = 1 PR**
- Keep PRs small and focused
- Use descriptive branch names: `feature/password-protection`, `feature/amount-encryption`
- Always base new features on `main`

### 3. Testing Requirements
- **All features must have tests**
- Run tests before pushing: `pnpm test`
- Test encryption thoroughly:
  - Encrypt/decrypt round-trip
  - Invalid key handling
  - Legacy (unencrypted) data compatibility
- Security tests for crypto operations

### 4. Code Quality
- **TypeScript strict mode**: No `any` types without justification
- Run type check: `npx tsc --noEmit`
- Keep code maintainable and readable
- Add comments for complex crypto operations
- Use meaningful variable names

### 5. Code Review & Refactoring
- Regular code reviews on PRs
- Refactor when code becomes complex
- Keep functions small and focused
- DRY principle but avoid premature abstraction

### 6. Documentation
- **Update CLAUDE.md** with every significant change
- Keep feature specifications current
- Document environment variables
- Add inline comments for complex logic

## Feature Roadmap

### Implemented: Basic E2EE (PR #1)
- [x] Group name encryption
- [x] Participant name encryption
- [x] Expense title/notes encryption
- [x] URL fragment key storage
- [x] localStorage key persistence
- [x] Error screen for missing encryption key

### Issue #2: Password Protection
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/2

- Password-based key derivation (PBKDF2)
- Password prompt on first access
- Store password hint (optional)
- Combine with URL key or replace it
- Rate limiting for brute force protection

### Issue #3: Amount Encryption (Complete E2EE)
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/3

- Encrypt amounts on client before sending
- Decrypt on client for display/calculation
- Server stores only encrypted values
- Balance calculation done client-side
- All financial data fully encrypted

### Issue #4: Private Instance Mode
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/4

- Admin user with authentication
- Whitelist-based access control
- Shared users can view but not create groups
- No auth required for shared group access
- Self-hosted friendly

### Issue #5: Docker/Podman Deployment
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/5

- Dockerfile for production build
- docker-compose.yml with PostgreSQL
- Environment variable configuration
- Health checks and logging
- Podman compatibility

### Issue #6: Group Deletion
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/6

- Delete button with confirmation
- Grace period before permanent deletion
- Auto-delete inactive groups (configurable)
- Soft delete with recovery option

### Issue #7: Rebrand to anon-spliit
**Status**: TODO
**Link**: https://github.com/sora-grayscale/spliit/issues/7

- Update app name and branding
- Update all links and references
- Add donation/sustainability links
- Update documentation
- Proper attribution to original project

## Security Considerations

### Encryption
- Use Web Crypto API (native browser implementation)
- AES-128-GCM for authenticated encryption
- HKDF SHA-256 for key derivation
- Unique IV for each encryption operation

### Key Management
- Never log encryption keys
- Clear keys from memory when not needed
- Validate key format before use
- Handle decryption failures gracefully

### Password Handling
- Use PBKDF2 with high iteration count (100,000+)
- Salt passwords before hashing
- Never store plaintext passwords
- Rate limit password attempts

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auto-deletion (Issue #6)
AUTO_DELETE_DAYS=90              # Days of inactivity before auto-deletion
DELETE_GRACE_PERIOD_DAYS=7       # Days before permanent deletion

# Private Instance (Issue #4)
PRIVATE_INSTANCE=false           # Enable private instance mode
ADMIN_EMAIL=admin@example.com    # Initial admin email
REQUIRE_AUTH=false               # Require authentication for all users
```

## Commands

```bash
# Development
pnpm dev                       # Start dev server
pnpm build                     # Production build
pnpm test                      # Run tests
npx tsc --noEmit              # Type check

# Database
pnpm db:migrate               # Run migrations
pnpm db:studio                # Open Prisma Studio

# jj workflow
jj new                        # Start new feature
jj describe -m "feat: ..."    # Describe change
jj git push --change @        # Push to remote

# Docker (Issue #5)
docker-compose up -d          # Start with Docker
docker-compose logs -f        # View logs
```

## File Structure

```
src/
├── app/                      # Next.js app router pages
│   └── groups/
│       ├── [groupId]/        # Group-specific pages
│       └── create/           # Group creation
├── components/
│   ├── encryption-provider.tsx
│   ├── encryption-required.tsx
│   └── ui/                   # Shadcn UI components
├── lib/
│   ├── crypto.ts             # Crypto utilities
│   ├── encrypt-helpers.ts    # Encryption helpers
│   └── hooks/                # Custom hooks
└── trpc/                     # tRPC routers

# Docker files (Issue #5)
Dockerfile
docker-compose.yml
.dockerignore
```

## Contributing

1. Check existing issues or create new one
2. Create new jj change: `jj new`
3. Implement with tests
4. Update CLAUDE.md if needed
5. Run `pnpm test && npx tsc --noEmit`
6. Push and create PR: `jj git push --change @`
7. Request review
8. Merge after approval

## License

This project is a fork of [Spliit](https://github.com/spliit-app/spliit) by Sebastien Castiel.
See LICENSE file for details.
