import { useState, useCallback } from "react"
import { ParticleTextEffect } from "./ui/ParticleTextEffect"
import { MagnetizeButton } from "./MagnetizeButton"

interface LoadingScreenProps {
  onStart?: () => void
}

export function LoadingScreen({ onStart }: LoadingScreenProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleTransitionEnd = useCallback(() => {
    if (isTransitioning && onStart) {
      onStart()
    }
  }, [isTransitioning, onStart])

  const handleStartClick = () => {
    setIsTransitioning(true)
  }

  return (
    <div
      className={`loading-screen ${isTransitioning ? "loading-screen--fade-out" : ""}`}
      onTransitionEnd={handleTransitionEnd}
      data-testid="loading-screen"
    >
      <ParticleTextEffect
        words={["The new", "Tank Game", "Scorched Earthly AI"]}
        wordDuration={5000}
        backgroundColor="#1a1a1a"
        className="loading-screen__particles"
      />
      <div className="loading-screen__overlay">
        <MagnetizeButton
          onClick={handleStartClick}
          data-testid="start-button"
        >
          Start Game
        </MagnetizeButton>
      </div>
    </div>
  )
}
