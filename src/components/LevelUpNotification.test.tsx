import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LevelUpNotification, useLevelUpNotifications } from './LevelUpNotification';
import { renderHook } from '@testing-library/react';

describe('LevelUpNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the notification with tank name and level', () => {
    render(
      <LevelUpNotification tankName="Napoleon Bonaparte" newLevel="veteran" />
    );

    expect(screen.getByTestId('level-up-notification')).toBeInTheDocument();
    expect(screen.getByText('PROMOTED!')).toBeInTheDocument();
    expect(screen.getByText('Napoleon Bonaparte')).toBeInTheDocument();
    expect(screen.getByText('Veteran')).toBeInTheDocument();
  });

  it('should display correct rank name for each difficulty', () => {
    const { rerender } = render(
      <LevelUpNotification tankName="Test" newLevel="private" />
    );
    expect(screen.getByText('Private')).toBeInTheDocument();

    rerender(<LevelUpNotification tankName="Test" newLevel="centurion" />);
    expect(screen.getByText('Centurion')).toBeInTheDocument();

    rerender(<LevelUpNotification tankName="Test" newLevel="primus" />);
    expect(screen.getByText('Primus')).toBeInTheDocument();
  });

  it('should call onComplete after duration', () => {
    const onComplete = vi.fn();
    render(
      <LevelUpNotification
        tankName="Test"
        newLevel="veteran"
        onComplete={onComplete}
        duration={3000}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should hide after duration', () => {
    render(
      <LevelUpNotification tankName="Test" newLevel="veteran" duration={3000} />
    );

    expect(screen.getByTestId('level-up-notification')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByTestId('level-up-notification')).not.toBeInTheDocument();
  });

  it('should have animating class initially', () => {
    render(<LevelUpNotification tankName="Test" newLevel="veteran" />);

    const notification = screen.getByTestId('level-up-notification');
    expect(notification).toHaveClass('level-up-notification--animating');
  });

  it('should remove animating class after 500ms', () => {
    render(<LevelUpNotification tankName="Test" newLevel="veteran" />);

    const notification = screen.getByTestId('level-up-notification');
    expect(notification).toHaveClass('level-up-notification--animating');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(notification).not.toHaveClass('level-up-notification--animating');
  });
});

describe('useLevelUpNotifications', () => {
  it('should start with empty notifications', () => {
    const { result } = renderHook(() => useLevelUpNotifications());
    expect(result.current.notifications).toEqual([]);
  });

  it('should add notification', () => {
    const { result } = renderHook(() => useLevelUpNotifications());

    act(() => {
      result.current.addNotification('Test Tank', 'veteran');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.tankName).toBe('Test Tank');
    expect(result.current.notifications[0]?.newLevel).toBe('veteran');
  });

  it('should generate unique IDs for notifications', () => {
    const { result } = renderHook(() => useLevelUpNotifications());

    act(() => {
      result.current.addNotification('Tank 1', 'veteran');
      result.current.addNotification('Tank 2', 'centurion');
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0]?.id).not.toBe(
      result.current.notifications[1]?.id
    );
  });

  it('should remove notification by ID', () => {
    const { result } = renderHook(() => useLevelUpNotifications());

    act(() => {
      result.current.addNotification('Tank 1', 'veteran');
      result.current.addNotification('Tank 2', 'centurion');
    });

    const idToRemove = result.current.notifications[0]?.id;

    act(() => {
      result.current.removeNotification(idToRemove!);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.tankName).toBe('Tank 2');
  });

  it('should handle removing non-existent ID gracefully', () => {
    const { result } = renderHook(() => useLevelUpNotifications());

    act(() => {
      result.current.addNotification('Tank 1', 'veteran');
    });

    act(() => {
      result.current.removeNotification('non-existent-id');
    });

    expect(result.current.notifications).toHaveLength(1);
  });
});
