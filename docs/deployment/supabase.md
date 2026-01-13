# Supabase + Vercel Deployment Guide

Deploy anon-spliit to Vercel using Supabase as the PostgreSQL database provider.

This guide is ideal for **free tier** deployments since Vercel Postgres requires a Pro plan.

## Prerequisites

- [Vercel account](https://vercel.com) (free tier OK)
- [Supabase account](https://supabase.com) (free tier OK)
- [GitHub account](https://github.com)

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Select your organization (or create one)
4. Fill in project details:
   - **Name**: `anon-spliit` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it somewhere safe**
   - **Region**: Choose the closest to your users (e.g., Tokyo for Japan)
5. Click "Create new project"
6. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Get Database Connection Strings

1. In your Supabase project, click the **Connect** button (top right, green plug icon)
2. A modal will appear with connection options
3. You need two connection strings:

### For `POSTGRES_PRISMA_URL` (Transaction Pooler)

1. In the Connect modal, select **Transaction pooler** mode
2. Copy the URI (port 6543)
3. Replace `[YOUR-PASSWORD]` with your database password from Step 1
4. **Important:** Add `?pgbouncer=true` to the end of the URL

Example:
```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

> **Note:** The `?pgbouncer=true` parameter is required to prevent "prepared statement already exists" errors with Prisma.

### For `POSTGRES_URL_NON_POOLING` (Session Pooler)

1. In the Connect modal, select **Session pooler** mode
2. Copy the URI (port 5432)
3. Replace `[YOUR-PASSWORD]` with your database password from Step 1

Example:
```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**Important:**
- Always replace `[YOUR-PASSWORD]` with your actual database password
- The Transaction pooler (port 6543) is required for Prisma in serverless environments
- The Session pooler (port 5432) is needed for migrations (supports IPv4)

## Step 3: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import `sora-grayscale/anon-spliit` (or your fork)
4. **Before clicking Deploy**, configure environment variables

## Step 4: Configure Environment Variables in Vercel

In the "Environment Variables" section, add:

### Required Variables

| Variable | Value |
|----------|-------|
| `POSTGRES_PRISMA_URL` | Your Transaction pooler URI from Step 2 |
| `POSTGRES_URL_NON_POOLING` | Your Direct connection URI from Step 2 |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_DELETE_INACTIVE_DAYS` | `90` | Days before inactive groups are marked for deletion |
| `DELETE_GRACE_PERIOD_DAYS` | `7` | Grace period before permanent deletion |

See [Vercel deployment guide](./vercel.md#step-4-configure-optional-environment-variables) for more optional variables (Private Instance Mode, S3 uploads, AI features).

## Step 5: Deploy

1. Click "Deploy"
2. Wait for the build to complete (2-3 minutes)
3. Prisma migrations will run automatically during the build

## Step 6: Verify Deployment

1. Visit your deployment URL (shown after successful deploy)
2. Create a test group
3. Add participants and expenses
4. Verify everything works correctly

## Private Instance Mode (Optional)

To require authentication for group creation, add these environment variables in Vercel:

| Variable | Description |
|----------|-------------|
| `PRIVATE_INSTANCE` | Set to `true` to enable |
| `ADMIN_EMAIL` | Admin user email |
| `ADMIN_PASSWORD` | Admin user password |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your deployment URL (e.g., `https://your-app.vercel.app`) |

After adding these variables, **Redeploy** your application.

The admin user is **automatically created** when you first access the login page - no manual initialization required.

## Supabase Free Tier Limits

- **Database**: 500 MB
- **Bandwidth**: 5 GB / month
- **Storage**: 1 GB (for file uploads, if enabled)
- **Projects**: 2 active projects

These limits are sufficient for personal use and small teams.

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"

- Verify your connection strings are correct
- Ensure you replaced `[YOUR-PASSWORD]` with your actual password
- Check that you're using the correct ports (6543 for pooler, 5432 for direct)

### "Password authentication failed"

- Double-check your database password
- Ensure there are no extra spaces in the password
- Try resetting the password in Supabase: Settings → Database → Reset database password

### "prepared statement already exists" error

This error occurs when using Supabase's transaction pooler without the required parameter.

**Fix:** Add `?pgbouncer=true` to the end of your `POSTGRES_PRISMA_URL`:

```
postgresql://...@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Then redeploy your application.

### Migrations not running

If the automatic migration fails:

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations manually
npx prisma migrate deploy
```

### Supabase project paused

Free tier projects may be paused after 7 days of inactivity. To unpause:

1. Go to Supabase Dashboard
2. Select your project
3. Click "Restore project"

To prevent pausing, ensure the app has some activity at least weekly.

## Upgrading from Supabase Free Tier

If you outgrow the free tier:

1. **Supabase Pro** ($25/month): More storage, bandwidth, and no pausing
2. **Migrate to Vercel Postgres**: Requires Vercel Pro plan
3. **Self-host**: Use Docker/Podman with your own PostgreSQL

## Security Notes

- Never commit database credentials to your repository
- Use Vercel's environment variables to store secrets
- Supabase connection strings contain your password - keep them private
- Consider enabling Row Level Security (RLS) in Supabase for additional protection (not required for this app as all data is encrypted)
