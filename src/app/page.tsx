import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { Github } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { HeroSection } from './hero-section'
import { HomePageButtons } from './home-page-buttons'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default function HomePage() {
  const t = useTranslations()
  const isPrivateInstance = env.PRIVATE_INSTANCE === true

  return (
    <main>
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container flex max-w-screen-md flex-col items-center gap-4 text-center">
          <HeroSection
            title={t.raw('Homepage.title')}
            description={t.raw('Homepage.description')}
          />
          {isPrivateInstance ? (
            <HomePageButtons />
          ) : (
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/groups">{t('Homepage.button.groups')}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="https://github.com/sora-grayscale/anon-spliit">
                  <Github className="w-4 h-4 mr-2" />
                  {t('Homepage.button.github')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
