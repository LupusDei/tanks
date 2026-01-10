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
  x: number
  y: number
  // Floating animation parameters (unique per particle)
  floatSpeed: number
  floatRadius: number
  floatPhase: number
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
      x: Math.random() * 300 - 150,
      y: Math.random() * 300 - 150,
      // Each particle gets unique floating parameters
      floatSpeed: 0.5 + Math.random() * 1.0, // 0.5-1.5 speed multiplier
      floatRadius: 8 + Math.random() * 12, // 8-20px float radius
      floatPhase: Math.random() * Math.PI * 2, // Random starting phase
    }))
    setParticles(newParticles)
  }, [particleCount])

  // Floating animation loop
  useEffect(() => {
    if (particles.length === 0) return

    let startTime: number | null = null

    const animateFloat = (timestamp: number) => {
      // Stop if component unmounted
      if (!isMountedRef.current) return

      if (startTime === null) startTime = timestamp
      const elapsed = (timestamp - startTime) / 1000 // Convert to seconds

      // Only animate if not attracting and still mounted
      if (!isAttractingRef.current && isMountedRef.current) {
        particles.forEach((particle, index) => {
          const time = elapsed * particle.floatSpeed + particle.floatPhase

          // Organic floating using sine/cosine with different frequencies
          const floatX = Math.sin(time * 0.8) * particle.floatRadius * 0.7
          const floatY = Math.cos(time * 0.6) * particle.floatRadius

          // Update particle position via animation controls
          particlesControl.start((i) => {
            if (i !== index) return {}
            return {
              x: particle.x + floatX,
              y: particle.y + floatY,
              transition: { duration: 0.1, ease: "linear" },
            }
          })
        })
      }

      if (isMountedRef.current) {
        floatAnimationRef.current = requestAnimationFrame(animateFloat)
      }
    }

    floatAnimationRef.current = requestAnimationFrame(animateFloat)

    return () => {
      if (floatAnimationRef.current !== null) {
        cancelAnimationFrame(floatAnimationRef.current)
      }
    }
  }, [particles, particlesControl])

  const handleInteractionStart = useCallback(async () => {
    if (disabled) return
    setIsAttracting(true)
    await particlesControl.start({
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1.2,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 10,
      },
    })
  }, [particlesControl, disabled])

  const handleInteractionEnd = useCallback(async () => {
    if (disabled) return
    setIsAttracting(false)
    await particlesControl.start((i) => ({
      x: particles[i]?.x ?? 0,
      y: particles[i]?.y ?? 0,
      opacity: 0.4,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    }))
  }, [particlesControl, particles, disabled])

  return (
    <button
      className={`magnetize-button ${isAttracting ? "magnetize-button--attracting" : ""} ${className}`}
      onClick={onClick}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      disabled={disabled}
      data-testid={testId}
    >
      {particles.map((particle, index) => (
        <motion.div
          key={particle.id}
          custom={index}
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: 0.4,
            scale: 1,
          }}
          animate={particlesControl}
          className={`magnetize-button__particle ${isAttracting ? "magnetize-button__particle--attracting" : ""}`}
        />
      ))}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
