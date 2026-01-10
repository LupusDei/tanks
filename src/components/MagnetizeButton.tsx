import { motion, useAnimation } from "framer-motion"
import { useEffect, useState, useCallback, useRef } from "react"

interface MagnetizeButtonProps {
  onClick?: () => void
  children: React.ReactNode
  particleCount?: number
  disabled?: boolean
  className?: string
  "data-testid"?: string
}

interface Particle {
  id: number
  // Orbital parameters
  orbitRadius: number // Base distance from center (80-150px)
  orbitSpeed: number // Angular velocity (0.3-0.8 rad/s)
  orbitPhase: number // Starting angle (0-2π)
  wobbleSpeed: number // Speed of radius wobble
  wobbleAmount: number // How much the radius varies (10-30px)
  wobblePhase: number // Phase offset for wobble
  // Visual properties for shiny effects
  size: number // 4-10px varying sizes
  hue: number // Color variation (120-180 range for green-cyan spectrum)
  shimmerDelay: number // Random delay for shimmer animation
  glowIntensity: number // 0.5-1.5 multiplier for glow strength
}

// Button dimensions for border calculations (half-sizes)
const BUTTON_HALF_WIDTH = 100 // ~200px wide button / 2
const BUTTON_HALF_HEIGHT = 28 // ~56px tall button / 2
const BORDER_OUTSET = 8 // How far outside the button edge particles should stop

// Calculate the point just OUTSIDE the button border for a given angle from center
function getBorderPoint(angle: number): { x: number; y: number } {
  // Normalize angle to 0-2π
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  // Calculate where a ray from center at this angle intersects the rectangle
  const cos = Math.cos(normalizedAngle)
  const sin = Math.sin(normalizedAngle)

  // Find intersection with rectangle edges
  // Try horizontal edges (top/bottom)
  const tHorizontal = Math.abs(sin) > 0.001
    ? (sin > 0 ? BUTTON_HALF_HEIGHT : -BUTTON_HALF_HEIGHT) / sin
    : Infinity
  // Try vertical edges (left/right)
  const tVertical = Math.abs(cos) > 0.001
    ? (cos > 0 ? BUTTON_HALF_WIDTH : -BUTTON_HALF_WIDTH) / cos
    : Infinity

  // Use the smaller positive t value
  const t = Math.min(Math.abs(tHorizontal), Math.abs(tVertical))

  // Calculate intersection point with OUTWARD offset (particles stay outside button)
  const outwardScale = (t + BORDER_OUTSET) / t
  return {
    x: cos * t * outwardScale,
    y: sin * t * outwardScale,
  }
}

