import { ZodIssueCode, z } from 'zod'

const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  return ['true', 'yes', '1', 'on'].includes(val.toLowerCase())
}

const envSchema = z
  .object({
    POSTGRES_URL_NON_POOLING: z.string().url(),
    POSTGRES_PRISMA_URL: z.string().url(),
    // Auto-delete settings (Issue #10)
    AUTO_DELETE_INACTIVE_DAYS: z.coerce.number().int().min(0).default(90),
    DELETE_GRACE_PERIOD_DAYS: z.coerce.number().int().min(1).default(7),
    CRON_SECRET: z.string().optional(),
    // Private Instance Mode (Issue #4)
    PRIVATE_INSTANCE: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_BASE_URL: z
      .string()
      .optional()
      .default(
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000',
      ),
    NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_DEFAULT_CURRENCY_CODE: z.string().optional(),
    S3_UPLOAD_KEY: z.string().optional(),
    S3_UPLOAD_SECRET: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().optional(),
    S3_UPLOAD_REGION: z.string().optional(),
    S3_UPLOAD_ENDPOINT: z.string().optional(),
    NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    OPENAI_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (
      env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS &&
      // S3_UPLOAD_ENDPOINT is fully optional as it will only be used for providers other than AWS
      (!env.S3_UPLOAD_BUCKET ||
        !env.S3_UPLOAD_KEY ||
        !env.S3_UPLOAD_REGION ||
        !env.S3_UPLOAD_SECRET)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS is specified, then S3_* must be specified too',
      })
    }
    if (
      (env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT ||
        env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT) &&
      !env.OPENAI_API_KEY
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT or NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT is specified, then OPENAI_API_KEY must be specified too',
      })
    }
    // NEXTAUTH_SECRET is required for Private Instance Mode
    if (env.PRIVATE_INSTANCE && !env.NEXTAUTH_SECRET) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'NEXTAUTH_SECRET must be set when PRIVATE_INSTANCE is enabled for secure JWT signing',
      })
    }
    // ADMIN_EMAIL and ADMIN_PASSWORD are required for Private Instance Mode
    if (env.PRIVATE_INSTANCE && (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'ADMIN_EMAIL and ADMIN_PASSWORD must be set when PRIVATE_INSTANCE is enabled',
      })
    }
  })

export const env = envSchema.parse(process.env)
