/**
 * Hero.tsx
 * Hero section wrapping the 3D orbital scene behind the campaign content.
 * The 3D canvas sits at z-index 0, vignette at z-index 1, content at z-index 10.
 */
import { lazy, Suspense, useEffect, useState } from 'react'

const OrbitalScene = lazy(() => import('./OrbitalScene'))

interface HeroProps {
  progress?: number
}

// Static gradient fallback if WebGL isn't available
function StaticHeroBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #1E3A6E 0%, #0D1B3E 50%, #050A1A 100%)',
      }}
    />
  )
}

function WebGLCheck({ children }: { children: React.ReactNode }) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setHasWebGL(!!ctx)
    } catch {
      setHasWebGL(false)
    }
  }, [])

  if (hasWebGL === null) return null
  if (!hasWebGL) return <StaticHeroBackground />
  return <>{children}</>
}

export default function Hero({ progress = 0 }: HeroProps) {
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  return (
    <div className="hero-section">
      {/* 3D canvas layer */}
      <div className="hero-canvas">
        <WebGLCheck>
          <Suspense fallback={<StaticHeroBackground />}>
            <OrbitalScene progress={progress} reducedMotion={reducedMotion} />
          </Suspense>
        </WebGLCheck>
      </div>

      {/* Vignette overlay — keeps text legible */}
      <div className="hero-vignette" />
    </div>
  )
}