export function MagnetizeButton({
  onClick,
  children,
  particleCount = 14,
  disabled = false,
  className = "",
  "data-testid": testId,
}: MagnetizeButtonProps) {
  const [isAttracting, setIsAttracting] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const particlesControl = useAnimation()
  const floatAnimationRef = useRef<number | null>(null)
  const isAttractingRef = useRef(false)
  const isMountedRef = useRef(true)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Keep ref in sync with state for use in animation loop
  useEffect(() => {
    isAttractingRef.current = isAttracting
  }, [isAttracting])

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      // Orbital parameters - distribute particles around the button
      orbitRadius: 80 + Math.random() * 70, // 80-150px from center
      orbitSpeed: 0.3 + Math.random() * 0.5, // 0.3-0.8 rad/s
      orbitPhase: (i / particleCount) * Math.PI * 2 + Math.random() * 0.5, // Evenly distributed + jitter
      wobbleSpeed: 0.5 + Math.random() * 0.8, // Wobble frequency
      wobbleAmount: 10 + Math.random() * 20, // 10-30px radius variation
      wobblePhase: Math.random() * Math.PI * 2,
      // Visual properties for shiny effects
      size: 4 + Math.random() * 6, // 4-10px varying sizes
      hue: 120 + Math.random() * 60, // 120-180 for green-cyan spectrum
      shimmerDelay: Math.random() * 2, // 0-2s staggered shimmer
      glowIntensity: 0.5 + Math.random() * 1.0, // 0.5-1.5 glow multiplier
    }))
    setParticles(newParticles)
  }, [particleCount])

  // Orbital animation loop
  useEffect(() => {
    if (particles.length === 0) return

    let startTime: number | null = null

    const animateOrbit = (timestamp: number) => {
      // Stop if component unmounted
      if (!isMountedRef.current) return

      if (startTime === null) startTime = timestamp
      const elapsed = (timestamp - startTime) / 1000 // Convert to seconds

      // Only animate if not attracting and still mounted
      if (!isAttractingRef.current && isMountedRef.current) {
        particles.forEach((particle, index) => {
          // Calculate current orbital angle
          const angle = elapsed * particle.orbitSpeed + particle.orbitPhase

          // Calculate wobbling radius for organic motion
          const wobble = Math.sin(elapsed * particle.wobbleSpeed + particle.wobblePhase) * particle.wobbleAmount
          const currentRadius = particle.orbitRadius + wobble

          // Convert polar to cartesian
          const x = Math.cos(angle) * currentRadius
          const y = Math.sin(angle) * currentRadius

          // Update particle position via animation controls
          particlesControl.start((i) => {
            if (i !== index) return {}
            return {
              x,
              y,
              transition: { duration: 0.1, ease: "linear" },
            }
          })
        })
      }

      if (isMountedRef.current) {
        floatAnimationRef.current = requestAnimationFrame(animateOrbit)
      }
    }

    floatAnimationRef.current = requestAnimationFrame(animateOrbit)

    return () => {
      if (floatAnimationRef.current !== null) {
        cancelAnimationFrame(floatAnimationRef.current)
      }
    }
  }, [particles, particlesControl])

  const handleInteractionStart = useCallback(async () => {
    if (disabled) return
    setIsAttracting(true)

    // Animate each particle to its border position based on current angle
    await particlesControl.start((i) => {
      const particle = particles[i]
      if (!particle) return {}

      // Get particle's current angle (approximate from orbital position)
      const currentAngle = particle.orbitPhase + (performance.now() / 1000) * particle.orbitSpeed
      const borderPoint = getBorderPoint(currentAngle)

      return {
        x: borderPoint.x,
        y: borderPoint.y,
        scale: 1.3,
        transition: {
          type: "spring",
          stiffness: 80,
          damping: 12,
        },
      }
    })
  }, [particlesControl, particles, disabled])

  const handleInteractionEnd = useCallback(async () => {
    if (disabled) return
    setIsAttracting(false)

    // Animate particles back to orbital positions
    await particlesControl.start((i) => {
      const particle = particles[i]
      if (!particle) return {}

      // Calculate current orbital position to return to
      const elapsed = performance.now() / 1000
      const angle = elapsed * particle.orbitSpeed + particle.orbitPhase
      const wobble = Math.sin(elapsed * particle.wobbleSpeed + particle.wobblePhase) * particle.wobbleAmount
      const currentRadius = particle.orbitRadius + wobble

      return {
        x: Math.cos(angle) * currentRadius,
        y: Math.sin(angle) * currentRadius,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 100,
          damping: 15,
        },
      }
    })
  }, [particlesControl, particles, disabled])

  return (
    <button
      ref={buttonRef}
      className={`magnetize-button ${isAttracting ? "magnetize-button--attracting" : ""} ${className}`}
      onClick={onClick}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      disabled={disabled}
      data-testid={testId}
    >
      {particles.map((particle, index) => {
        // Calculate initial orbital position
        const initialX = Math.cos(particle.orbitPhase) * particle.orbitRadius
        const initialY = Math.sin(particle.orbitPhase) * particle.orbitRadius

        return (
          <motion.div
            key={particle.id}
            custom={index}
            initial={{
              x: initialX,
              y: initialY,
              opacity: 1,
              scale: 1,
            }}
            animate={particlesControl}
            className={`magnetize-button__particle ${isAttracting ? "magnetize-button__particle--attracting" : ""}`}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              marginLeft: `${-particle.size / 2}px`,
              marginTop: `${-particle.size / 2}px`,
              background: `radial-gradient(circle at 30% 30%, hsl(${particle.hue}, 100%, 80%), hsl(${particle.hue}, 100%, 50%))`,
              boxShadow: `0 0 ${4 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 60%, 0.6), 0 0 ${8 * particle.glowIntensity}px hsla(${particle.hue}, 100%, 50%, 0.4), inset 0 0 ${2}px rgba(255, 255, 255, 0.3)`,
              animationDelay: `${particle.shimmerDelay}s`,
            }}
          />
        )
      })}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
