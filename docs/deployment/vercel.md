# Vercel Deployment Guide

Deploy anon-spliit to Vercel with Vercel Postgres.

## Prerequisites

- [Vercel account](https://vercel.com)
- [GitHub account](https://github.com) (for repository import)

## Step 1: Fork or Import Repository

1. Fork the [anon-spliit repository](https://github.com/sora-grayscale/spliit)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New" → "Project"
4. Import your forked repository

## Step 2: Create Vercel Postgres Database

1. In your Vercel project, go to "Storage" tab
2. Click "Create Database" → "Postgres"
3. Choose a region close to your users
4. The database credentials will be automatically added as environment variables

## Step 3: Configure Environment Variables

In Vercel project settings → "Environment Variables", add:

### Required Variables

These are automatically set when you create Vercel Postgres:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PRISMA_URL` | Database URL for Prisma (with connection pooling) |
| `POSTGRES_URL_NON_POOLING` | Database URL without pooling (for migrations) |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_DELETE_INACTIVE_DAYS` | `90` | Days of inactivity before auto-deletion |
| `DELETE_GRACE_PERIOD_DAYS` | `7` | Grace period before permanent deletion |
| `CRON_SECRET` | - | Secret for cron job authentication |

### Private Instance Mode (Optional)

To enable authentication for group creation:

| Variable | Description |
|----------|-------------|
| `PRIVATE_INSTANCE` | Set to `true` to enable |
| `ADMIN_EMAIL` | Admin user email |
| `ADMIN_PASSWORD` | Admin user password |
| `NEXTAUTH_SECRET` | Secret for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your deployment URL (e.g., `https://your-app.vercel.app`) |

### Document Upload (Optional)

To enable expense document uploads:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS` | Set to `true` to enable |
| `S3_UPLOAD_KEY` | S3 access key |
| `S3_UPLOAD_SECRET` | S3 secret key |
| `S3_UPLOAD_BUCKET` | S3 bucket name |
| `S3_UPLOAD_REGION` | S3 region |
| `S3_UPLOAD_ENDPOINT` | S3 endpoint (for non-AWS providers) |

### AI Features (Optional)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT` | Enable receipt OCR |
| `NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT` | Enable category extraction |
| `OPENAI_API_KEY` | OpenAI API key (required if above features enabled) |

## Step 4: Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Prisma migrations run automatically during build

## Step 5: Verify Deployment

1. Visit your deployment URL
2. Create a test group
3. Verify encryption is working (check that data in database is encrypted)

## Custom Domain (Optional)

1. Go to project settings → "Domains"
2. Add your custom domain
3. Configure DNS as instructed
4. Update `NEXTAUTH_URL` if using Private Instance Mode

## Troubleshooting

### Database Connection Errors

- Ensure Vercel Postgres is properly linked to your project
- Check that `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` are set

### Migration Errors

Migrations run automatically. If issues occur:

```bash
# Run migrations manually via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy
```

### Private Instance Mode Not Working

- Verify all required variables are set (`PRIVATE_INSTANCE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`)
- Check `NEXTAUTH_URL` matches your deployment URL exactly
