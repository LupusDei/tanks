import { useEffect, useState, useCallback } from "react"
import { ParticleTextEffect } from "./ui/ParticleTextEffect"

interface LoadingScreenProps {
  duration?: number
  onComplete?: () => void
}

export function LoadingScreen({ duration = 6000, onComplete }: LoadingScreenProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleTransitionEnd = useCallback(() => {
    if (isTransitioning && onComplete) {
      onComplete()
    }
  }, [isTransitioning, onComplete])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(true)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      className={`loading-screen ${isTransitioning ? "loading-screen--fade-out" : ""}`}
      onTransitionEnd={handleTransitionEnd}
      data-testid="loading-screen"
    >
      <ParticleTextEffect
        words={["Scorched", "eAIrth"]}
        wordDuration={2500}
        backgroundColor="#1a1a1a"
        className="loading-screen__particles"
      />
      <div className="loading-screen__subtitle">
        <span className="loading-screen__subtitle-text">Loading...</span>
      </div>
    </div>
  )
}
