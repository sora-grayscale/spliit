# anon-spliit Documentation

Welcome to the anon-spliit documentation.

## Deployment

- [Vercel + Supabase](./deployment/supabase.md) - Deploy to Vercel with Supabase (free tier)
- [Vercel + Vercel Postgres](./deployment/vercel.md) - Deploy to Vercel with Vercel Postgres (Pro plan required)
- [Local Development](./deployment/local.md) - Set up local development environment

## Features

### End-to-End Encryption (E2EE)

All user data is encrypted client-side before being sent to the server:

- Group names
- Participant names
- Expense titles and notes
- Amounts and currency codes

The encryption key is stored in the URL fragment (`#<key>`) and never sent to the server.

### Password Protection

Groups can optionally be protected with a password:

- PBKDF2 key derivation (100,000 iterations)
- Rate limiting for brute force protection
- Optional password hints

### Private Instance Mode

For self-hosted deployments requiring authentication:

- Admin user authentication
- Protected routes for group creation
- NextAuth.js integration

## Environment Variables

See [Local Development](./deployment/local.md#environment-variables) for a complete list of environment variables.
