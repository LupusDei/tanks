import { useState, useCallback, useEffect } from "react"
import { ParticleTextEffect } from "./ui/ParticleTextEffect"
import { MagnetizeButton } from "./MagnetizeButton"
import { hasActiveCampaign } from "../services/userDatabase"
import type { CampaignLength } from "../types/game"
import { CAMPAIGN_LENGTH_OPTIONS } from "../types/game"

type ScreenState = 'initial' | 'mode-select' | 'campaign-options' | 'campaign-length'

export interface LoadingScreenProps {
  onFreePlay?: () => void
  onNewCampaign?: (length: CampaignLength) => void
  onResumeCampaign?: () => void
  /** @deprecated Use onFreePlay instead */
  onStart?: () => void
}

export function LoadingScreen({
  onFreePlay,
  onNewCampaign,
  onResumeCampaign,
  onStart,
}: LoadingScreenProps) {
  const [screenState, setScreenState] = useState<ScreenState>('initial')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasCampaign, setHasCampaign] = useState(false)

  // Check for existing campaign on mount
  useEffect(() => {
    setHasCampaign(hasActiveCampaign())
  }, [])

  const handleTransitionEnd = useCallback(() => {
    // Only trigger callbacks when we're fading out (not between internal transitions)
    if (isTransitioning) {
      // The actual callback will be triggered by the specific button handler
    }
  }, [isTransitioning])

  const handleStartClick = () => {
    setScreenState('mode-select')
  }

  const handleFreePlayClick = () => {
    setIsTransitioning(true)
    // Use onFreePlay if provided, otherwise fall back to deprecated onStart
    setTimeout(() => {
      if (onFreePlay) {
        onFreePlay()
      } else if (onStart) {
        onStart()
      }
    }, 800) // Match transition duration
  }

  const handleCampaignClick = () => {
    if (hasCampaign) {
      setScreenState('campaign-options')
    } else {
      setScreenState('campaign-length')
    }
  }

  const handleResumeCampaignClick = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      onResumeCampaign?.()
    }, 800)
  }

  const handleNewCampaignClick = () => {
    setScreenState('campaign-length')
  }

  const handleCampaignLengthSelect = (length: CampaignLength) => {
    setIsTransitioning(true)
    setTimeout(() => {
      onNewCampaign?.(length)
    }, 800)
  }

  const handleBackClick = () => {
    if (screenState === 'campaign-length' && hasCampaign) {
      setScreenState('campaign-options')
    } else if (screenState === 'campaign-length' || screenState === 'campaign-options') {
      setScreenState('mode-select')
    } else {
      setScreenState('initial')
    }
  }

  const renderButtons = () => {
    switch (screenState) {
      case 'initial':
        return (
          <MagnetizeButton onClick={handleStartClick} data-testid="start-button">
            Start Game
          </MagnetizeButton>
        )

      case 'mode-select':
        return (
          <div className="loading-screen__button-group" data-testid="mode-select">
            <MagnetizeButton
              onClick={handleFreePlayClick}
              data-testid="free-play-button"
              variant="secondary"
            >
              Free Play
            </MagnetizeButton>
            <MagnetizeButton
              onClick={handleCampaignClick}
              data-testid="campaign-button"
              variant="primary"
            >
              Campaign
            </MagnetizeButton>
          </div>
        )

      case 'campaign-options':
        return (
          <div className="loading-screen__button-group" data-testid="campaign-options">
            <MagnetizeButton
              onClick={handleResumeCampaignClick}
              data-testid="resume-campaign-button"
              variant="primary"
            >
              Resume Campaign
            </MagnetizeButton>
            <MagnetizeButton
              onClick={handleNewCampaignClick}
              data-testid="new-campaign-button"
              variant="secondary"
            >
              New Campaign
            </MagnetizeButton>
            <button
              className="loading-screen__back-button"
              onClick={handleBackClick}
              data-testid="back-button"
            >
              ← Back
            </button>
          </div>
        )

      case 'campaign-length':
        return (
          <div className="loading-screen__button-group loading-screen__button-group--vertical" data-testid="campaign-length">
            <div className="loading-screen__section-title">Select Campaign Length</div>
            <div className="loading-screen__length-grid">
              {CAMPAIGN_LENGTH_OPTIONS.map((length) => (
                <MagnetizeButton
                  key={length}
                  onClick={() => handleCampaignLengthSelect(length)}
                  data-testid={`campaign-length-${length}`}
                  variant="secondary"
                >
                  {length} Games
                </MagnetizeButton>
              ))}
            </div>
            <button
              className="loading-screen__back-button"
              onClick={handleBackClick}
              data-testid="back-button"
            >
              ← Back
            </button>
          </div>
        )
    }
  }

  return (
    <div
      className={`loading-screen ${isTransitioning ? "loading-screen--fade-out" : ""}`}
      onTransitionEnd={handleTransitionEnd}
      data-testid="loading-screen"
    >
      <ParticleTextEffect
        words={["Scorched Dearth", "Power Overwhelming"]}
        wordDuration={5000}
        backgroundColor="#1a1a1a"
        className="loading-screen__particles"
      />
      <div className="loading-screen__overlay">
        {renderButtons()}
      </div>
    </div>
  )
}
