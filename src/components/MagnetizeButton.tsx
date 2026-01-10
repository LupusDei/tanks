import { motion, useAnimation } from "framer-motion"
import { useEffect, useState, useCallback } from "react"

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

  useEffect(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 300 - 150,
      y: Math.random() * 300 - 150,
    }))
    setParticles(newParticles)
  }, [particleCount])

  const handleInteractionStart = useCallback(async () => {
    if (disabled) return
    setIsAttracting(true)
    await particlesControl.start({
      x: 0,
      y: 0,
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
          initial={{ x: particle.x, y: particle.y }}
          animate={particlesControl}
          className={`magnetize-button__particle ${isAttracting ? "magnetize-button__particle--attracting" : ""}`}
        />
      ))}
      <span className="magnetize-button__content">{children}</span>
    </button>
  )
}
