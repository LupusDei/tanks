import { useAudio } from '../context/AudioContext'

interface AudioControlsProps {
  /** Position the controls in the corner of the screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function AudioControls({ position = 'top-right' }: AudioControlsProps) {
  const { isMusicMuted, isSfxMuted, toggleMusicMute, toggleSfxMute } = useAudio()

  return (
    <div className={`audio-controls audio-controls--${position}`}>
      <button
        className={`audio-controls__button ${isMusicMuted ? 'audio-controls__button--muted' : ''}`}
        onClick={toggleMusicMute}
        title={isMusicMuted ? 'Unmute music' : 'Mute music'}
        aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
      >
        {isMusicMuted ? (
          // Music off icon (note with X)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
            <line x1="1" y1="1" x2="23" y2="23" stroke="#ff4444" strokeWidth="2.5" />
          </svg>
        ) : (
          // Music on icon (note)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
      </button>
      <button
        className={`audio-controls__button ${isSfxMuted ? 'audio-controls__button--muted' : ''}`}
        onClick={toggleSfxMute}
        title={isSfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
        aria-label={isSfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
      >
        {isSfxMuted ? (
          // Speaker off icon
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" stroke="#ff4444" strokeWidth="2.5" />
            <line x1="17" y1="9" x2="23" y2="15" stroke="#ff4444" strokeWidth="2.5" />
          </svg>
        ) : (
          // Speaker on icon with sound waves
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </div>
  )
}
