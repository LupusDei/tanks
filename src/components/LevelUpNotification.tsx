import { useEffect, useState } from 'react';
import { AI_DIFFICULTY_CONFIGS } from '../engine/ai';
import type { AIDifficulty } from '../types/game';
import './LevelUpNotification.css';

interface LevelUpNotificationProps {
  /** Name of the tank that leveled up */
  tankName: string;
  /** New difficulty level reached */
  newLevel: AIDifficulty;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Duration in ms before auto-hiding (default: 3000) */
  duration?: number;
}

/**
 * Animated notification shown when a tank levels up in campaign mode.
 * Displays the tank name and their new rank with a promotion animation.
 */
export function LevelUpNotification({
  tankName,
  newLevel,
  onComplete,
  duration = 3000,
}: LevelUpNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  const levelConfig = AI_DIFFICULTY_CONFIGS[newLevel];

  useEffect(() => {
    // Start animation
    const animationTimer = setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    // Auto-hide after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`level-up-notification ${isAnimating ? 'level-up-notification--animating' : ''}`}
      data-testid="level-up-notification"
    >
      <div className="level-up-notification__icon">
        <span className="level-up-notification__star">★</span>
      </div>
      <div className="level-up-notification__content">
        <div className="level-up-notification__title">PROMOTED!</div>
        <div className="level-up-notification__details">
          <span className="level-up-notification__tank-name">{tankName}</span>
          <span className="level-up-notification__arrow">→</span>
          <span className="level-up-notification__rank">{levelConfig.name}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing level-up notifications in a queue.
 * Use this when multiple tanks might level up in quick succession.
 */
export function useLevelUpNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    tankName: string;
    newLevel: AIDifficulty;
  }>>([]);

  const addNotification = (tankName: string, newLevel: AIDifficulty) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications(prev => [...prev, { id, tankName, newLevel }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
