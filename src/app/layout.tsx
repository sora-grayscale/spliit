import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { AuthProvider } from '@/components/auth-provider'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { PasswordChangeGuard } from '@/components/password-change-guard'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { UserMenu } from '@/components/user-menu'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'anon-spliit · Anonymous Bill Splitting with E2EE',
    template: '%s · anon-spliit',
  },
  description:
    'anon-spliit is a privacy-focused bill splitting app with end-to-end encryption. Your data stays private - the server never sees unencrypted information.',
  openGraph: {
    title: 'anon-spliit · Anonymous Bill Splitting with E2EE',
    description:
      'Privacy-focused bill splitting with end-to-end encryption. No ads, no accounts, no data exposure.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@sora_grayscale',
    site: '@sora_grayscale',
    images: `/banner.png`,
    title: 'anon-spliit · Anonymous Bill Splitting with E2EE',
    description:
      'Privacy-focused bill splitting with end-to-end encryption. No ads, no accounts, no data exposure.',
  },
  appleWebApp: {
    capable: true,
    title: 'anon-spliit',
  },
  applicationName: 'anon-spliit',
  icons: [
    {
      url: '/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      url: '/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}

export const viewport: Viewport = {
  themeColor: '#047857',
}

function Content({
  children,
  isPrivateInstance,
}: {
  children: React.ReactNode
  isPrivateInstance: boolean
}) {
  const t = useTranslations()
  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 h-16 flex justify-between bg-white dark:bg-gray-950 bg-opacity-50 dark:bg-opacity-50 p-2 border-b backdrop-blur-sm z-50">
        <Link
          className="flex items-center gap-2 hover:scale-105 transition-transform"
          href="/"
        >
          <h1 className="flex items-center gap-1">
            <Image
              src="/anon-spliit-small.png"
              className="h-10 w-auto"
              width={73}
              height={40}
              alt="anon-spliit icon"
              unoptimized
            />
            <span className="font-bold tracking-tight text-lg text-primary">
              anon spliit
            </span>
          </h1>
        </Link>
        <div role="navigation" aria-label="Menu" className="flex">
          <ul className="flex items-center text-sm">
            <li>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="-my-3 text-primary"
              >
                <Link href="/groups">{t('Header.groups')}</Link>
              </Button>
            </li>
            <li>
              <LocaleSwitcher />
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li>
              <UserMenu enabled={isPrivateInstance} />
            </li>
          </ul>
        </div>
      </header>

      <div className="pt-16 flex-1 flex flex-col">{children}</div>

      <footer className="sm:p-8 md:p-16 sm:mt-16 sm:text-sm md:text-base md:mt-32 bg-slate-50 dark:bg-card border-t p-6 mt-8 flex flex-col sm:flex-row sm:justify-between gap-4 text-xs [&_a]:underline">
        <div className="flex flex-col space-y-2">
          <div className="sm:text-lg font-semibold text-base flex space-x-2 items-center">
            <Link className="flex items-center gap-1" href="/">
              <Image
                src="/anon-spliit-small.png"
                className="h-8 w-auto"
                width={58}
                height={32}
                alt="anon-spliit icon"
                unoptimized
              />
              <span className="font-bold tracking-tight text-primary">
                anon spliit
              </span>
            </Link>
          </div>
          <div className="flex flex-col space-y-1">
            <span>{t('Footer.tagline')}</span>
            <span>
              {t.rich('Footer.forkedFrom', {
                original: (txt) => (
                  <a href="https://spliit.app" target="_blank" rel="noopener">
                    {txt}
                  </a>
                ),
              })}
            </span>
            <span>
              {t.rich('Footer.maintainedBy', {
                maintainer: (txt) => (
                  <a
                    href="https://github.com/sora-grayscale"
                    target="_blank"
                    rel="noopener"
                  >
                    {txt}
                  </a>
                ),
              })}
            </span>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <span className="font-semibold">{t('Footer.support')}</span>
          <a
            href="https://github.com/sponsors/sora-grayscale"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1"
          >
            {t('Footer.sponsor')}
          </a>
          <a
            href="https://github.com/sora-grayscale/anon-spliit"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
        </div>
      </footer>
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const isPrivateInstance = env.PRIVATE_INSTANCE === true

  return (
    <html lang={locale} suppressHydrationWarning>
      <ApplePwaSplash icon="/anon-spliit.png" color="#027756" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-slate-50 bg-opacity-30 dark:bg-background">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider enabled={isPrivateInstance}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Suspense>
                <ProgressBar />
              </Suspense>
              <PasswordChangeGuard enabled={isPrivateInstance}>
                <Content isPrivateInstance={isPrivateInstance}>
                  {children}
                </Content>
              </PasswordChangeGuard>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
