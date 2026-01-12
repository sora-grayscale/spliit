'use client'

import { useEffect, useState } from 'react'

interface HeroSectionProps {
  title: string
  description: string
}

export function HeroSection({ title, description }: HeroSectionProps) {
  const [blur, setBlur] = useState(20)
  const [opacity, setOpacity] = useState(0)

  // Parse HTML tags from the translation strings
  const parseRichText = (text: string) => {
    return text.replace(/<[^>]*>/g, '')
  }

  const plainTitle = parseRichText(title)
  const plainDescription = parseRichText(description)

  useEffect(() => {
    // Small delay before starting
    const startTimeout = setTimeout(() => {
      setOpacity(1)

      const duration = 2000
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3)

        // Blur goes from 20 to 0
        const newBlur = 20 * (1 - eased)
        setBlur(newBlur)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setBlur(0)
        }
      }

      requestAnimationFrame(animate)
    }, 200)

    return () => clearTimeout(startTimeout)
  }, [])

  const blurStyle = {
    filter: `blur(${blur}px)`,
    opacity,
    transition: 'opacity 0.3s ease-out',
  }

  return (
    <div style={blurStyle} className="flex flex-col items-center gap-4">
      {/* anon spliit brand name */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-primary">
        anon spliit
      </h1>

      {/* Main title */}
      <h2 className="!leading-none font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl landing-header py-2">
        {plainTitle}
      </h2>

      {/* Description */}
      <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
        {plainDescription}
      </p>
    </div>
  )
}
